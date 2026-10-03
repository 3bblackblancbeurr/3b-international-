import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_PLATFORM,platformNextObjective,safePlatformPosition} from '../src/world/hub/platform-layout.js';
import {findPath} from '../src/world/navigation.js';
import {obstacleDistance} from '../src/world/collision.js';
import {openingFrame,HUB_OPENING_SHOTS} from '../src/world/hub/opening-sequence.js';
import {Raycaster,Vector3} from 'three';

test('reference hub has exactly eight perimeter gates and retains existing persistent IDs',()=>{
 const save=blankSave(),items=worldRuntimeItems('hub',save,{hour:12}),portals=items.filter(i=>i.type==='portal');
 assert.equal(portals.length,8);assert.equal(new Set(portals.map(i=>i.id)).size,8);
 for(const gate of portals)assert.ok(Math.abs(Math.hypot(gate.x,gate.z)-HUB_PLATFORM.portalRadius)<.01);
 assert.equal(items.filter(i=>i.type==='hubBuilding').length,19);
 assert.ok(!items.some(i=>['hubStructure','hubRoad','hubHeritageFacility'].includes(i.type)));
 for(const item of items){assert.ok(Number.isFinite(item.x)&&Number.isFinite(item.z));assert.ok(Math.hypot(item.x,item.z)<HUB_PLATFORM.walkRadius,item.id);}
 const old=normalizeSave({...save,seals:['france'],xp:432,shards:123});assert.equal(old.xp,432);assert.equal(old.shards,123);assert.deepEqual(old.seals,['france']);
});
test('all physical services and portals are reachable through doors, without crossing solid walls',()=>{
 const save=blankSave(),platform=createHubPlatform(save),items=worldRuntimeItems('hub',save,{hour:12});
 try{
  for(const item of items.filter(i=>i.type==='hubBuilding'||i.type==='portal')){
   assert.ok(!platform.collisions.some(o=>obstacleDistance(item,o)<1.25),'blocked counter '+item.id);
   const path=findPath(HUB_PLATFORM.spawn,item,platform.collisions,HUB_PLATFORM.walkRadius);
   assert.ok(path.length,'unreachable '+item.id);assert.ok(Math.hypot(path.at(-1).x-item.x,path.at(-1).z-item.z)<.01,'wrong destination '+item.id);
   let from=HUB_PLATFORM.spawn;for(const to of path){const steps=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.5);for(let i=1;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps};assert.ok(!platform.collisions.some(o=>obstacleDistance(p,o)<1.24),'wall crossing '+item.id);}from=to;}
  }
 }finally{platform.dispose();}
});
test('click-to-move retains a raycastable deck after architecture batching',()=>{
 const platform=createHubPlatform(blankSave());
 try{
  assert.equal(platform.ground.parent,platform.root);platform.root.updateMatrixWorld(true);
  const hit=new Raycaster(new Vector3(0,20,32),new Vector3(0,-1,0)).intersectObject(platform.ground,false)[0];
  assert.ok(hit);assert.ok(Math.abs(hit.point.y)<.05);assert.ok(Math.abs(hit.point.z-32)<1e-6);
 }finally{platform.dispose();}
});
test('NPCs, mission objectives and reward markers stay accessible on the new platform',()=>{
 const save=blankSave();save.hub.missions.first_steps.status='active';
 const platform=createHubPlatform(save),items=worldRuntimeItems('hub',save,{hour:12});
 try{for(const item of items.filter(i=>['hubNpc','hubMission','hubMissionAction','hubTransport'].includes(i.type))){
  const path=findPath(HUB_PLATFORM.spawn,item,platform.collisions,HUB_PLATFORM.walkRadius);assert.ok(path.length,'unreachable '+item.id);assert.ok(Math.hypot(path.at(-1).x-item.x,path.at(-1).z-item.z)<(item.range||5),'outside interaction range '+item.id);
 }}finally{platform.dispose();}
});
test('guidance prioritizes an actionable stage, then reward, while old locations recover safely',()=>{
 const save=blankSave(),action={id:'a',type:'hubMissionAction',name:'Examiner la preuve'},claim={id:'m',type:'hubMission',missionId:'first_steps',name:'Mission'};
 save.hub.missions.first_steps.status='completed';assert.equal(platformNextObjective([claim,action],save).item.id,'a');assert.equal(platformNextObjective([claim],save).item.id,'m');
 assert.deepEqual(safePlatformPosition({x:500,z:400}),HUB_PLATFORM.spawn);assert.deepEqual(safePlatformPosition({x:12,z:31}),{x:12,z:31});
});
test('opening is timed, interruptible presentation with no gameplay reward writes',()=>{
 assert.equal(openingFrame(-4).id,'arrival');let time=0;for(const shot of HUB_OPENING_SHOTS){assert.equal(openingFrame(time).id,shot.id);time+=shot.duration;}assert.equal(openingFrame(time).done,true);
 const source=fs.readFileSync(new URL('../src/world/hub/HubOpeningCinematic.jsx',import.meta.url),'utf8');assert.match(source,/document.hidden/);assert.match(source,/prefers-reduced-motion/);assert.match(source,/cancelAnimationFrame/);assert.doesNotMatch(source,/recordWorldAction|hubMissionClaim|shards\s*\+/);
});
test('first mission guidance follows the actual welcome, train and district objectives',()=>{
 const save=blankSave();save.hub.missions.first_steps.status='active';
 for(const [stage,type,key,value] of [[0,'hubBuilding','buildingId','heritage_welcome'],[1,'hubTransport','transport','train'],[2,'hubDistrict','district','heritage_square']]){
  save.hub.missions.first_steps.completedObjectives=stage;
  const goal=platformNextObjective(worldRuntimeItems('hub',save,{hour:12}),save);
  assert.equal(goal.item.type,type);assert.equal(goal.item[key],value);
 }
});
test('world activity entry points require physical locations instead of arena shortcuts',()=>{
 const hud=fs.readFileSync(new URL('../src/world/WorldHUD.jsx',import.meta.url),'utf8'),page=fs.readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(hud,/onPanel\('arena'\)/);assert.doesNotMatch(page,/<button onClick=\{\(\)=>setPanel\('arena'\)\}><Users\/>Arène/);assert.match(page,/hubContract/);assert.match(page,/Pas maintenant/);
});
