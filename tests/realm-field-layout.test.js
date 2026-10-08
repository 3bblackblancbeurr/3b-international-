import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTRIES} from '../src/world/catalog.js';
import {blankSave,normalizeSave,nearestInteraction} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {CHAPTERS} from '../src/world/chapters.js';
import {GUARDIAN_VALUES} from '../src/world/guardian-values.js';
import {realmCampaignPosition,realmTravelItems} from '../src/world/realm-layout.js';
import {realmTravelDestinations,realmCorePosition} from '../src/world/realm-navigation.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {CAMPAIGN_RUNTIME_SPEC} from '../src/world/campaign-spec.js';
import {createTerrainField,landscapeItems,toLandscape,worldRadiusFor} from '../src/world/terrain.js';
import {worldRuntimeItems} from '../src/world/runtime-items.js';
import {createHubPlatform} from '../src/world/hub/platform-scene.js';
import {HUB_PLATFORM} from '../src/world/hub/platform-layout.js';
import {beginField,combatObstacles,fieldMover,alignLegacyCombatField} from '../src/world/field-world.js';
import {startField} from '../src/world/field-combat.js';
import {obstacleDistance} from '../src/world/collision.js';
import {findPath} from '../src/world/navigation.js';
import {advanceMotion} from '../src/world/motion.js';

const point=p=>({x:p.x,z:p.z});
const clear=(p,obstacles)=>!obstacles.some(o=>obstacleDistance(p,o)<.7);
function walk(start,end,obstacles,radius){const path=findPath(start,end,obstacles,radius);assert.ok(path.length,'a physical walking route exists');let state={position:start,target:path.shift(),route:path};for(let n=0;n<600&&state.target;n++)state=advanceMotion(state,{x:0,z:0},1/30,10.5,obstacles,radius);assert.ok(Math.hypot(state.position.x-end.x,state.position.z-end.z)<.1,'movement reaches the real target');return state.position;}

test('the final Circle spawns outside the rendered Hub monument and shares its physical walls',()=>{
 const save=blankSave(),world=createHubPlatform(save),field=beginField(save,{boss:true,final:true}),final=worldRuntimeItems('hub',save).find(item=>item.type==='final'),obstacles=combatObstacles(save);
 try{
  assert.deepEqual(field.home,point(final));assert.ok(clear(field.p,world.collisions),'the real player spawn is outside every rendered obstacle');assert.ok(clear(field.enemy,world.collisions),'the real boss spawn is outside every rendered obstacle');
  walk(HUB_PLATFORM.spawn,field.p,world.collisions,HUB_PLATFORM.walkRadius);
  assert.ok(obstacles.some(o=>o.x===0&&o.z===0&&o.r===19.5*1.7),'authoritative movement shares the central fountain footprint');
  const move=fieldMover(save);let p=field.p;for(let n=0;n<30;n++)p=move(p,{x:0,z:-1},1.05);assert.ok(Math.hypot(p.x,p.z)>=19.5*1.7+.7,'combat cannot walk through the visible fountain');
 }finally{world.dispose();}
});

test('every Guardian objective, world actor and encounter uses the same walkable distant court',()=>{
 for(const country of COUNTRIES){
  const save=normalizeSave({...blankSave(),region:country.id,visited:[country.id],adventure:{...blankSave().adventure,chapters:{[country.id]:{helped:true,solved:true,powers:['ally','ambiance','terrain'],restored:2,board:CHAPTERS[country.id].answer}},values:{[country.id]:{decisions:GUARDIAN_VALUES[country.id].choices.map(choice=>choice[0])}}}}),court=realmCampaignPosition(country.id,3),guardian=landscapeItems(country.id,save).find(item=>item.type==='guardian'),field=beginField(save,{boss:true,card:guardian.card}),obstacles=combatObstacles(save),relay=realmTravelItems(country.id).find(item=>item.province===3);
  const campaign=campaignSnapshot({...save,adventure:{...save.adventure,campaigns:{[country.id]:{version:1,active:true,completed:CAMPAIGN_RUNTIME_SPEC[country.id].slice(0,5).map(phase=>phase.id)}}}},country.id);
  assert.deepEqual(point(campaign.target),point(court));assert.deepEqual(point(guardian),point(court));assert.deepEqual(field.home,point(court));assert.ok(Math.hypot(court.x,court.z)>worldRadiusFor(country.id)*.89,'the court is a real outer-world encounter');assert.ok(clear(field.p,obstacles));walk(point(relay),field.p,obstacles,worldRadiusFor(country.id));
 }
});

test('legacy paused final and Guardian fields relocate once without losing encounter progress',()=>{
 for(const region of ['hub',...COUNTRIES.map(country=>country.id)]){
  const final=region==='hub',old=toLandscape(region,0,final?-3:-57),save={...blankSave(),region},encounter={boss:true,final,region:final?'france':region,hp:83,enemy:124,focus:2,turn:19,finalCircleMastery:31,recoveries:1,field:startField({x:old.x,z:old.z+11},old)};
  encounter.field.time=7100;encounter.field.cooldown=200;const moved=alignLegacyCombatField(save,encounter);
  for(const key of ['hp','enemy','focus','turn','finalCircleMastery','recoveries'])assert.equal(moved[key],encounter[key],key+' survives legacy relocation');assert.equal(moved.field.time,7100);assert.equal(moved.field.cooldown,200);assert.equal(moved.field.phase,'recovery');assert.ok(clear(moved.field.p,combatObstacles(save)));assert.ok(clear(moved.field.enemy,combatObstacles(save)));assert.equal(alignLegacyCombatField(save,moved),moved,'the next replay cannot relocate the same combat again');
 }
});

test('the core relay wins interaction separately from the automatic portal and accepts the same physical position',()=>{
 for(const country of COUNTRIES){
  const save=applyWorldAction(blankSave(),{type:'visit',region:country.id}),core=realmTravelDestinations(save).find(item=>item.id.endsWith(':core')),items=worldRuntimeItems(country.id,save),portal=items.find(item=>item.type==='portal'&&item.id==='hub'),field=createTerrainField(country.id,save),obstacles=combatObstacles(save);
  assert.ok(Math.hypot(core.x-portal.x,core.z-portal.z)>13,'relay and automatic portal have separate interaction envelopes');assert.equal(nearestInteraction(core,items)?.id,core.id);assert.ok(clear(core,obstacles));assert.ok(Math.abs(field.height(core.x,core.z))<.01&&field.protectedPoint(core.x,core.z,3),'arrival is on a dry authored clearing');
  const approach=findPath({x:0,z:5},point(core),obstacles,worldRadiusFor(country.id));assert.ok(approach.length);walk({x:0,z:5},point(core),obstacles,worldRadiusFor(country.id));
  const province=realmTravelItems(country.id).find(item=>item.province===0),travelled=applyWorldAction(save,{type:'realmTravel',from:core.id,to:province.id,position:point(core)});assert.equal(travelled.adventure.realmTravel.to,province.id);
  const oldArrival=normalizeSave({...save,adventure:{...save.adventure,realmTravel:{region:country.id,...point(portal),nonce:9,to:core.id}}});assert.deepEqual(point(oldArrival.adventure.realmTravel),realmCorePosition(country.id));assert.equal(oldArrival.adventure.realmTravel.nonce,9);
 }
});
