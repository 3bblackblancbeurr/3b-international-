import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {blankSave} from '../src/world/rules.js';
import {hubInteriorSpec,hubInteriorObstacles,hubInteriorAction} from '../src/world/hub/interiors.js';
import {createHubInteriorVisual} from '../src/world/hub/interior-visuals.js';
import {HUB_BUILDING_SERVICES} from '../src/world/hub/building-services.js';
import {brokenCircleCrownLayout,createBrokenCircleCrown} from '../src/world/hub/broken-circle-visuals.js';
import {hubAtmosphere,hubSilhouetteVisible,hubPanoramaFrame} from '../src/world/hub/atmosphere.js';
import {findInteractionPath} from '../src/world/navigation.js';
import {advanceMotion} from '../src/world/motion.js';
import {obstacleDistance} from '../src/world/collision.js';
import {clearCameraView,hubArrivalPosition} from '../src/world/camera-clearance.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {createTerrainField} from '../src/world/terrain.js';
import {worldReducedMotion,watchWorldMotion} from '../src/world/motion-preference.js';
import {createWorldSky,skyDayWeight} from '../src/world/sky.js';
import {cinematicMotionFrame} from '../src/world/cinematic-camera.js';

function primitives(){
 const geometry={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20),sphere:new THREE.IcosahedronGeometry(1,1),ring:new THREE.TorusGeometry(1,.065,6,48)},materials=[];
 return {geometry,material:(color,extra={})=>{const mat=new THREE.MeshStandardMaterial({color,...extra});materials.push(mat);return mat;},dispose(){Object.values(geometry).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}

test('all nineteen real building cells have reachable desks and an exit, with no invented account capability',()=>{
 const save=blankSave();assert.equal(Object.keys(HUB_BUILDING_SERVICES).length,19);
 for(const id of Object.keys(HUB_BUILDING_SERVICES)){
  const spec=hubInteriorSpec(id,save),obstacles=hubInteriorObstacles(spec);assert.ok(spec,id);
  assert.ok(obstacles.every(obstacle=>obstacleDistance(spec.entry,obstacle)>.7),id+' entry');
  for(const item of spec.items){
   const path=findInteractionPath(spec.entry,item,obstacles,spec.bounds.radius);assert.ok(path.length,id+' '+item.name);
   const last=path.at(-1);assert.ok(Math.hypot(last.x-item.x,last.z-item.z)<item.range,id+' desk interaction reachable');
   if(item.type==='hubInteriorDesk')assert.ok(hubInteriorAction(item),id+' authorised target');
  }
  for(const direction of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}]){
   let state={position:{...spec.entry},target:null,route:[]};
   for(let tick=0;tick<100;tick++)state=advanceMotion(state,direction,.1,5.2,obstacles,spec.bounds.radius);
   assert.ok(Math.abs(state.position.x)<spec.bounds.width/2&&Math.abs(state.position.z)<spec.bounds.depth/2,id+' cannot cross a wall');
  }
 }
 assert.equal(hubInteriorSpec('unknown',save),null);
 assert.equal(hubInteriorAction({type:'hubInteriorDesk',action:{kind:'route',target:'passportGrant'}}),null);
 assert.equal(hubInteriorAction({type:'hubInteriorDesk',action:{kind:'panel',target:'ai'}}),null);
 assert.deepEqual(save,blankSave());
});

test('visitable cells stay below eighty meshes, use shared primitives and add no lights or animations',()=>{
 const assets=primitives();try{
  for(const id of Object.keys(HUB_BUILDING_SERVICES)){
   const visual=createHubInteriorVisual(hubInteriorSpec(id,blankSave()),assets);let meshes=0,lights=0;
   visual.root.traverse(object=>{if(object.isMesh){meshes++;assert.ok(Object.values(assets.geometry).includes(object.geometry));}if(object.isLight)lights++;});
   assert.ok(meshes<80,id+' '+meshes);assert.equal(lights,0);assert.ok(visual.floor.isMesh);
  }
 }finally{assets.dispose();}
});

test('the monumental crown keeps eight heritage sectors and renders in at most three draws on mobile',()=>{
 const assets=primitives();try{
  for(const count of [0,1,4,8])for(const compact of [true,false]){
   const layout=brokenCircleCrownLayout({height:156,fragmentCount:count,compact});
   assert.equal(new Set(layout.pieces.map(piece=>piece.sector)).size,8);
   assert.equal(layout.pieces.filter(piece=>piece.active).length,count*(compact?4:6));
   const crown=createBrokenCircleCrown({height:156,fragmentCount:count,renderProfile:compact?'mobileMedium':'desktop'},assets);
   let draws=0,instances=0;crown.traverse(object=>{if(object.isMesh){draws++;assert.equal(object.isInstancedMesh,true);instances+=object.count;}});
   assert.ok(draws<=3);assert.equal(instances,(compact?32:48)+8);
   const bounds=new THREE.Box3().setFromObject(crown);assert.ok(bounds.getSize(new THREE.Vector3()).x>60);assert.ok(bounds.max.y<156);
   assert.equal(crown.userData.fragmentCount,count);crown.dispose();
  }
 }finally{assets.dispose();}
});

test('Cité arrival and camera remain outside building footprints while the panorama frames the real tower',()=>{
 const items=worldRuntimeItems('hub',blankSave()),terrain=createTerrainField('hub',blankSave());
 const obstacles=[...terrain.buildings,...terrain.civic,...items.filter(item=>['hubBuilding','hubStructure'].includes(item.type)).map(item=>({x:item.buildingX??item.x,z:item.buildingZ??item.z,width:item.width+.8,depth:item.depth+.8,height:item.height})),...items.filter(item=>item.type==='hubDistrictLandmark').map(item=>({x:item.x,z:item.z,width:9,depth:9,height:item.height}))];
 const arrival=hubArrivalPosition(items,obstacles);assert.ok(arrival.z>40);assert.ok(obstacles.every(obstacle=>obstacleDistance(arrival,obstacle)>=5));
 const wall={x:0,z:10,width:10,depth:2,height:14};
 const original={target:{x:0,y:2,z:0},position:{x:0,y:6,z:24}},safe=clearCameraView(original,[wall]);
 assert.equal(safe.obstructed,true);assert.ok(safe.position.z<8.5);assert.ok(obstacleDistance(safe.position,wall)>.65);assert.deepEqual(safe.target,original.target);
 assert.equal(clearCameraView({target:{x:0,y:20,z:0},position:{x:0,y:24,z:24}},[wall]).obstructed,false);
 assert.equal(clearCameraView(original,[{...wall,enabled:false}]).obstructed,false);
 for(const portrait of [false,true]){
  const frame=hubPanoramaFrame(items,{portrait}),camera=new THREE.PerspectiveCamera(60,portrait?390/844:1440/900,.3,1800);
  camera.position.set(frame.x+Math.sin(frame.angle)*frame.radius,frame.height,frame.z+Math.cos(frame.angle)*frame.radius);camera.lookAt(frame.x,frame.focusY,frame.z);camera.updateMatrixWorld();
  for(const y of [0,156]){const p=new THREE.Vector3(frame.x,y,frame.z).project(camera);assert.ok(Math.abs(p.y)<.9);}
 }
 assert.equal(hubSilhouetteVisible({type:'hubDistrictLandmark'},3),true);
 assert.equal(hubSilhouetteVisible({type:'hubNpc'},3),false);
 assert.ok(hubAtmosphere(0,'rain').hemisphere>0);assert.ok(hubAtmosphere(0).fill>0);
 assert.notEqual(hubAtmosphere(0).fogColor,hubAtmosphere(1).fogColor);
});

test('reduced motion follows account and live OS changes without creating a new renderer',()=>{
 let mediaListener,observerListener,removed=0,disconnected=0;const media={matches:false,addEventListener(_,callback){mediaListener=callback;},removeEventListener(){removed++;}};
 const doc={documentElement:{dataset:{motion:'normal'}}},view={matchMedia:()=>media,MutationObserver:class{constructor(callback){observerListener=callback;}observe(){}disconnect(){disconnected++;}}};
 const observed=[],stop=watchWorldMotion(value=>observed.push(value),view,doc);
 assert.equal(worldReducedMotion(view,doc),false);doc.documentElement.dataset.motion='reduced';observerListener();
 doc.documentElement.dataset.motion='normal';media.matches=true;mediaListener();media.matches=false;mediaListener();
 assert.deepEqual(observed,[true,true,false]);stop();assert.equal(removed,1);assert.equal(disconnected,1);
 for(const waterReveal of [true,false]){
  const frames=[0,.2,.7,1].map(value=>cinematicMotionFrame(value,{waterReveal,reducedMotion:true}));
  assert.ok(frames.every(frame=>JSON.stringify(frame)===JSON.stringify(frames[0])));
  assert.notDeepEqual(cinematicMotionFrame(.2,{waterReveal}),cinematicMotionFrame(.7,{waterReveal}));
 }
});

test('a motionless night sky starts dark and its weather still follows real elapsed time',()=>{
 const sky=createWorldSky(null),camera=new THREE.PerspectiveCamera(60,1,.3,1800);
 try{
  sky.setAtmosphere({daylight:.18,weather:'clear'});assert.ok(sky.atmosphere.daylight<.05);assert.equal(sky.atmosphere.daylight,skyDayWeight(.18));
  sky.setAtmosphere({daylight:1,weather:'rain'});
  for(let tick=0;tick<240;tick++)sky.update(camera,0,1/60);
  assert.ok(sky.atmosphere.daylight>.99);assert.ok(sky.atmosphere.cloudiness>.70);
  sky.setAtmosphere({daylight:.18,weather:'storm'});
  for(let tick=0;tick<240;tick++)sky.update(camera,0,1/60);
  assert.ok(sky.atmosphere.daylight<.04);assert.ok(sky.atmosphere.storminess>.98);
 }finally{sky.dispose();}
});
