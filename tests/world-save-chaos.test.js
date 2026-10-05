import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {authClient} from '../src/loyalty/client.js';

function storage(){
 const entries=new Map();
 return {get length(){return entries.size;},key:i=>[...entries.keys()][i],getItem:k=>entries.get(k)||null,
  setItem(k,v){entries.set(k,String(v));},removeItem:k=>entries.delete(k)};
}
async function harness(t,name){
 for(const key of ['localStorage','sessionStorage']){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value:storage(),configurable:true});
  t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);
 }
 const uid='chaos-'+name,receipts=new Map();let data=blankSave(),intercept=null,calls=0;
 t.mock.method(authClient.auth,'getSession',async()=>({data:{session:{user:{id:uid},access_token:'test-only'}}}));
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  calls++;const {device,commands}=JSON.parse(options.body);
  if(intercept)return intercept({device,commands});
  let sequence=receipts.get(device)||0;
  for(const entry of commands){if(entry.seq<=sequence)continue;assert.equal(entry.seq,sequence+1);data=applyWorldAction(data,entry.action);sequence=entry.seq;}
  receipts.set(device,sequence);
  return new Response(JSON.stringify({data,sequence}));
 });
 const api=await import('../src/world/save.js?chaos='+name);
 return {uid,api,get data(){return data;},get calls(){return calls;},set intercept(fn){intercept=fn;},pending(){const k=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)).find(k=>k.startsWith('3b_world_actions_v2_'));return k?JSON.parse(localStorage.getItem(k)).pending:[];}};
}

test('incomplete or stale success responses never acknowledge offline progress or loop',async t=>{
 const h=await harness(t,'receipts');let local=(await h.api.loadWorld(h.uid)).data;
 local=h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'});
 const journal=h.pending();
 for(const invalid of [{},{sequence:1},{sequence:0,data:blankSave()},{sequence:NaN,data:blankSave()},{sequence:1,data:{}},
  {sequence:1,data:{seals:[],adventure:{}}},{sequence:1,data:{...blankSave(),version:2}},
  {sequence:1,data:{...blankSave(),adventure:[]}}]){
  h.intercept=()=>new Response(JSON.stringify(invalid));const calls=h.calls;
  const result=await h.api.saveWorld(h.uid,local);
  assert.equal(result.pending,true);assert.match(result.message,/journal|Journal/);
  assert.equal(h.calls,calls+1);assert.deepEqual(h.pending(),journal);
 }
 h.intercept=null;const recovered=await h.api.saveWorld(h.uid,local);
 assert.equal(recovered.pending,false);assert.equal(recovered.data.region,'france');assert.equal(recovered.data.xp,local.xp);
});

test('loss of the response after a server commit retries without granting rewards twice',async t=>{
 const h=await harness(t,'lost-response');let local=(await h.api.loadWorld(h.uid)).data;
 local=h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'});
 local=h.api.recordWorldAction(h.uid,local,{type:'help'});
 const workingFetch=globalThis.fetch;let cut=true;
 t.mock.method(globalThis,'fetch',async(...args)=>{const result=await workingFetch(...args);if(cut){cut=false;throw Error('Connection lost after commit');}return result;});
 assert.equal((await h.api.saveWorld(h.uid,local)).pending,true);
 assert.equal(h.pending().length,2);assert.equal(h.data.xp,local.xp);
 const retry=await h.api.saveWorld(h.uid,local);
 assert.equal(retry.pending,false);assert.equal(retry.data.xp,local.xp);assert.equal(h.pending().length,0);
});

test('local quota failure retains acknowledged commands until the snapshot is durable',async t=>{
 const h=await harness(t,'quota');let local=(await h.api.loadWorld(h.uid)).data;
 local=h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'});
 local=h.api.recordWorldAction(h.uid,local,{type:'help'});
 const set=localStorage.setItem.bind(localStorage);let full=true;
 t.mock.method(localStorage,'setItem',(key,value)=>{if(full&&key==='3b_world_v1_'+h.uid)throw Error('Quota exceeded');set(key,value);});
 assert.equal((await h.api.saveWorld(h.uid,local)).pending,true);assert.equal(h.pending().length,2);
 full=false;const retry=await h.api.saveWorld(h.uid,local);
 assert.equal(retry.pending,false);assert.equal(retry.data.xp,local.xp);assert.equal(h.pending().length,0);
 assert.equal(h.api.readLocal(h.uid).data.xp,local.xp);
});

test('a failed journal write rolls back the sequence and an optional backup never blocks recovery',async t=>{
 const h=await harness(t,'journal-quota');let local=(await h.api.loadWorld(h.uid)).data;
 const set=localStorage.setItem.bind(localStorage);let full=true;
 t.mock.method(localStorage,'setItem',(key,value)=>{if(key.endsWith('_before_chapters')||(full&&key.startsWith('3b_world_actions_v2_')))throw Error('Quota exceeded');set(key,value);});
 assert.throws(()=>h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'}),/journal/);
 full=false;local=h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'});
 assert.equal(h.pending()[0].seq,1);
 const recovered=await h.api.loadWorld(h.uid);assert.equal(recovered.data.region,'france');assert.equal(h.pending().length,0);
});

test('guest actions are refused explicitly when the device cannot save them',async t=>{
 const h=await harness(t,'guest-quota'),before=blankSave();
 t.mock.method(localStorage,'setItem',()=>{throw Error('Quota exceeded');});
 assert.throws(()=>h.api.recordWorldAction(null,before,{type:'visit',region:'france'}),/n’a pas été enregistrée/);
 assert.equal(before.region,'hub');assert.equal(h.api.readLocal(null),null);
});

test('a refresh waits for an ongoing sync and retains new actions submitted during it',async t=>{
 const h=await harness(t,'refresh-race');let local=(await h.api.loadWorld(h.uid)).data;
 local=h.api.recordWorldAction(h.uid,local,{type:'visit',region:'france'});
 const fetchNow=globalThis.fetch;let release,started;
 const wait=new Promise(r=>{release=r;}),began=new Promise(r=>{started=r;});let first=true;
 t.mock.method(globalThis,'fetch',async(...args)=>{if(first){first=false;started();await wait;}return fetchNow(...args);});
 const syncing=h.api.saveWorld(h.uid,local);await began;
 const refresh=h.api.loadWorld(h.uid);
 local=h.api.recordWorldAction(h.uid,local,{type:'help'});release();
 assert.equal((await syncing).data.xp,local.xp);
 const latest=await refresh;assert.equal(latest.data.xp,local.xp);assert.equal(latest.needsSave,false);assert.equal(h.pending().length,0);
});
