import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {authClient} from '../src/loyalty/client.js';
function storage(){const entries=new Map();return{get length(){return entries.size;},key:i=>[...entries.keys()][i],getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k),clear:()=>entries.clear()};}
test('account journals recover offline actions across tabs and retain actions made during sync',async t=>{
 Object.defineProperty(globalThis,'localStorage',{value:storage(),configurable:true});Object.defineProperty(globalThis,'sessionStorage',{value:storage(),configurable:true,writable:true});
 const uid='world-sync-test',receipts=new Map();let canonical=blankSave(),offline=false,block=null,started=null;
 t.mock.method(authClient.auth,'getSession',async()=>({data:{session:{user:{id:uid},access_token:'test-only'}}}));
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  if(offline)throw Error('Network offline');if(block){started();await block;}
  const body=JSON.parse(options.body);let seq=receipts.get(body.device)||0;const rejected=[];
  for(const entry of body.commands){if(entry.seq<=seq)continue;assert.equal(entry.seq,seq+1,'No sequence gaps');try{canonical=applyWorldAction(canonical,entry.action);}catch(e){rejected.push({seq:entry.seq,message:e.message});}seq=entry.seq;}
  receipts.set(body.device,seq);return new Response(JSON.stringify({data:canonical,sequence:seq,rejected}),{status:200});
 });
 const a=await import('../src/world/save.js?tab=a');let s=(await a.loadWorld(uid)).data;s=a.recordWorldAction(uid,s,{type:'visit',region:'france'});s=a.recordWorldAction(uid,s,{type:'help'});
 offline=true;assert.equal((await a.saveWorld(uid,s)).pending,true);const xp=s.xp;
 // Opening a new tab recovers the first tab's unsubmitted journal without stealing its sequence.
 offline=false;const sessionA=sessionStorage;globalThis.sessionStorage=storage();const b=await import('../src/world/save.js?tab=b');let sb=(await b.loadWorld(uid)).data;assert.equal(sb.xp,xp);sb=b.recordWorldAction(uid,sb,{type:'power',power:'ally'});await b.saveWorld(uid,sb);assert.equal(receipts.size,2);
 globalThis.sessionStorage=sessionA;s=(await a.loadWorld(uid)).data;assert.equal(s.adventure.chapters.france.powers.length,1);assert.equal(s.xp,xp+20);
 let release;block=new Promise(resolve=>{release=resolve;});const requestStarted=new Promise(resolve=>{started=resolve;});
 s=a.recordWorldAction(uid,s,{type:'power',power:'ambiance'});const syncing=a.saveWorld(uid,s);await requestStarted;
 s=a.recordWorldAction(uid,s,{type:'power',power:'terrain'});release();const result=await syncing;block=null;assert.equal(result.pending,true);assert.equal(result.data.adventure.chapters.france.powers.length,3);
 const final=await a.saveWorld(uid,result.data);assert.equal(final.pending,false);assert.equal(final.data.xp,xp+60);assert.equal(canonical.adventure.chapters.france.powers.length,3);
 // A further fresh tab replays no already acknowledged rewards.
 globalThis.sessionStorage=storage();const c=await import('../src/world/save.js?tab=c');const recovered=await c.loadWorld(uid);assert.equal(recovered.data.xp,xp+60);assert.equal(recovered.data.adventure.chapters.france.powers.length,3);
 let long=recovered.data;for(let n=0;n<251;n++)long=c.recordWorldAction(uid,long,{type:'walk',metres:1});
 const drained=await c.saveWorld(uid,long);assert.equal(drained.pending,false);assert.equal(drained.data.walked,long.walked,'One sync drains multiple batches without losing new commands');
 delete globalThis.localStorage;delete globalThis.sessionStorage;
});
