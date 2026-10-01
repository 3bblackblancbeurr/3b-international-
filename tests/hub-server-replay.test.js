import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';
import {applyWorldAction} from '../src/world/engine.js';
import {blankSave,normalizeSave} from '../src/world/rules.js';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';
import {normalizeHubDesign} from '../src/world/hub/services-state.js';

const compiled=transformSync(readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code;
function fixture(){
 let handler,data=blankSave(),revision=0,commitCount=0,validSession=true;const receipts=new Map(),rewards=[];
 const result=body=>Response.json(body);
 const fetch=async(url,options={})=>{
  const parsed=new URL(url),body=options.body?JSON.parse(options.body):{};
  if(parsed.pathname==='/auth/v1/user')return result({id:'account-test'});
  if(parsed.pathname.endsWith('/loyalty_session_valid'))return result(validSession);
  if(parsed.pathname.endsWith('/loyalty_rate'))return result(true);
  if(parsed.pathname.endsWith('/threeb_process_reward_outbox_server'))return result({processed:0});
  if(parsed.pathname.endsWith('/world_commit_v2')){
   if(body.p_revision!==revision)return result(false);
   data=normalizeSave(body.p_data);revision++;commitCount++;receipts.set(body.p_device,body.p_sequence);rewards.push(...body.p_rewards);return result(true);
  }
  if(parsed.pathname==='/rest/v1/member_world_state')return result([{data,revision,walk_baseline:0,created_at:'2026-09-01T00:00:00Z',legacy:false}]);
  if(parsed.pathname==='/rest/v1/member_world_devices'){const sequence=receipts.get(parsed.searchParams.get('device')?.slice(3));return result(sequence?[{sequence}]:[]);}
  throw Error('Unexpected server request '+url);
 };
 runInNewContext(compiled,{exports:{},require(name){if(name==='./engine.js')return{applyWorldAction};if(name==='./rules.js')return{blankSave,normalizeSave};if(name==='./global-rewards.js')return{worldGlobalRewardIntents};throw Error('Unexpected import '+name);},Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://db.fixture':'fixture'},serve:callback=>{handler=callback;}},fetch,Request,Response,URL,TextDecoder,AbortSignal,Date,atob});
 const device='00000000-0000-0000-0000-000000000001',token='header.'+Buffer.from(JSON.stringify({session_id:'valid-session-fixture'})).toString('base64url')+'.fixture';
 const request=(commands,{auth=true,origin='https://3b-international.vercel.app'}={})=>handler(new Request('https://db.fixture/functions/v1/world-engine',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...auth?{Authorization:'Bearer '+token}:{}},body:JSON.stringify({device,commands})}));
 return{request,get data(){return data;},get commitCount(){return commitCount;},get rewards(){return rewards;},invalidate(){validSession=false;}};
}

test('real authoritative World handler replays Hub mission, service and textile commands exactly once',async()=>{
 const f=fixture(),design=normalizeHubDesign({kind:'textile',title:'Le Lien',baseColor:'#123456',accentColor:'#d4b574',pattern:'damier',style:'voyageur'});
 const actions=[
  {type:'hubMissionStart',id:'first_steps'},{type:'hubBuildingVisit',id:'heritage_welcome'},
  {type:'hubTransportRide',transport:'train',from:'heritage_square',to:'archives',night:false,dateKey:'2026-09-30'},
  {type:'hubDistrictVisit',id:'heritage_square'},{type:'hubMissionClaim',id:'first_steps'},
  {type:'hubMissionStart',id:'first_foundation'},
  ...['site:survey','path:plan','foundation:place'].map(actionId=>({type:'hubMissionAction',missionId:'first_foundation',actionId})),
  {type:'hubMissionClaim',id:'first_foundation'},{type:'avatar',avatar:{name:'Ari',created:true}},
  {type:'hubService',operation:'saveDesign',design},{type:'hubTextileWear',design},
  {type:'hubService',operation:'saveTribute',name:'Une mémoire',message:'Le lien reste.'},
  {type:'hubService',operation:'careAnimal',animal:'wolf_signal',task:'water'},
 ];
 const commands=actions.map((action,i)=>({seq:i+1,action}));assert.ok(commands.every(entry=>JSON.stringify(entry.action).length<=1000));
 const first=await f.request(commands);assert.equal(first.status,200);const acknowledged=await first.json();assert.deepEqual(acknowledged.rejected,[]);assert.equal(acknowledged.sequence,commands.length);
 assert.equal(f.data.hub.missions.first_foundation.claimed,true);assert.equal(f.data.hub.services.designs.length,1);assert.equal(f.data.hub.services.tributes.length,1);assert.deepEqual(f.data.hub.services.care.wolf_signal,['water']);assert.equal(f.data.adventure.avatar.fabricColor,'#123456');assert.equal(f.commitCount,1);
 const expected=actions.reduce(applyWorldAction,blankSave());expected.updatedAt=f.data.updatedAt;assert.deepEqual(f.data,expected);
 const replay=await f.request(commands);assert.equal(replay.status,200);assert.deepEqual((await replay.json()).data,expected);assert.equal(f.commitCount,1);
 assert.equal(f.rewards.filter(row=>row.eventId==='hub_mission:first_foundation').length,1);
 assert.equal(f.rewards.some(row=>/service|textile/.test(row.eventId)),false,'cosmetic commands cannot mint global rewards');
 const forged=await f.request([{seq:commands.length+1,action:{type:'hubMissionClaim',id:'first_foundation'}}]);assert.equal(forged.status,200);assert.equal((await forged.json()).rejected.length,1);assert.deepEqual(f.data,expected);
});

test('new Hub commands retain authentication, session validity and origin checks',async()=>{
 const f=fixture(),commands=[{seq:1,action:{type:'hubService',operation:'saveTribute',name:'Forger'}}];
 assert.equal((await f.request(commands,{auth:false})).status,401);
 assert.equal((await f.request(commands,{origin:'https://evil.invalid'})).status,403);
 f.invalidate();assert.equal((await f.request(commands)).status,401);assert.equal(f.commitCount,0);assert.equal(f.data.hub.services.tributes.length,0);
});
