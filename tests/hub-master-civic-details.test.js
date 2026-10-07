import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {civicDetailLayout,civicInteractionReservations,addCivicDetailScene} from '../src/world/hub/civic-detail-scene.js';
import {addReferenceGateDistricts} from '../src/world/hub/reference-gate-districts.js';
import {addReferenceLandscape,referenceSeabirdGeometry} from '../src/world/hub/reference-landscape-scene.js';
import {addCiteVegetation} from '../src/world/hub/cite-vegetation.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {blankSave} from '../src/world/rules.js';
import {HUB_SCALE,HUB_PLATFORM,platformBuilding} from '../src/world/hub/platform-layout.js';
import {HUB_PLAN} from '../src/world/hub/runtime-data.js';
import {citeSurfaceDistance} from '../src/world/hub/platform-topology.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findInteractionPath} from '../src/world/navigation.js';

const destroy=owned=>owned.forEach(asset=>asset.dispose());
const cameraAt=(x,z)=>{const camera=new THREE.PerspectiveCamera();camera.position.set(x,5,z);camera.updateMatrixWorld(true);return camera;};
const localCollisions=hub=>hub.collisions.filter(o=>!o.id?.startsWith('civic-rest:')).map(o=>Object.fromEntries(Object.entries(o).map(([key,value])=>[key,['x','z','r','width','depth'].includes(key)?value/HUB_SCALE:value])));
const buildings=HUB_PLAN.buildings.map(platformBuilding).map(b=>({...b,buildingX:b.buildingX/HUB_SCALE,buildingZ:b.buildingZ/HUB_SCALE,width:b.width/HUB_SCALE,depth:b.depth/HUB_SCALE}));

test('civic furnishings fit their shared collider and readable/sitting approaches stay clear',()=>{
 const plan=civicDetailLayout({reservations:[]});assert.equal(plan.stations.length,22);assert.equal(plan.anchors.length,44);
 for(const station of plan.stations){
  const c=Math.cos(station.rotation),s=Math.sin(station.rotation),poses=plan.pieces.filter(piece=>piece.stationId===station.id);
  assert.equal(poses.filter(p=>p.material==='wood'&&p.sy===.12).length,8,'separated physical timber seat slats');
  for(const p of poses){
   const x=(p.x-station.x)*c-(p.z-station.z)*s,z=(p.x-station.x)*s+(p.z-station.z)*c;
   const extent=p.shape==='cylinder'||p.shape==='leaf'?{x:p.sx,z:p.sz,y:p.shape==='leaf'?p.sy:p.sy/2}:p.shape==='label'?{x:p.sx/2,z:0,y:p.sy/2}:{x:p.sx/2,z:p.sz/2,y:p.sy/2};
   assert.ok(Math.abs(x)+extent.x<=station.width/2+.00001,'drawn part stays inside solid width');
   assert.ok(Math.abs(z)+extent.z<=station.depth/2+.00001,'drawn part stays inside solid depth');
   assert.ok(p.y-extent.y>=-.00001&&p.y+extent.y<=station.top,'real furniture stays above the deck and below the camera solid');
  }
 }
 for(const anchor of plan.anchors){
  assert.ok(citeSurfaceDistance(anchor.x,anchor.z)<-1.4);
  assert.ok(plan.stations.every(station=>obstacleDistance(anchor,station)>1.8),'approach retains walking/route clearance');
  if(anchor.kind==='seat'){assert.ok(plan.stations.some(station=>station.x===anchor.seatX&&station.z===anchor.seatZ));assert.equal(anchor.seatHeight,.77);}
 }
});

test('furnishings in the complete city reserve every mission stage and connect to public routes',()=>{
 const hub=createHubPlatform(blankSave());
 try{
  const collisions=localCollisions(hub),plan=civicDetailLayout({buildings,collisions}),reserved=civicInteractionReservations();
  assert.ok(plan.stations.length>=10&&plan.stations.length<=22,'useful stations survive actual homes, trees, landmarks and mission access');
  for(const station of plan.stations)assert.ok(reserved.every(p=>obstacleDistance(p,station)>=p.r+1.25),'future mission points remain reachable');
  const worldCollisions=[...collisions.map(o=>({...o,...Object.fromEntries(['x','z','width','depth','r'].filter(key=>Number.isFinite(o[key])).map(key=>[key,o[key]*HUB_SCALE]))})),...plan.stations.map(o=>({...o,x:o.x*HUB_SCALE,z:o.z*HUB_SCALE,width:o.width*HUB_SCALE,depth:o.depth*HUB_SCALE}))];
  for(const anchor of plan.anchors.filter(p=>p.kind==='seat')){
   const item={...anchor,x:anchor.x*HUB_SCALE,z:anchor.z*HUB_SCALE,range:anchor.range*HUB_SCALE},path=findInteractionPath(HUB_PLATFORM.spawn,item,worldCollisions,HUB_PLATFORM.walkRadius);
   assert.ok(path.length>0,anchor.name+' has an actual public approach route');
   assert.ok(Math.hypot(path.at(-1).x-item.x,path.at(-1).z-item.z)<.001);
  }
 }finally{hub.dispose();}
});

test('furniture shares materials, owns assets once and removes fine detail from distant mobile draws',()=>{
 const root=new THREE.Group(),owned=[],collisions=[],cameraSolids=[];
 const originalDocument=globalThis.document,drawn=[];
 globalThis.document={createElement(){return{width:0,height:0,getContext(){return{fillRect(){},fillText(text){drawn.push(text);}};}};}};
 try{
  const civic=addCivicDetailScene({root,owned,collisions,cameraSolids,reservations:[]});root.updateMatrixWorld(true);
  assert.equal(civic.mapSites.length,collisions.length);assert.equal(cameraSolids.length,collisions.length);
  assert.ok(civic.diagnostics.drawBatches<=6);assert.equal(civic.diagnostics.labelTexturePixels,512*512);assert.equal(drawn.length,new Set(civic.mapSites.map(site=>site.name)).size);
  assert.equal(new Set(owned).size,owned.length);
  const fine=civic.group.children.filter(mesh=>mesh.name.endsWith(' · détail')),structural=civic.group.children.filter(mesh=>!fine.includes(mesh)),structureCounts=structural.map(mesh=>mesh.count);
  civic.setQuality('fluid');const station=civic.mapSites[0];civic.updateView(cameraAt(station.x,station.z));assert.ok(fine.some(mesh=>mesh.count>0));assert.ok(structural.every(mesh=>mesh.geometry.attributes.civicNear.getX(0)===1));
  civic.updateView(cameraAt(3000,3000));assert.ok(fine.every(mesh=>mesh.count===0));assert.ok(structural.every(mesh=>mesh.geometry.attributes.civicNear.array.every(value=>value===0)),'fine parts leave distant draws through the per-instance collapse mask');assert.deepEqual(structural.map(mesh=>mesh.count),structureCounts,'collidable silhouettes stay rendered');
  civic.updateView(cameraAt(station.x,station.z));assert.ok(fine.some(mesh=>mesh.count>0));assert.ok(structural.every(mesh=>!mesh.castShadow));
  civic.setQuality('detail');assert.ok(structural.every(mesh=>mesh.castShadow));
 }finally{globalThis.document=originalDocument;destroy(owned);}
});

test('all gate fronts gain grounded details, restrained night lanterns and one bounded additional draw',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const city=addReferenceGateDistricts({root,owned}),lamps=city.group.getObjectByName('Lanternes des façades');
  assert.equal(city.diagnostics.lanterns,192);assert.equal(city.diagnostics.accessibleThresholds,96);assert.equal(city.diagnostics.downpipes,192);assert.ok(city.diagnostics.drawBatches<=20);
  assert.equal(lamps.count,192);city.setDaylight(1);assert.equal(lamps.material.emissiveIntensity,0);city.setDaylight(0);assert.equal(lamps.material.emissiveIntensity,.75);city.setDaylight(NaN);assert.equal(lamps.material.emissiveIntensity,0);
  for(const [index,craft] of city.craftSites.entries()){
   const home=city.layout.flatMap(region=>region.buildings)[index];assert.equal(craft.id,home.id);assert.equal(craft.threshold.y,home.baseY+.045);assert.ok(obstacleDistance(craft.threshold,city.obstacles.find(o=>o.id===home.id))<=0);
  }
  const stone=city.group.getObjectByName('Socles des huit héritages').material,shader={vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>',uniforms:{}};stone.onBeforeCompile(shader);
  assert.ok(shader.vertexShader.includes('length(instanceMatrix[0].xyz)'),'courses follow physical local wall dimensions');assert.ok(shader.fragmentShader.includes('fwidth(edge)'),'mortar does not shimmer into a hard sub-pixel grid');
 }finally{destroy(owned);}
});

test('botanical wind and its depth/distance shadows share clock, weather and grounded deformation',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const plants=addCiteVegetation({root,owned,buildings:[],collisions:[]}),canopy=root.getObjectByName('Canopées ramifiées'),materials=[canopy.material,canopy.customDepthMaterial,canopy.customDistanceMaterial],shaders=materials.map(material=>{const shader={vertexShader:'#include <begin_vertex>',uniforms:{}};material.onBeforeCompile(shader);return shader;});
  plants.tick(19);plants.setWeather('storm');
  for(const shader of shaders){assert.equal(shader.uniforms.citeTreeTime.value,19);assert.equal(shader.uniforms.citeTreeWind.value,1);assert.ok(shader.vertexShader.includes('instanceMatrix[3].x*.23'));assert.ok(shader.vertexShader.includes('max(0.,position.y-3.)'));}
  assert.equal(shaders[0].vertexShader,shaders[1].vertexShader);assert.equal(shaders[1].vertexShader,shaders[2].vertexShader);assert.equal(shaders[0].uniforms.citeTreeTime,shaders[1].uniforms.citeTreeTime);
  const trunk=root.getObjectByName('Troncs').geometry;trunk.computeBoundingBox();assert.ok(Math.abs(trunk.boundingBox.min.y)<1e-6);assert.ok(trunk.boundingBox.max.x<.32);assert.equal(new Set(owned).size,owned.length);
 }finally{destroy(owned);}
});

test('the harbour flock has a bounded opaque draw, moves with time and responds to night/storm/mobile budgets',()=>{
 const root=new THREE.Group(),owned=[];
 try{
  const geometry=referenceSeabirdGeometry();assert.equal(geometry.attributes.position.count/3,7);geometry.dispose();
  const landscape=addReferenceLandscape({root,owned,includeDocks:false}),birds=landscape.group.getObjectByName('Oiseaux de la Baie des Horizons'),before=new Float32Array(birds.instanceMatrix.array);
  assert.equal(birds.count,28);assert.equal(landscape.diagnostics.seabirdDraws,1);assert.equal(birds.material.transparent,false);assert.equal(birds.castShadow,false);
  landscape.tick(10);assert.notDeepEqual(birds.instanceMatrix.array,before);landscape.setQuality('fluid');assert.equal(birds.count,10);landscape.setDaylight(0);assert.equal(birds.count,0);landscape.setDaylight(1);assert.equal(birds.count,10);landscape.setWeather('storm');assert.equal(birds.count,0);landscape.setWeather('clear');landscape.setQuality('detail');assert.equal(birds.count,28);
  const position=new THREE.Vector3(),matrix=new THREE.Matrix4();for(let index=0;index<birds.count;index++){birds.getMatrixAt(index,matrix);position.setFromMatrixPosition(matrix);assert.ok(birds.boundingSphere.containsPoint(position));assert.ok(position.y>20,'flock clears city decks and dock passengers');}
  assert.equal(new Set(owned).size,owned.length);landscape.disposeReflection();
 }finally{destroy(owned);}
});
