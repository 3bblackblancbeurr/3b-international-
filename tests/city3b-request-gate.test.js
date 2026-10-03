import test from 'node:test';
import assert from 'node:assert/strict';
import {createCityRequestGate} from '../src/city/city3b-request-gate.js';
import {cityIsNight} from '../src/city/city3b-environment.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((ok,no)=>{resolve=ok;reject=no;});return{promise,resolve,reject};};

test('a click during a background refresh is accepted and its save wins over the stale response',async()=>{
 const gate=createCityRequestGate(),refresh=deferred(),save=deferred(),accepted=[];
 const background=gate.run('life',()=>refresh.promise,v=>accepted.push(v));
 const foreground=gate.run('place',()=>save.promise,v=>accepted.push(v));
 assert.equal(gate.busy,true);
 assert.equal(await gate.run('place',()=>Promise.reject(Error('duplicate')),()=>{}),null);
 save.resolve('saved');assert.equal(await foreground,'saved');
 refresh.resolve('old');assert.equal(await background,null);
 assert.deepEqual(accepted,['saved']);assert.equal(gate.busy,false);
});
test('a failed refresh releases its slot; a failed save does not block retries',async()=>{
 const gate=createCityRequestGate();
 for(const action of ['life','place']){
  await assert.rejects(gate.run(action,()=>Promise.reject(Error('offline')),()=>{}),/offline/);
  assert.equal(await gate.run(action,()=>Promise.resolve('retry'),()=>{}),'retry');
 }
});
test('automatic night includes the hours after midnight and respects explicit settings',()=>{
 for(const hour of [0,2,6,20,23])assert.equal(cityIsNight({day_mode:'auto'},hour),true);
 for(const hour of [7,12,19])assert.equal(cityIsNight({day_mode:'auto'},hour),false);
 assert.equal(cityIsNight({day_mode:'day'},2),false);
 assert.equal(cityIsNight({day_mode:'night'},12),true);
});
