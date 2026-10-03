import test from 'node:test';import assert from 'node:assert/strict';
import {rememberCityCommand,pendingCityCommand,forgetCityCommand,cityCommandCommitted,cityCommandBlocked} from '../src/city/city3b-recovery.js';
import {sendCityRequest} from '../src/city/city3b-transport.js';
import {createCityRequestGate} from '../src/city/city3b-request-gate.js';
const user='00000000-0000-4000-8000-000000000001',save='00000000-0000-4000-8000-000000000002';
test('new maps in all three slots pass recovery without dereferencing a missing command',()=>{
 for(const slot of [1,2,3])assert.equal(cityCommandBlocked(null,'create',{slot,map:'hills',name:'Collines'}),false);
 const body={saveId:save,slot:1,building:'HOME_ORIGIN'},pending={action:'place',body};
 assert.equal(cityCommandBlocked(pending,'create',{slot:2,map:'hills'}),false);
 assert.equal(cityCommandBlocked(pending,'place',body),false);
 assert.equal(cityCommandBlocked(pending,'place',{...body,building:'CITY_HALL_3B'}),true);
 assert.equal(cityCommandBlocked(pending,'snapshot',{saveId:save,slot:1}),false);
 assert.equal(cityCommandBlocked(pending,'place',{...body,saveId:user}),false);
});
test('uncertain commands survive restart, retain identity and remain isolated by account and save',()=>{
 const map=new Map(),storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k),removeItem:k=>map.delete(k)};
 const body={saveId:save,slot:2,request:'request-original',building:'HOME_ORIGIN'};
 rememberCityCommand(storage,user,'place',body,100);const pending=pendingCityCommand(storage,user,save,101);
 assert.equal(pending.body.request,'request-original');assert.equal(pendingCityCommand(storage,save,save,101),null);
 assert.equal(pendingCityCommand(storage,user,user,101),null);assert.equal(pendingCityCommand(storage,user,save,86400200),null);
 assert.equal(cityCommandCommitted(pending,{city:{city_id:save},placements:[{request_id:'request-original'}]}),true);
 assert.equal(cityCommandCommitted(pending,{city:{city_id:user},placements:[{request_id:'request-original'}]}),false);
 forgetCityCommand(storage,user,save);assert.equal(pendingCityCommand(storage,user,save,101),null);
});
test('read retries once after network failure; writes never retry automatically after a lost confirmation',async()=>{
 let attempts=0;const read=await sendCityRequest('/city',{}, {action:'snapshot',signalFactory:()=>undefined,fetcher:async()=>{if(!attempts++)throw Error('offline');return Response.json({revision:4});}});
 assert.equal(read.revision,4);assert.equal(attempts,2);
 attempts=0;await assert.rejects(sendCityRequest('/city',{}, {action:'place',signalFactory:()=>undefined,fetcher:async()=>{attempts++;throw Error('response lost');}}),e=>e.uncertain===true);
 assert.equal(attempts,1);
});
test('closing the city rejects an old foreground response and releases the gate',async()=>{
 const gate=createCityRequestGate(),accepted=[];let finish;
 const action=gate.run('place',()=>new Promise(r=>finish=r),v=>accepted.push(v));gate.invalidate();finish('old');
 assert.equal(await action,null);assert.deepEqual(accepted,[]);assert.equal(gate.busy,false);
 assert.equal(await gate.run('snapshot',async()=> 'fresh',v=>accepted.push(v)),'fresh');
});
test('a confirmed saved plan resolves its uncertain command; malformed local storage is ignored',()=>{
 assert.equal(cityCommandCommitted({action:'plan_roads',body:{saveId:save,roads:[{id:'road'}]}},{city:{city_id:save,city:{roads:[{id:'road'}]}}}),true);
 assert.equal(pendingCityCommand({getItem:()=>'{bad'},user,save),null);
});

test('reopening starts a fresh request without an old completion releasing its gate',async()=>{
 const gate=createCityRequestGate();let endOld,endNew;let accepted=[];
 const old=gate.run('snapshot',()=>new Promise(r=>endOld=r),v=>accepted.push(v));gate.invalidate();
 const fresh=gate.run('snapshot',()=>new Promise(r=>endNew=r),v=>accepted.push(v));endOld('old');await old;
 assert.equal(gate.busy,true);assert.deepEqual(accepted,[]);endNew('fresh');await fresh;assert.equal(gate.busy,false);assert.deepEqual(accepted,['fresh']);
});
