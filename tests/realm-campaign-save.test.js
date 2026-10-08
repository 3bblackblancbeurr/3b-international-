import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {campaignSnapshot} from '../src/world/campaign-runtime.js';
import {authClient} from '../src/loyalty/client.js';
const uid='00000000-0000-4000-8000-000000000081',session='00000000-0000-4000-8000-000000000082',device='00000000-0000-4000-8000-000000000083';
const bearer='header.'+btoa(JSON.stringify({session_id:session}))+'.signature';
const storage=()=>{const map=new Map();return{get length(){return map.size;},key:i=>[...map.keys()][i],getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)};};
function server({conflict=false}={}){
 let handler,data=blankSave(),revision=0,commits=0;const sequences=new Map(),rewards=new Map(),batches=[];
 const source=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,'');
 const fetch=async(url,options={})=>{
  const u=new URL(url),body=options.body?JSON.parse(options.body):null,path=u.pathname;
  if(path==='/auth/v1/user')return Response.json({id:uid});
  if(path.endsWith('/loyalty_session_valid')||path.endsWith('/loyalty_rate'))return Response.json(true);
  if(path==='/rest/v1/member_world_state')return Response.json([{user_id:uid,data,revision,walk_baseline:0,created_at:'2026-01-01T00:00:00Z',legacy:false}]);
  if(path==='/rest/v1/member_world_devices')return Response.json([{sequence:sequences.get(u.searchParams.get('device')?.slice(3))||0}]);
  if(path.endsWith('/world_commit_v2')){
   commits++;if(conflict){conflict=false;revision++;return Response.json(false);}
   if(body.p_revision!==revision)return Response.json(false);
   data=normalizeSave(body.p_data);revision++;sequences.set(body.p_device,body.p_sequence);
   for(const reward of body.p_rewards||[])rewards.set(reward.rewardCode+':'+reward.eventId,reward);
   return Response.json(true);
  }
  if(path.endsWith('/threeb_process_reward_outbox_server'))return Response.json({processed:rewards.size});
  throw Error('Unexpected endpoint '+path);
 };
 runInNewContext(transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code,{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://realm.test':'test-only'},serve:fn=>{handler=fn}},fetch,Response,AbortSignal,TextDecoder,atob,Error,applyWorldAction,blankSave,normalizeSave,worldGlobalRewardIntents});
 const request=async(commands,sender=device)=>{batches.push(commands.length);return handler(new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer '+bearer,'content-type':'application/json',origin:'https://3b-international.vercel.app'},body:JSON.stringify({device:sender,commands})}));};
 return{request,get data(){return data;},get commits(){return commits;},get revision(){return revision;},sequences,rewards,batches};
}
function journalEscort(record){
 let data=record(blankSave(),{type:'visit',region:'algerie'});
 const action=(operation='interact',extra={})=>{const c=campaignSnapshot(data,'algerie');data=record(data,{type:'campaignAction',region:'algerie',objective:c.objective,operation,position:c.target,...extra});};
 action();action('interact',{choice:'entendre'});action();const id=campaignSnapshot(data).objective;
 for(let n=0;n<400&&campaignSnapshot(data).objective===id;n++){const c=campaignSnapshot(data);action('tick',{tick:c.tick+1});}
 assert.notEqual(campaignSnapshot(data).objective,id);action();assert.equal(data.adventure.campaigns.algerie.phase,2);return data;
}

test('actual account CAS handler retries a conflict, persists a long 10Hz escort in 100-command batches and deduplicates receipts',async()=>{
 const endpoint=server({conflict:true}),commands=[];const local=journalEscort((save,action)=>{commands.push({seq:commands.length+1,action});return applyWorldAction(save,action);});
 assert.ok(commands.length>100);assert.ok(commands.every(entry=>JSON.stringify(entry.action).length<1000));
 for(let i=0;i<commands.length;i+=100){const response=await endpoint.request(commands.slice(i,i+100));assert.equal(response.status,200);const receipt=await response.json();assert.deepEqual(receipt.rejected,[]);assert.equal(receipt.sequence,Math.min(commands.length,i+100));}
 assert.ok(endpoint.commits>endpoint.batches.length,'one failed CAS is retried against the new revision');
 assert.deepEqual(endpoint.data.adventure.campaigns.algerie,local.adventure.campaigns.algerie);assert.equal(endpoint.data.xp,local.xp);
 const commits=endpoint.commits,revision=endpoint.revision,xp=endpoint.data.xp;const replay=await endpoint.request(commands.slice(-100));assert.equal(replay.status,200);assert.equal(endpoint.commits,commits);assert.equal(endpoint.revision,revision);assert.equal(endpoint.data.xp,xp);
});

test('lost response after commit and a fresh tab retain escort clocks, inventory and exactly-once phase rewards',async t=>{
 for(const key of ['localStorage','sessionStorage']){const before=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value:storage(),configurable:true});t.after(()=>before?Object.defineProperty(globalThis,key,before):delete globalThis[key]);}
 const endpoint=server();let cut=false;
 t.mock.method(authClient.auth,'getSession',async()=>({data:{session:{user:{id:uid},access_token:bearer}}}));
 t.mock.method(globalThis,'fetch',async(_url,options)=>{const body=JSON.parse(options.body),response=await endpoint.request(body.commands,body.device);if(cut){cut=false;throw Error('Lost response after successful commit');}return response;});
 const first=await import('../src/world/save.js?realm-escort=first');await first.loadWorld(uid);
 const local=journalEscort((save,action)=>first.recordWorldAction(uid,save,action));assert.ok(first.worldSaveStatus(uid).pendingCount>100);
 cut=true;assert.equal((await first.saveWorld(uid,local)).pending,true);assert.ok(first.worldSaveStatus(uid).pendingCount>100,'no unreceived receipt may truncate the local journal');
 const secondSession=storage();Object.defineProperty(globalThis,'sessionStorage',{value:secondSession,configurable:true});
 const second=await import('../src/world/save.js?realm-escort=second');const restored=await second.loadWorld(uid);
 assert.deepEqual(restored.data.adventure.campaigns.algerie,local.adventure.campaigns.algerie);assert.equal(restored.data.xp,local.xp);assert.equal(endpoint.data.xp,local.xp);
 assert.equal(endpoint.data.adventure.campaigns.algerie.claimed.filter(id=>id==='escort').length,1);assert.equal(second.worldSaveStatus(uid).pendingCount,0);assert.ok(endpoint.batches.every(count=>count<=100));
});

test('campaign memory uses the existing unique economy event identity rather than granting a second currency event on replay',()=>{
 const before=blankSave(),after={...before,beacons:['france:0']},action={type:'campaignAction',region:'france',objective:'france:memory:memory0'};
 assert.deepEqual(worldGlobalRewardIntents(before,after,action),[{rewardCode:'world_memory',eventId:'memory:france:0',source:'world'}]);
 assert.deepEqual(worldGlobalRewardIntents(after,after,action),[]);
});
