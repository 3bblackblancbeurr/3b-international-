import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {frontierState} from '../src/world/frontier.js';
import {DISTRICT_JOBS,currentJobActions,districtJobActionItems,districtJobTurnInItem} from '../src/world/district-jobs.js';
import {franceResidentState,franceResidentItems,franceDistrictState,districtContractGuide} from '../src/world/france-life.js';
import {parisActivity} from '../src/world/paris-journey.js';

const restart=s=>normalizeSave(JSON.parse(JSON.stringify(s)));
const act=(s,command)=>restart(applyWorldAction(s,command));
const arrival=()=>act(blankSave(),{type:'visit',region:'france'});
function finish(save,id){
 save=act(save,{type:'jobAccept',id});
 while(currentJobActions(frontierState(save)).length){
  const action=currentJobActions(frontierState(save))[0];
  save=act(save,{type:'jobAction',job:id,actionId:action.id});
 }
 return act(save,{type:'jobDone',id});
}

test('every active contract guide resolves to a real current action or turn-in after restart',()=>{
 for(const id of Object.keys(DISTRICT_JOBS).filter(id=>id!=='justice_case')){
  let save=arrival();save.adventure.frontier.france={...frontierState(save),food:10};save=act(save,{type:'jobAccept',id});
  while(currentJobActions(frontierState(save)).length){
   const home=frontierState(save),guide=parisActivity(save),targets=districtJobActionItems('france',home);
   assert.ok(targets.some(item=>item.id===guide.target),id+' guide points to an actionable item');
   save=act(save,{type:'jobAction',job:id,actionId:currentJobActions(home)[0].id});
  }
  assert.equal(districtContractGuide('france',frontierState(save)).target,districtJobTurnInItem('france',frontierState(save)).id);
 }
});

test('garden reward changes the real cafe price and remains after repeatable jobs reset',()=>{
 let save=finish(arrival(),'garden');const xp=save.xp;
 assert.equal(franceDistrictState(frontierState(save)).basketPrice,4);
 assert.throws(()=>act(save,{type:'jobDone',id:'garden'}));assert.equal(save.xp,xp);
 const before=save.shards,food=frontierState(save).food;save=act(save,{type:'provisions'});
 assert.equal(save.shards,before-4);assert.equal(frontierState(save).food,food+3);
 save.adventure.frontier.france.jobs=[];save=restart(save);
 assert.equal(franceDistrictState(frontierState(save)).basketPrice,4);
 assert.match(franceResidentState('nora',frontierState(save)).text,/souviens/);
 save=act(save,{type:'jobAccept',id:'garden'});assert.equal(franceDistrictState(frontierState(save)).basketPrice,4);
});

test('cleared source improves food gathering once, keeps cap, and does not alter other realms',()=>{
 let save=finish(arrival(),'spring_clearance');const before=frontierState(save).food;
 save=act(save,{type:'gather',resource:'food'});assert.equal(frontierState(save).food,before+4);
 assert.throws(()=>act(save,{type:'gather',resource:'food'}));
 save.adventure.frontier.france.food=98;save.adventure.frontier.france.harvest=[];
 save=act(save,{type:'gather',resource:'food'});assert.equal(frontierState(save).food,99);
 const other=act(act(save,{type:'visit',region:'hub'}),{type:'visit',region:'algerie'});assert.equal(franceDistrictState(frontierState(other)).foodHarvestBonus,0);
});

test('abandon clears only active progress, consumes no extra resources and grants no reward',()=>{
 let save=act(arrival(),{type:'jobAccept',id:'atelier'});save=act(save,{type:'jobAction',job:'atelier',actionId:'atelier:inspect'});
 const before={food:frontierState(save).food,xp:save.xp,shards:save.shards};
 assert.throws(()=>act(save,{type:'jobAbandon',id:'garden'}));
 save=act(save,{type:'jobAbandon',id:'atelier'});const home=frontierState(save);
 assert.equal(home.activeJob,null);assert.deepEqual(home.jobProgress,[]);assert.equal(home.jobStage,0);
 assert.deepEqual({food:home.food,xp:save.xp,shards:save.shards},before);assert.deepEqual(home.completedJobs,[]);
 assert.throws(()=>act(save,{type:'jobDone',id:'atelier'}));
 save=act(save,{type:'jobAccept',id:'atelier'});assert.equal(frontierState(save).food,before.food-1);
});

test('old saves preserve remembered completed contracts and reject unknown IDs',()=>{
 const save=arrival();save.adventure.frontier.france={...frontierState(save),jobs:['garden'],completedJobs:['bad','garden','garden']};
 const home=frontierState(restart(save));assert.deepEqual(home.completedJobs,['garden']);
 assert.equal(franceDistrictState(home).basketPrice,4);
});

test('four residents expose work and home locations plus only memories of completed contracts',()=>{
 const day=franceResidentItems({},12),night=franceResidentItems({},23);
 assert.equal(day.length,4);assert.equal(new Set(day.map(npc=>npc.id)).size,4);
 for(const npc of day){assert.ok(Number.isFinite(npc.x));assert.ok(npc.actions.includes('talk'));const off=night.find(n=>n.id===npc.id);assert.notDeepEqual([npc.x,npc.z],[off.x,off.z]);}
 assert.equal(franceResidentState('unknown'),null);
 assert.deepEqual(franceResidentState('malik',{completedJobs:['garden']}).helped,[]);
 assert.match(franceResidentState('malik',{completedJobs:['route_repair']}).text,/route cassée/);
});
