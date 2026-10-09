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

test('an older tab cannot replay consent after withdrawal and a new explicit opt-in remembers only future events',async t=>{
 const descriptors=Object.fromEntries(['localStorage','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of Object.keys(descriptors)){Object.defineProperty(globalThis,key,{value:storage(),configurable:true,writable:true});t.after(()=>descriptors[key]?Object.defineProperty(globalThis,key,descriptors[key]):delete globalThis[key]);}
 const uid='world-memory-revision-test',receipts=new Map(),requests=[];let canonical=blankSave();
 t.mock.method(authClient.auth,'getSession',async()=>({data:{session:{user:{id:uid},access_token:'test-only'}}}));
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  const body=JSON.parse(options.body);requests.push(body);let sequence=receipts.get(body.device)||0;const rejected=[];
  for(const entry of body.commands){if(entry.seq<=sequence)continue;assert.equal(entry.seq,sequence+1);try{canonical=applyWorldAction(canonical,entry.action);}catch(error){rejected.push({seq:entry.seq,message:error.message});}sequence=entry.seq;}
  receipts.set(body.device,sequence);return new Response(JSON.stringify({data:canonical,sequence,rejected}));
 });
 const a=await import('../src/world/save.js?tab=memory-revision-a');let sa=(await a.loadWorld(uid)).data;
 for(const action of [{type:'invisibleMemoryConsent',enabled:true},{type:'invisibleStart'},{type:'invisibleAnswer',id:'rive',answer:'reflet'}])sa=a.recordWorldAction(uid,sa,action);
 sa=(await a.saveWorld(uid,sa)).data;assert.equal(canonical.invisible.memoryRevision,1);assert.equal(canonical.invisible.memory.length,2);
 const sessionA=sessionStorage;globalThis.sessionStorage=storage();
 const b=await import('../src/world/save.js?tab=memory-revision-b');let sb=(await b.loadWorld(uid)).data;
 // This consent and discovery remain offline in tab B until after tab A forgets.
 sb=b.recordWorldAction(uid,sb,{type:'invisibleMemoryConsent',enabled:true});
 sb=b.recordWorldAction(uid,sb,{type:'invisibleAnswer',id:'balance',answer:'balance'});
 globalThis.sessionStorage=sessionA;sa=a.recordWorldAction(uid,sa,{type:'invisibleForget'});
 sa=(await a.saveWorld(uid,sa)).data;assert.equal(canonical.invisible.memoryRevision,2);assert.equal(canonical.invisible.memoryConsent,false);assert.deepEqual(canonical.invisible.memory,[]);
 const recovered=await b.saveWorld(uid,sb);sb=recovered.data;
 assert.match(recovered.message,/autre appareil/);assert.equal(recovered.pending,false);
 assert.equal(canonical.invisible.memoryConsent,false);assert.equal(canonical.invisible.memoryRevision,2);assert.deepEqual(canonical.invisible.memory,[]);assert.deepEqual(canonical.invisible.solved,['rive','balance']);
 const staleActivation=requests.flatMap(row=>row.commands).find(row=>row.action.type==='invisibleMemoryConsent'&&row.action.expectedMemoryRevision===1);assert.ok(staleActivation,'The journal freezes the revision observed when consent was entered');
 await b.saveWorld(uid,sb);assert.equal(canonical.invisible.memoryRevision,2,'An acknowledged command replay does not bump the revision');
 sb=b.recordWorldAction(uid,sb,{type:'invisibleMemoryConsent',enabled:true});
 sb=b.recordWorldAction(uid,sb,{type:'invisibleAnswer',id:'preuve',answer:'preuve'});
 sb=(await b.saveWorld(uid,sb)).data;
 assert.equal(canonical.invisible.memoryRevision,3);assert.equal(canonical.invisible.memoryConsent,true);assert.deepEqual(canonical.invisible.memory.map(row=>row.kind),['riddle:preuve']);
 // Withdrawal from the older visible revision in A must still be honored.
 sa=a.recordWorldAction(uid,sa,{type:'invisibleMemoryConsent',enabled:false});
 sa=(await a.saveWorld(uid,sa)).data;assert.equal(sa.invisible.memoryRevision,4);assert.equal(sa.invisible.memoryConsent,false);assert.deepEqual(sa.invisible.memory,[]);
 await a.saveWorld(uid,sa);assert.equal(canonical.invisible.memoryRevision,4);
});
