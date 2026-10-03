import test from 'node:test';import assert from 'node:assert/strict';
import {cityEraseTargets,cityErasePlan} from '../src/city/city3b-erase.js';
const road={id:'a',x1:0,z1:0,x2:30,z2:0,width:4};
const terrain={id:'t',kind:'lake',x1:50,z1:50,x2:50,z2:50,width:24};
const network={...road,id:'n',kind:'power'};
const data={city:{city:{roads:[road],terrain:[terrain],networks:[network]}}};
test('eraser targets any chosen segment or scenery and allows choosing overlapping utilities',()=>{
 const targets=cityEraseTargets(data,{x:10,z:0});assert.equal(targets.length,2);assert.deepEqual(new Set(targets.map(t=>t.kind)),new Set(['roads','networks']));
 const lake=cityEraseTargets(data,{x:55,z:50})[0];assert.equal(lake.label,'Lac');assert.equal(cityErasePlan(data,lake).action,'plan_terrain');assert.equal(cityEraseTargets(data,{x:200,z:100}).length,0);
});
test('erase is one item only, carries authoritative expected plan and rejects stale selection',()=>{
 const target=cityEraseTargets(data,{x:10,z:0}).find(t=>t.kind==='networks'),plan=cityErasePlan(data,target);assert.deepEqual(plan.body,{features:[],expected:[network]});assert.equal(plan.from.length,1);assert.equal(plan.to.length,0);
 assert.equal(cityErasePlan({...data,city:{city:{networks:[{...network,z2:4}]}}},target),null);
});
test('displayed collectibles return to inventory and carry their original placement for undo',()=>{
 const city={displays:[{item_instance_id:'gem',x:10,z:15,rotation:90}]},target=cityEraseTargets(city,{x:10,z:15})[0],plan=cityErasePlan(city,target);assert.equal(plan.action,'remove_display');assert.deepEqual(plan.body,{item:'gem'});assert.equal(plan.from.rotation,90);assert.equal(cityErasePlan({displays:[]},target),null);
});
