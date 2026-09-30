import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';
const UID='00000000-0000-4000-8000-000000000001';
const OTHER='00000000-0000-4000-8000-000000000002';
const SESSION='00000000-0000-4000-8000-000000000004';
const BEARER='header.'+btoa(JSON.stringify({session_id:SESSION}))+'.signature';
const source=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
function endpoint({campaignMissing=false,lifeMissing=false,sessionValid=true,authExpired=false}={}){
 let handler;const calls=[];
 const fetch=async(url,options={})=>{
  const u=new URL(url),body=options.body?JSON.parse(options.body):null;calls.push({path:u.pathname,query:u.search,body});
  if(u.pathname==='/auth/v1/user')return authExpired?Response.json({error:'Expired'},{status:401}):Response.json({id:UID});
  if(u.pathname==='/rest/v1/rpc/loyalty_session_valid')return Response.json(sessionValid);
  if(u.pathname==='/rest/v1/rpc/loyalty_rate')return Response.json(true);
  if(u.pathname==='/rest/v1/rpc/nexus_city_mission_claim')return Response.json({mission:body.p_mission,coins:100,cityXp:200,alreadyClaimed:false});
  if(u.pathname==='/rest/v1/rpc/nexus_city_campaign_snapshot')return campaignMissing?Response.json({message:'Function not found'},{status:404}):Response.json({available:true,missions:[]});
  if(u.pathname==='/rest/v1/rpc/nexus_city_life_snapshot')return lifeMissing?Response.json({message:'Function not found'},{status:404}):Response.json({available:true,population:12,events:[]});
  if(u.pathname==='/rest/v1/rpc/nexus_city_life_action')return Response.json({available:true,population:12,events:[],reward:{event:body.p_value,coins:120,cityXp:250}});
  if(u.pathname==='/rest/v1/nexus_cities')return Response.json([{city_id:'00000000-0000-4000-8000-000000000003',user_id:UID,name:'Ma Ville',land_tier:1,city:{roads:[]}}]);
  if(u.pathname==='/rest/v1/economy_accounts')return Response.json([{coins:600,xp:0}]);
  return Response.json([]);
 };
 runInNewContext(transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code,{Deno:{env:{get:name=>name==='SUPABASE_URL'?'https://city.test':'test-key'},serve:fn=>{handler=fn}},fetch,Response,AbortSignal,TextDecoder,atob,crypto:globalThis.crypto,console});
 const request=body=>handler(new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer '+BEARER,'content-type':'application/json',origin:'https://3b-international.vercel.app'},body:JSON.stringify(body)}));
 return {request,calls};
}
test('mission endpoint uses the authenticated owner and ignores forged coins, XP and completion proofs',async()=>{
 const f=endpoint();const response=await f.request({action:'mission_claim',mission:'foundation_hall',user:OTHER,p_user:OTHER,coins:999999,cityXp:999999,completed:true});
 assert.equal(response.status,200);
 const rpc=f.calls.find(c=>c.path.endsWith('/nexus_city_mission_claim'));
 assert.deepEqual(rpc.body,{p_user:UID,p_mission:'foundation_hall'});
 assert.equal((await response.json()).reward.coins,100);
 assert.ok(f.calls.filter(c=>c.path.endsWith('/nexus_cities')).every(c=>c.query.includes(UID)));
});

test('life commands accept only the authenticated owner and fixed server event rules; revoked sessions cannot advance or claim',async()=>{
 const f=endpoint(),request=crypto.randomUUID();
 const response=await f.request({action:'life_action',command:'event_claim',value:'welcome',request,user:OTHER,population:99999,elapsed:99999,coins:99999});
 assert.equal(response.status,200);assert.equal((await response.json()).reward.coins,120);
 const call=f.calls.find(c=>c.path.endsWith('/nexus_city_life_action'));
 assert.deepEqual(call.body,{p_user:UID,p_action:'event_claim',p_value:'welcome',p_request:request});
 assert.equal((await f.request({action:'life_action',command:'invented',request})).status,400);
 assert.equal((await f.request({action:'life_action',command:'event_claim',value:'welcome',request:'forged'})).status,400);
 const revoked=endpoint({sessionValid:false});assert.equal((await revoked.request({action:'life_action',command:'event_claim',value:'welcome',request})).status,401);
 assert.equal(revoked.calls.filter(c=>c.path.endsWith('/nexus_city_life_action')).length,0);
 const absent=await endpoint({lifeMissing:true}).request({action:'snapshot'});assert.equal((await absent.json()).life.available,false);
});

test('city endpoint limits request bodies before simulation or construction mutations',async()=>{
 const f=endpoint();const response=await f.request({action:'life_action',command:'event_claim',value:'welcome',padding:'x'.repeat(70000)});
 assert.equal(response.status,413);assert.equal(f.calls.filter(c=>c.path.endsWith('/nexus_city_life_action')).length,0);
});
test('malformed mission codes cannot reach the claim RPC and migration unavailability preserves the saved builder',async()=>{
 const f=endpoint({campaignMissing:true});assert.equal((await f.request({action:'mission_claim',mission:"a' OR 1=1"})).status,400);
 assert.equal(f.calls.filter(c=>c.path.endsWith('/nexus_city_mission_claim')).length,0);
 const response=await f.request({action:'snapshot'}),result=await response.json();assert.equal(response.status,200);
 assert.equal(result.city.user_id,UID);assert.equal(result.campaign.available,false);
});
test('road planning rejects short and out-of-bounds construction before persistence',async()=>{
 const f=endpoint();assert.equal((await f.request({action:'plan_roads',roads:[{x1:0,z1:0,x2:2,z2:0}]})).status,400);
 assert.equal((await f.request({action:'plan_roads',roads:[{x1:0,z1:0,x2:900,z2:0}]})).status,400);
 assert.equal(f.calls.filter(c=>c.path.endsWith('/nexus_city_journal')).length,0);
});
test('a revoked device session or expired bearer cannot reach mission rewards or private city data',async()=>{
 for(const options of [{sessionValid:false},{authExpired:true}]){
  const f=endpoint(options);assert.equal((await f.request({action:'mission_claim',mission:'foundation_hall'})).status,401);
  assert.equal((await f.request({action:'snapshot'})).status,401);
  assert.equal(f.calls.filter(c=>c.path.endsWith('/nexus_city_mission_claim')).length,0);
  assert.equal(f.calls.filter(c=>c.path.endsWith('/nexus_cities')).length,0);
  if(!options.authExpired){const check=f.calls.find(c=>c.path.endsWith('/loyalty_session_valid'));assert.deepEqual(check.body,{p_user:UID,p_session:SESSION});}
 }
});
