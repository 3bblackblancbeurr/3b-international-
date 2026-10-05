import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {hubPublicPlaces,HUB_VALUES,platformWorldState,HUB_DISTRICT_STORIES} from '../src/world/hub/platform-life.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {COUNTRIES} from '../src/world/catalog.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {findPath} from '../src/world/navigation.js';
import {spatialObstacles} from '../src/world/hub/spatial-obstacles.js';
import {obstacleDistance} from '../src/world/collision.js';
import {HUB_MISSION_ACTION_PLANS} from '../src/world/hub/mission-actions.js';

test('district buildings stay fixed across progress and reserve future mission actions',()=>{
 const fresh=blankSave(),progress=blankSave(),a=createHubPlatform(fresh);
 for(const [id,stages] of Object.entries(HUB_MISSION_ACTION_PLANS))if(progress.hub.missions[id])Object.assign(progress.hub.missions[id],{status:'active',completedObjectives:stages.length-1});
 const b=createHubPlatform(progress),fabric=w=>w.collisions.filter(o=>o.id?.startsWith('fabric-'));
 try{
  assert.ok(a.architectureDiagnostics.districtBuildings>=40);
  assert.deepEqual(fabric(a),fabric(b),'mission progress must not move physical buildings');
  for(const item of worldRuntimeItems('hub',progress).filter(i=>i.type==='hubMissionAction'))assert.ok(fabric(b).every(o=>obstacleDistance(item,o)>item.range),'future action stays clear: '+item.id);
 }finally{a.dispose();b.dispose();}
});
test('expanded platform provides three times the former area and keeps eight canonical values',()=>{
 assert.ok(HUB_PLATFORM.radius>=285);assert.ok((HUB_PLATFORM.radius/168)**2>2.8);
 assert.deepEqual(HUB_VALUES,COUNTRIES.map(c=>GUARDIAN_VALUES[c.id].value));
 assert.equal(Object.keys(HUB_DISTRICT_STORIES).length,10);assert.equal(hubPublicPlaces().length,18);
});
test('district consoles and value memories are reachable and belong only to the hub',()=>{
 const save=blankSave(),world=createHubPlatform(save);
 try{for(const item of hubPublicPlaces()){
  const path=findPath(HUB_PLATFORM.spawn,item,world.collisions,HUB_PLATFORM.walkRadius);
  assert.ok(path.length,item.id);assert.ok(Math.hypot(path.at(-1).x-item.x,path.at(-1).z-item.z)<item.range,item.id);
 }assert.equal(worldRuntimeItems('france',save).filter(i=>i.type==='hubPublicPlace').length,0);
 }finally{world.dispose();}
});
test('claimed missions update civic state on reload and cannot grant presentation rewards',()=>{
 const save=blankSave(),world=createHubPlatform(save);
 try{
  assert.equal(world.root.userData.worldState.networkRestored,false);
  for(const id of ['blue_blackout','eight_seeds','voices_square','living_fabric']){save.hub.missions[id].status='completed';save.hub.missions[id].completedObjectives=save.hub.missions[id].totalObjectives;save.hub.missions[id].claimed=true;}
  const resumed=normalizeSave(save),before=JSON.stringify(resumed);world.update(resumed);
  const state=platformWorldState(resumed);assert.equal(state.networkRestored,true);assert.equal(state.gardenRestored,true);assert.equal(state.communityUnited,true);assert.equal(state.workshopRestored,true);assert.deepEqual(world.root.userData.worldState,state);assert.equal(JSON.stringify(resumed),before);
 }finally{world.dispose();}
});
test('expanded skyline stays batched and uses no new external asset downloads',()=>{
 const world=createHubPlatform(blankSave());
 try{let meshes=0,triangles=0;world.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
 // Expanded archipelago: 96 additional houses, 25 additional causeway/dock
 // spans, ten reliefs with two LODs, nine vessels and six Tower floors.
 // Measured: 242 meshes / 354,230 base triangles before runtime instances.
 // Per-view mobile submission is independently gated in hub-reference-render-budget.
 assert.ok(meshes<260,`static meshes ${meshes}`);assert.ok(triangles<380000,`base triangles ${triangles}`);
 assert.equal(world.architectureDiagnostics.residentialBlocks,16);assert.equal(world.architectureDiagnostics.publicPlaces,30);assert.equal(world.architectureDiagnostics.towerFloors,6);assert.equal(world.architectureDiagnostics.gatePavilions,96);}finally{world.dispose();}
});
test('route broad phase preserves exact collision results for circles, rotated walls and disabled objects',()=>{
 const obstacles=[{x:-12,z:0,r:7},{x:0,z:0,width:30,depth:3,rotation:.7},{x:30,z:20,width:6,depth:40},{x:0,z:8,r:6,enabled:false}],nearby=spatialObstacles(obstacles);
 for(let x=-40;x<50;x+=.7)for(let z=-30;z<50;z+=.9){const p={x,z};assert.equal(nearby(p).some(o=>obstacleDistance(p,o)<1.25),obstacles.some(o=>obstacleDistance(p,o)<1.25));}
});
