import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave,normalizeSave,nearestInteraction} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {frontierState} from '../src/world/frontier.js';
import {residentSchedule} from '../src/world/resident-schedule.js';
import {COUNTRIES} from '../src/world/catalog.js';

test('deliveries debit provisions, survive reload, reward once and stay specific to each country',()=>{
 for(const {id:region} of COUNTRIES){
  let s=applyWorldAction(blankSave(),{type:'visit',region}),before=frontierState(s,region);
  assert.throws(()=>applyWorldAction(s,{type:'jobDone',id:'atelier'}));
  s=applyWorldAction(s,{type:'jobAccept',id:'atelier'});s=normalizeSave(s);
  assert.equal(frontierState(s,region).food,before.food-1);
  assert.throws(()=>applyWorldAction(s,{type:'jobAccept',id:'garden'}));
  s=applyWorldAction(s,{type:'jobDone',id:'atelier'});
  assert.equal(frontierState(s,region).wood,before.wood+2);
  assert.equal(frontierState(s,region).stone,before.stone+1);
  assert.throws(()=>applyWorldAction(s,{type:'jobDone',id:'atelier'}));
  assert.throws(()=>applyWorldAction(s,{type:'jobAccept',id:'atelier'}));
  s=applyWorldAction(s,{type:'jobAccept',id:'garden'});
  s=applyWorldAction(s,{type:'jobDone',id:'garden'});
  assert.equal(frontierState(s,region).food,before.food+1);
 }
});
test('an active delivery takes precedence over the shop at the same doorway',()=>{
 const shop={type:'atelier',x:0,z:0},job={type:'job',x:0,z:0,range:5};
 assert.equal(nearestInteraction({x:0,z:1},[shop,job]),job);
 assert.equal(nearestInteraction({x:0,z:5.2},[shop,job]),shop);
});
test('residents follow streets, pause to work, then return without a teleport',()=>{
 const route={points:[{x:0,z:0},{x:10,z:0},{x:10,z:10}],lengths:[10,10],total:20,speed:2,offset:0};
 assert.deepEqual(residentSchedule(route,5).position,{x:10,z:0});
 assert.equal(residentSchedule(route,12,'artisan').activity,'Work');
 assert.deepEqual(residentSchedule(route,12,'artisan').position,{x:10,z:10});
 assert.equal(residentSchedule(route,20,'artisan').moving,true);
 assert.deepEqual(residentSchedule(route,20,'artisan').position,{x:10,z:6});
 assert.deepEqual(residentSchedule(route,36,'artisan').position,{x:0,z:0});
});
