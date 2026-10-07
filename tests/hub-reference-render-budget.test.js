import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addReferenceGateDistricts} from '../src/world/hub/reference-gate-districts.js';
import {addReferenceLandscape} from '../src/world/hub/reference-landscape-scene.js';
import {HUB_PLATFORM,HUB_SCALE} from '../src/world/hub/platform-layout.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave} from '../src/world/rules.js';
import {worldVisualCapabilities} from '../src/world/device-capabilities.js';
import {CIVIC_BASIN_PROFILE} from '../src/world/hub/civic-basins.js';

const cameraAt=(position,target)=>{
 const camera=new THREE.PerspectiveCamera(60,390/844,.3,1800);camera.position.set(...position);camera.lookAt(...target);camera.updateMatrixWorld();return camera;
};
const triangles=mesh=>(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*mesh.count;

test('Hub respects phone reflection capabilities even in detail mode and restores desktop reflections',()=>{
 const platform=createHubPlatform(blankSave());
 try{
  const sea=platform.root.children.find(m=>m.geometry?.parameters?.width===3200),basin=platform.root.getObjectByName('Eau du bassin civique');
  assert.ok(sea?.material.uniforms.sceneReflection);assert.ok(basin);
  const phones=[{width:390,height:844,deviceMemory:8,coarsePointer:true},{width:844,height:390,deviceMemory:8,coarsePointer:true}];
  for(const phone of phones){platform.setQuality('detail',worldVisualCapabilities({mode:'detail',...phone}));assert.equal(sea.material.uniforms.sceneReflection.value,0);}
  platform.setQuality('detail',worldVisualCapabilities({mode:'detail',width:1280,height:720,deviceMemory:8,coarsePointer:false}));
  assert.ok(sea.material.uniforms.sceneReflection.value>0);
  platform.setQuality('fluid');assert.equal(sea.material.uniforms.sceneReflection.value,0);
  assert.equal(basin.material.uniforms.sceneReflection.value,0);
  assert.equal(basin.material.uniforms.waveAmp.value,CIVIC_BASIN_PROFILE.waveAmp,'quality switches retain calm authored basin water');
 }finally{platform.dispose();}
});

test('gate doorway carving remains complete nearby and leaves the distant mobile draw budget',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const districts=addReferenceGateDistricts({root,owned}),arcades=districts.group.getObjectByName('Arcades des huit héritages');
  const authored=arcades.geometry,all=arcades.count;assert.equal(all,96);
  const home=districts.layout[0].buildings[0],camera=cameraAt([home.x,home.baseY+5,home.z+12],[home.x,home.baseY+2,home.z]);
  root.updateMatrixWorld(true);districts.setQuality('fluid');districts.updateView(camera);
  assert.ok(arcades.count>0);assert.equal(arcades.geometry,authored,'close-up carved geometry stays unchanged');
  assert.ok(arcades.geometry.attributes.position.count>100,'close-up arch keeps its actual crafted shape');
  camera.position.set(3000,80,3000);camera.updateMatrixWorld();districts.updateView(camera);
  assert.equal(arcades.count,0,'all 96 invisible door frames are removed from this distant draw');
  camera.position.set(home.x,home.baseY+5,home.z+12);camera.updateMatrixWorld();districts.updateView(camera);assert.ok(arcades.count>0);
  assert.equal(districts.worldMapSites.length,districts.mapSites.length,'render LOD never removes map or collision entries');
 }finally{owned.forEach(asset=>asset.dispose());}
});

test('forest batches cull offscreen massifs while sharing geometry and preserving quality counts',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const landscape=addReferenceLandscape({root,owned,layoutRadius:HUB_PLATFORM.radius/HUB_SCALE,scale:HUB_SCALE,includeDocks:false});
  root.scale.set(HUB_SCALE,1.5,HUB_SCALE);root.updateMatrixWorld(true);
  const crowns=[],trunks=[];root.traverse(mesh=>{if(mesh.name.startsWith('Pinèdes des montagnes · '))crowns.push(mesh);if(mesh.name.startsWith('Troncs sur les vraies pentes · '))trunks.push(mesh);});
  assert.ok(crowns.length>2&&crowns.length<=landscape.terrainSites.length);assert.equal(crowns.length,trunks.length);
  for(const meshes of [crowns,trunks]){assert.equal(new Set(meshes.map(mesh=>mesh.geometry)).size,1);assert.equal(new Set(meshes.map(mesh=>mesh.material)).size,1);}
  const authoredMatrices=crowns.map(mesh=>new Float32Array(mesh.instanceMatrix.array)),authoredColors=crowns.map(mesh=>new Float32Array(mesh.instanceColor.array));
  landscape.setQuality('fluid');assert.equal(crowns.reduce((count,mesh)=>count+mesh.count,0),Math.ceil(landscape.diagnostics.pines*.60));
  assert.deepEqual(trunks.map(mesh=>mesh.count),crowns.map(mesh=>mesh.count));
  assert.ok([...crowns,...trunks].every(mesh=>!mesh.castShadow));
  const camera=cameraAt([0,12,370],[0,-15,500]),frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const forest=[...crowns,...trunks],allTriangles=forest.reduce((count,mesh)=>count+triangles(mesh),0);
  const visibleTriangles=forest.filter(mesh=>frustum.intersectsObject(mesh)).reduce((count,mesh)=>count+triangles(mesh),0);
  const oldGlobalBound=new THREE.Sphere();for(const mesh of crowns)oldGlobalBound.union(mesh.boundingSphere.clone().applyMatrix4(mesh.matrixWorld));
  assert.ok(frustum.intersectsSphere(oldGlobalBound),'the former global forest bound would submit the whole forest');
  assert.ok(visibleTriangles<allTriangles*.5,`port view submits ${visibleTriangles}/${allTriangles} forest triangles`);
  landscape.setQuality('detail');assert.equal(crowns.reduce((count,mesh)=>count+mesh.count,0),landscape.diagnostics.pines);
  assert.ok([...crowns,...trunks].every(mesh=>mesh.castShadow));
  for(let i=0;i<crowns.length;i++){assert.deepEqual(crowns[i].instanceMatrix.array,authoredMatrices[i]);assert.deepEqual(crowns[i].instanceColor.array,authoredColors[i]);}
  assert.equal(new Set(owned).size,owned.length,'shared resources have one destruction owner');
  landscape.disposeReflection();
 }finally{owned.forEach(asset=>asset.dispose());}
});

test('terrain LOD holds its level across small movements near the distance threshold',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const landscape=addReferenceLandscape({root,owned,includeDocks:false});root.scale.set(HUB_SCALE,1.5,HUB_SCALE);root.updateMatrixWorld(true);
  const lod=landscape.group.children.find(object=>object.isLOD),centre=lod.getWorldPosition(new THREE.Vector3()),camera=new THREE.PerspectiveCamera();
  const at=distance=>{camera.position.copy(centre).add(new THREE.Vector3(0,0,distance));camera.updateMatrixWorld();lod.update(camera);return lod.getCurrentLevel();};
  assert.equal(at(640),0);assert.equal(at(660),1);assert.equal(at(630),1);assert.equal(at(601),1);assert.equal(at(590),0);assert.equal(at(625),0);
  landscape.disposeReflection();
 }finally{owned.forEach(asset=>asset.dispose());}
});
