import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createAmbientCrowd} from '../src/world/ambient-crowd.js';
import {bakeCrowdHuman,crowdHumanMaterial,crowdMeshLodIndices} from '../src/world/crowd-human-model.js';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadShippedCrowdFixture} from './crowd-glb-fixture.js';
const items=[{type:'hubBuilding'}],options={mode:'detail',viewport:1280,deviceMemory:8,groundY:()=>7},assetPromise=loadShippedCrowdFixture();

test('crowd uses the shipped human shape with grounded feet and four draws maximum',async()=>{
 const asset=await assetPromise,root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,modelAsset:asset});await crowd.ready;
 try{
  assert.equal(crowd.diagnostics.ready,true);assert.equal(crowd.diagnostics.error,null);assert.ok(crowd.diagnostics.visible>0);
  assert.ok(crowd.diagnostics.drawCalls<=4);assert.equal(crowd.diagnostics.models[0].source,'shipped-traveller-glb');assert.ok(crowd.diagnostics.models[0].nearTriangles<10000);
  const matrix=new THREE.Matrix4();for(const mesh of root.children[0].children){assert.equal(mesh.isInstancedMesh,true);assert.ok(mesh.geometry.attributes.crowdVertexId.count>1500);assert.ok(mesh.geometry.attributes.crowdTintClass.array.includes(1));assert.ok(mesh.geometry.attributes.crowdTintClass.array.includes(2));for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const bound=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(bound.min.y>=7&&bound.min.y<7.01);assert.ok(bound.max.y>9.8);}}
 }finally{crowd.dispose();}
 assert.equal(root.children.length,0);
});

test('baked walk has real arm motion, finite normals and bounded half-float textures',async()=>{
 const baked=await bakeCrowdHuman(await assetPromise);
 try{
  assert.equal(baked.bakedPositions.type,THREE.HalfFloatType);assert.equal(baked.bakedNormals.type,THREE.HalfFloatType);assert.equal(baked.frames,16);assert.ok(baked.diagnostics.animationBytes<4*1024*1024);
  const values=baked.bakedPositions.image.data,stride=baked.rows*baked.width*4;let changed=0;
  for(let i=0;i<baked.diagnostics.vertices;i++){const offset=i*4,dx=Math.abs(THREE.DataUtils.fromHalfFloat(values[offset])-THREE.DataUtils.fromHalfFloat(values[stride*4+offset])),dy=Math.abs(THREE.DataUtils.fromHalfFloat(values[offset+1])-THREE.DataUtils.fromHalfFloat(values[stride*4+offset+1]));if(dx+dy>.015)changed++;}
  assert.ok(changed>baked.diagnostics.vertices*.1,'authored skeleton motion reached the shared atlas');
  assert.ok(baked.low.index.count<baked.geometry.index.count*.75);assert.ok(baked.bakedNormals.image.data.every(value=>Number.isFinite(THREE.DataUtils.fromHalfFloat(value))));
 }finally{baked.dispose();}
});

test('reduced motion freezes a visible human gait and disposing before async bake leaves no mesh',async()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,modelAsset:await assetPromise,reducedMotion:true});await crowd.ready;
 try{const mesh=root.children[0].children[0],shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};mesh.material.onBeforeCompile(shader);crowd.tick(15,{x:0,z:0},15000);assert.ok(crowd.diagnostics.visible>0);assert.equal(shader.uniforms.crowdWalkActive.value,0);assert.equal(shader.uniforms.crowdUpdateInterval.value,0);assert.match(shader.vertexShader,/crowdAnimated/);assert.match(shader.fragmentShader,/crowdSurfaceTint/);}finally{crowd.dispose();}
 const other=createAmbientCrowd(root,items,{...options,modelAsset:await assetPromise});other.dispose();await other.ready;assert.equal(root.children.length,0);
});

test('both shipped body models retain bounded mobile population and actual camera LOD',async()=>{
 const male=await assetPromise,female=await loadShippedCrowdFixture(3),camera={position:{x:90,z:4}},root=new THREE.Group();
 const crowd=createAmbientCrowd(root,items,{...options,viewport:844,coarsePointer:true,modelAsset:male,modelLibrary:{load:async()=>female},camera});await crowd.ready;
 try{
  assert.equal(crowd.diagnostics.models.length,2);assert.equal(crowd.diagnostics.count,24);assert.ok(crowd.diagnostics.drawCalls<=4);assert.ok(crowd.diagnostics.triangles<24*8000);
  const near=crowd.diagnostics.triangles;camera.position={x:3000,z:3000};crowd.tick(1,{x:0,z:0},1000);assert.ok(crowd.diagnostics.triangles<near);
  assert.ok(crowd.diagnostics.models.every(model=>model.animationBytes<=2*1024*1024));
 }finally{crowd.dispose();}
});

test('the shipped fractional clip duration is a shader uniform with no invalid numeric literal',async()=>{
 const baked=await bakeCrowdHuman(await assetPromise),material=crowdHumanMaterial(baked,{value:0},{value:1});
 try{
  assert.ok(baked.duration>0&&!Number.isInteger(baked.duration));
  const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);
  assert.equal(shader.uniforms.crowdClipDuration.value,baked.duration);assert.match(shader.vertexShader,/uniform float crowdClipDuration/);assert.match(shader.vertexShader,/crowdSpeed\/crowdClipDuration/);
  assert.doesNotMatch(shader.vertexShader,/\d+\.\d+\./,'fractional JavaScript durations cannot form invalid GLSL literals');
 }finally{material.dispose();baked.dispose();}
});

test('human movement interpolates between bounded AI updates within the WebGL2 attribute budget',async()=>{
 const root=new THREE.Group(),crowd=createAmbientCrowd(root,items,{...options,viewport:844,coarsePointer:true,deviceMemory:4,modelAsset:await assetPromise});await crowd.ready;
 try{
  const mesh=root.children[0].children.find(mesh=>mesh.count),shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};mesh.material.onBeforeCompile(shader);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);const initial=matrix.clone();
  assert.equal(shader.uniforms.crowdLastUpdateTime.value,0);assert.equal(shader.uniforms.crowdUpdateInterval.value,.25);
  crowd.tick(.10,{x:0,z:0},100);mesh.getMatrixAt(0,matrix);assert.deepEqual(matrix.elements,initial.elements,'CPU matrices stay throttled');
  assert.equal(shader.uniforms.crowdWalkTime.value,.10);assert.equal(shader.uniforms.crowdLastUpdateTime.value,0,'GPU time advances without replacing its interpolation origin');
  const travel=mesh.geometry.attributes.crowdTravel.getX(0);assert.ok(travel>.3&&travel<1.2);assert.ok((shader.uniforms.crowdWalkTime.value-shader.uniforms.crowdLastUpdateTime.value)*travel>0);
  assert.match(shader.vertexShader,/clamp\(crowdWalkTime-crowdLastUpdateTime,0\.,crowdUpdateInterval\)\*crowdTravel\*crowdWalkActive/);
  const attributes=Object.values(mesh.geometry.attributes).reduce((sum,attribute)=>sum+Math.ceil(attribute.itemSize/4),0)+4;assert.ok(attributes<=16,'including the four instanceMatrix locations');
  crowd.tick(.30,{x:0,z:0},300);assert.equal(shader.uniforms.crowdLastUpdateTime.value,.30);
 }finally{crowd.dispose();}
});

test('near clothing preserves animated source surfaces with bounded extra cost and unchanged far geometry',async()=>{
 await MeshoptSimplifier.ready;
 for(const body of [0,3]){
  const asset=body===0?await assetPromise:await loadShippedCrowdFixture(body),model=clone(asset.scene),clip=asset.animations.find(c=>c.name==='Walk'),mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();model.updateMatrixWorld(true);
  const meshes=[];model.traverse(mesh=>{if(mesh.isMesh&&/ClothColor_ClothColor/.test(mesh.material?.name))meshes.push(mesh);});
  try{for(const mesh of meshes){
   const geo=mesh.geometry,p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv,packed=new Float32Array(p.count*3),attributes=new Float32Array(p.count*5),point=new THREE.Vector3();
   for(let i=0;i<p.count;i++){packed.set([p.getX(i),p.getY(i),p.getZ(i)],i*3);attributes.set([n.getX(i)||0,n.getY(i)||1,n.getZ(i)||0,u.getX(i)||0,u.getY(i)||0],i*5);}
   const baseline=ratio=>MeshoptSimplifier.simplifyWithAttributes(geo.index.array,packed,3,attributes,5,[.3,.3,.3,.6,.6],null,Math.floor(geo.index.count*ratio/3)*3,.08,['LockBorder'])[0];
   const previous=baseline(.22),near=crowdMeshLodIndices(mesh),far=crowdMeshLodIndices(mesh,'far');
   assert.deepEqual(far,baseline(.22*.32),'distant population has exactly the previous index buffer');
   const extra=(near.length-previous.length)/3;assert.ok(extra>0&&extra<=1104,'only the nearby clothing receives extra triangles');
   const triangle=new THREE.Triangle(),nearest=new THREE.Vector3();let oldSquared=0,newSquared=0;
   for(const phase of [0,.25,.5,.75]){
    mixer.setTime(clip.duration*phase);model.updateMatrixWorld(true);
    const pose=Array.from({length:p.count},(_,i)=>{point.fromBufferAttribute(p,i);mesh.applyBoneTransform(i,point);return point.clone().applyMatrix4(mesh.matrixWorld);});
    // Compare evenly distributed centroids on the original animated surface to
    // each reduced surface, rather than reproducing a ratio or shader formula.
    for(let i=0;i<geo.index.count;i+=48){
     const sample=pose[geo.index.getX(i)].clone().add(pose[geo.index.getX(i+1)]).add(pose[geo.index.getX(i+2)]).multiplyScalar(1/3),distances=[];
     for(const indices of [previous,near]){let distance=Infinity;for(let k=0;k<indices.length;k+=3){triangle.set(pose[indices[k]],pose[indices[k+1]],pose[indices[k+2]]);triangle.closestPointToPoint(sample,nearest);distance=Math.min(distance,sample.distanceToSquared(nearest));if(distance<1e-12)break;}distances.push(distance);}
     oldSquared+=distances[0];newSquared+=distances[1];
    }
   }
   assert.ok(newSquared<oldSquared*.4,'animated clothing surface RMS error falls by at least36%');
   const baked=await bakeCrowdHuman(asset);try{assert.ok(baked.diagnostics.nearTriangles<10000);assert.equal(baked.diagnostics.farTriangles,body===0?2613:3207);}finally{baked.dispose();}
  }}finally{mixer.stopAllAction();mixer.uncacheRoot(model);model.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});}
 }
});
