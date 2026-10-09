import test from 'node:test';
import assert from 'node:assert/strict';
import {blankSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {invisibleEpisodeProgress} from '../src/world/invisible/progression.js';
import {authClient} from '../src/loyalty/client.js';

function storage(){
 const entries=new Map();
 return {get length(){return entries.size;},key:index=>[...entries.keys()][index],getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)};
}
async function harness(t,name,activeEpisode='alger-001'){
 for(const key of ['localStorage','sessionStorage']){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
  Object.defineProperty(globalThis,key,{value:storage(),configurable:true,writable:true});
  t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key]);
 }
 const uid='invisible-save-'+name,requests=[],receipts=new Map();
 let canonical=applyWorldAction(blankSave(),{type:'invisibleSelectEpisode',episodeId:activeEpisode});
 t.mock.method(authClient.auth,'getSession',async()=>({data:{session:{user:{id:uid},access_token:'test-only'}}}));
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  const body=JSON.parse(options.body);requests.push(body);
  let sequence=receipts.get(body.device)||0;const rejected=[];
  for(const entry of body.commands){
   if(entry.seq<=sequence)continue;assert.equal(entry.seq,sequence+1);
   try{canonical=applyWorldAction(canonical,entry.action);}catch(error){rejected.push({seq:entry.seq,message:error.message});}
   sequence=entry.seq;
  }
  receipts.set(body.device,sequence);
  return new Response(JSON.stringify({data:canonical,sequence,rejected}));
 });
 return {uid,requests,get canonical(){return canonical;},select(id){canonical=applyWorldAction(canonical,{type:'invisibleSelectEpisode',episodeId:id});},
  async api(){return import('../src/world/save.js?invisible-campaign='+name);},
  pending(){const key=Array.from({length:localStorage.length},(_,index)=>localStorage.key(index)).find(key=>key.startsWith('3b_world_actions_v2_'+uid));return key?JSON.parse(localStorage.getItem(key)).pending:[];},
 };
}
const legacyFranceCommands=[{seq:1,action:{type:'invisibleStart'}},{seq:2,action:{type:'invisibleAnswer',id:'rive',answer:'reflet'}}];

test('a persisted legacy current-tab journal resumes France even when the server selects Alger',async t=>{
 const h=await harness(t,'legacy-own');
 sessionStorage.setItem('3b_world_tab_'+h.uid,'legacy-own-device');
 localStorage.setItem('3b_world_actions_v2_'+h.uid+'_legacy-own-device',JSON.stringify({device:'legacy-own-device',next:3,pending:legacyFranceCommands}));
 const api=await h.api(),result=await api.loadWorld(h.uid);
 assert.equal(result.needsSave,false);assert.equal(result.data.invisible.activeEpisode,'alger-001');
 assert.deepEqual(result.data.invisible.solved,['rive']);assert.equal(result.data.invisible.started,true);
 assert.deepEqual(invisibleEpisodeProgress(result.data.invisible,'alger-001'),{started:false,solved:[],chestOpened:false,portalOpened:false});
 const commands=h.requests.flatMap(request=>request.commands);
 assert.equal(commands.length,2);assert.equal(commands.every(entry=>entry.action.episodeId==='leman-001'),true);
 assert.equal(h.canonical.xp,blankSave().xp);
});

test('an abandoned legacy tab journal is recovered as France independently of the active episode',async t=>{
 const h=await harness(t,'legacy-abandoned','rome-001');
 sessionStorage.setItem('3b_world_tab_'+h.uid,'new-tab-device');
 localStorage.setItem('3b_world_actions_v2_'+h.uid+'_abandoned-device',JSON.stringify({device:'abandoned-device',next:3,pending:legacyFranceCommands}));
 const api=await h.api();let result=await api.loadWorld(h.uid);
 assert.equal(result.needsSave,false);assert.equal(result.data.invisible.activeEpisode,'rome-001');
 assert.deepEqual(result.data.invisible.solved,['rive']);assert.equal(invisibleEpisodeProgress(result.data.invisible,'rome-001').started,false);
 const recovered=h.requests.find(request=>request.device==='abandoned-device');
 assert.equal(recovered.commands.every(entry=>entry.action.episodeId==='leman-001'),true);
 assert.equal(localStorage.getItem('3b_world_ack_v2_'+h.uid+'_abandoned-device'),'2');
 result=await api.loadWorld(h.uid);
 assert.deepEqual(result.data.invisible.solved,['rive']);
 assert.equal(h.requests.filter(request=>request.device==='abandoned-device').length,1,'A recovered receipt prevents replaying another tab’s acknowledged journal');
});

test('new journal actions freeze Alger before a different device selects Rome on the server',async t=>{
 const h=await harness(t,'freeze-new'),api=await h.api();
 let local=(await api.loadWorld(h.uid)).data;
 local=api.recordWorldAction(h.uid,local,{type:'invisibleStart'});
 local=api.recordWorldAction(h.uid,local,{type:'invisibleAnswer',id:'corde',answer:'corde'});
 assert.equal(h.pending().every(entry=>entry.action.episodeId==='alger-001'),true);
 h.select('rome-001');
 const result=await api.saveWorld(h.uid,local);
 assert.equal(result.pending,false);assert.equal(result.data.invisible.activeEpisode,'rome-001');
 assert.deepEqual(invisibleEpisodeProgress(result.data.invisible,'alger-001').solved,['corde']);
 assert.equal(invisibleEpisodeProgress(result.data.invisible,'rome-001').started,false);
 assert.equal(result.data.invisible.started,false);assert.deepEqual(result.data.invisible.solved,[]);
 const submitted=h.requests.flatMap(request=>request.commands);
 assert.equal(submitted.length,2);assert.equal(submitted.every(entry=>entry.action.episodeId==='alger-001'),true);
 const replay=await api.saveWorld(h.uid,result.data);
 assert.equal(replay.pending,false);assert.deepEqual(invisibleEpisodeProgress(replay.data.invisible,'alger-001').solved,['corde']);
});

test('a supplied episode ID is preserved while its journal is recovered by a fresh tab',async t=>{
 const h=await harness(t,'explicit-id'),api=await h.api();
 let local=(await api.loadWorld(h.uid)).data;
 local=api.recordWorldAction(h.uid,local,{type:'invisibleStart',episodeId:'leman-001'});
 local=api.recordWorldAction(h.uid,local,{type:'invisibleAnswer',episodeId:'leman-001',id:'rive',answer:'reflet'});
 assert.equal(h.pending().every(entry=>entry.action.episodeId==='leman-001'),true);
 h.select('tallinn-001');globalThis.sessionStorage=storage();
 const other=await import('../src/world/save.js?invisible-campaign=explicit-id-other'),result=await other.loadWorld(h.uid);
 assert.equal(result.data.invisible.activeEpisode,'tallinn-001');assert.deepEqual(result.data.invisible.solved,['rive']);
 assert.equal(invisibleEpisodeProgress(result.data.invisible,'alger-001').started,false);
 assert.equal(invisibleEpisodeProgress(result.data.invisible,'tallinn-001').started,false);
 assert.equal(result.data.xp,blankSave().xp);
});
