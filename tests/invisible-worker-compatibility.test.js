import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {applyWorldAction} from '../src/world/engine.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {INVISIBLE_EPISODE,getInvisibleEpisode} from '../src/world/invisible/catalog.js';
import {invisibleEpisodeProgress} from '../src/world/invisible/progression.js';

const uid='00000000-0000-4000-8000-000000000091',session='00000000-0000-4000-8000-000000000092';
const v1Device='00000000-0000-4000-8000-000000000093',v2Device='00000000-0000-4000-8000-000000000094';
const bearer='header.'+btoa(JSON.stringify({session_id:session}))+'.signature';
const entries=(actions,start=1)=>actions.map((action,index)=>({seq:start+index,action}));
const legacyFranceActions=[{type:'invisibleStart'},...INVISIBLE_EPISODE.points.map(point=>({type:'invisibleAnswer',id:point.id,answer:point.riddle.answers[0]})),{type:'invisibleChest'},{type:'invisiblePortal'}];

function worker(){
 let handler,data=blankSave(),revision=0,commits=0,concurrentSelection=null;
 const sequences=new Map(),rewards=new Map();
 const source=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,'');
 const fetch=async(url,options={})=>{
  const u=new URL(url),body=options.body?JSON.parse(options.body):null,path=u.pathname;
  if(path==='/auth/v1/user')return Response.json({id:uid});
  if(path.endsWith('/loyalty_session_valid')||path.endsWith('/loyalty_rate'))return Response.json(true);
  if(path==='/rest/v1/member_world_state')return Response.json([{user_id:uid,data,revision,walk_baseline:0,created_at:'2026-01-01T00:00:00Z',legacy:false}]);
  if(path==='/rest/v1/member_world_devices')return Response.json([{sequence:sequences.get(u.searchParams.get('device')?.slice(3))||0}]);
  if(path.endsWith('/world_commit_v2')){
   commits++;
   if(concurrentSelection){data=applyWorldAction(data,{type:'invisibleSelectEpisode',episodeId:concurrentSelection});concurrentSelection=null;revision++;return Response.json(false);}
   if(body.p_revision!==revision)return Response.json(false);
   data=normalizeSave(body.p_data);revision++;sequences.set(body.p_device,body.p_sequence);
   for(const reward of body.p_rewards||[])rewards.set(reward.rewardCode+':'+reward.eventId,reward);
   return Response.json(true);
  }
  if(path.endsWith('/threeb_process_reward_outbox_server'))return Response.json({processed:rewards.size});
  throw Error('Unexpected endpoint '+path);
 };
 runInNewContext(transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code,{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://invisible-worker.test':'test-only'},serve:fn=>{handler=fn}},fetch,Response,AbortSignal,TextDecoder,atob,Error,applyWorldAction,blankSave,normalizeSave,worldGlobalRewardIntents});
 const request=async(commands,device=v1Device)=>{
  const response=await handler(new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer '+bearer,'content-type':'application/json',origin:'https://3b-international.vercel.app'},body:JSON.stringify({device,commands})}));
  assert.equal(response.status,200);return response.json();
 };
 return {request,rewards,sequences,get data(){return data;},get commits(){return commits;},conflictSelect(id){concurrentSelection=id;}};
}

test('the canonical worker accepts a live v1 Léman tab beside a v2 Alger tab without crossing progress or rewards',async()=>{
 const endpoint=worker(),alger=getInvisibleEpisode('alger-001');
 await endpoint.request(entries([{type:'invisibleSelectEpisode',episodeId:alger.id},{type:'invisibleStart',episodeId:alger.id},{type:'invisibleAnswer',episodeId:alger.id,id:alger.points[0].id,answer:alger.points[0].riddle.answers[0]}]),v2Device);
 const france=await endpoint.request(entries(legacyFranceActions));
 assert.deepEqual(france.rejected,[]);assert.equal(france.sequence,6);assert.equal(france.data.invisible.activeEpisode,alger.id);
 assert.equal(france.data.invisible.portalOpened,true);assert.deepEqual(france.data.invisible.solved,['rive','balance','preuve']);
 assert.deepEqual(invisibleEpisodeProgress(france.data.invisible,alger.id),{started:true,solved:['corde'],chestOpened:false,portalOpened:false});
 assert.equal(france.data.xp-blankSave().xp,120);
 assert.deepEqual([...endpoint.rewards.values()],[{rewardCode:'invisible_fragment',eventId:'invisible:leman-001',source:'world'}]);
 const explicit=alger.points.slice(1).map(point=>({type:'invisibleAnswer',episodeId:alger.id,id:point.id,answer:point.riddle.answers[0]})).concat({type:'invisibleChest',episodeId:alger.id},{type:'invisiblePortal',episodeId:alger.id});
 const both=await endpoint.request(entries(explicit,4),v2Device);
 assert.deepEqual(both.rejected,[]);assert.equal(both.data.invisible.activeEpisode,alger.id);
 assert.equal(invisibleEpisodeProgress(both.data.invisible,alger.id).portalOpened,true);assert.equal(both.data.invisible.portalOpened,true);
 assert.equal(both.data.xp-blankSave().xp,240);assert.equal(both.data.shards-blankSave().shards,60);
 assert.deepEqual([...endpoint.rewards.values()],[{rewardCode:'invisible_fragment',eventId:'invisible:leman-001',source:'world'},{rewardCode:'invisible_fragment_algerie',eventId:'invisible:alger-001',source:'world'}]);
 const commits=endpoint.commits,replayed=await endpoint.request(entries(legacyFranceActions));
 assert.deepEqual(replayed.rejected,[]);assert.equal(endpoint.commits,commits);assert.equal(replayed.data.xp,both.data.xp);assert.equal(endpoint.rewards.size,2);
});

test('legacy France commands remain bound during a CAS retry after another device selects Rome',async()=>{
 const endpoint=worker();
 await endpoint.request(entries([{type:'invisibleSelectEpisode',episodeId:'alger-001'}]),v2Device);
 endpoint.conflictSelect('rome-001');const before=endpoint.commits;
 const result=await endpoint.request(entries(legacyFranceActions));
 assert.equal(endpoint.commits-before,2);assert.deepEqual(result.rejected,[]);
 assert.equal(result.data.invisible.activeEpisode,'rome-001');assert.equal(result.data.invisible.portalOpened,true);
 assert.equal(invisibleEpisodeProgress(result.data.invisible,'rome-001').started,false);assert.equal(invisibleEpisodeProgress(result.data.invisible,'alger-001').started,false);
 assert.equal(result.data.xp-blankSave().xp,120);assert.equal(endpoint.rewards.size,1);
 assert.deepEqual([...endpoint.rewards.values()],[{rewardCode:'invisible_fragment',eventId:'invisible:leman-001',source:'world'}]);
});

test('the boundary preserves explicit episode IDs, rejects invalid IDs, and leaves reducer defaults active',async()=>{
 const endpoint=worker();
 await endpoint.request(entries([{type:'invisibleSelectEpisode',episodeId:'alger-001'}]),v2Device);
 const invalid=await endpoint.request(entries([{type:'invisibleStart',episodeId:'unknown-001'},{type:'invisibleSelectEpisode'}]));
 assert.equal(invalid.rejected.length,2);assert.equal(invalid.data.invisible.started,false);assert.equal(invisibleEpisodeProgress(invalid.data.invisible,'alger-001').started,false);
 assert.equal(endpoint.rewards.size,0);
 const explicit=await endpoint.request(entries([{type:'invisibleStart',episodeId:'rome-001'}],3));
 assert.deepEqual(explicit.rejected,[]);assert.equal(explicit.data.invisible.activeEpisode,'alger-001');
 assert.equal(invisibleEpisodeProgress(explicit.data.invisible,'rome-001').started,true);assert.equal(explicit.data.invisible.started,false);
 const local=applyWorldAction(explicit.data,{type:'invisibleStart'});
 assert.equal(local.invisible.started,false);assert.equal(invisibleEpisodeProgress(local.invisible,'alger-001').started,true,'Pure reducer defaults still target the selected episode');
 const legacyNull=await endpoint.request(entries([{type:'invisibleStart',episodeId:null}],4));
 assert.deepEqual(legacyNull.rejected,[]);assert.equal(legacyNull.data.invisible.started,true);assert.equal(invisibleEpisodeProgress(legacyNull.data.invisible,'alger-001').started,false);
});
