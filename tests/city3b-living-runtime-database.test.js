import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {CITY_CAMPAIGN_MISSIONS} from '../src/city/city3b-campaign.js';
const sql=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.member_profiles(user_id uuid primary key,country text,passport_state text);
 create table public.nexus_cities(user_id uuid primary key references auth.users(id),city_id uuid not null default gen_random_uuid(),city jsonb not null default '{}',save_version integer default 1,revision integer default 0,updated_at timestamptz default now());
 create table public.item_instances(id uuid primary key,owner_id uuid);
 create table public.economy_accounts(user_id uuid primary key,xp bigint default 0,coins bigint default 0,updated_at timestamptz default now());
 create table public.economy_transactions(id bigint generated always as identity,user_id uuid,asset text,amount bigint,kind text,source text,idempotency_key text,metadata jsonb);
 create table public.threeb_wallet_ledger(id bigint generated always as identity,user_id uuid,event_key text,event_id text,xp_delta integer,coins_delta integer,unique(user_id,event_key,event_id));
 -- The campaign executes against the actual city migrations. Only the shared wallet adapter is isolated.
 create function public.threeb_wallet_apply_server(p_user uuid,p_xp integer,p_coins integer) returns jsonb language plpgsql as $$begin
  if current_setting('test.wallet_fail',true)='yes' then raise exception 'wallet unavailable'; end if;
  insert into public.economy_accounts(user_id,xp,coins) values(p_user,p_xp,p_coins) on conflict(user_id) do update set xp=economy_accounts.xp+p_xp,coins=economy_accounts.coins+p_coins;
  perform 1 from public.member_profiles where user_id=p_user for update;
  return (select jsonb_build_object('xp',xp,'coins',coins) from public.economy_accounts where user_id=p_user);
 end $$;`);
 for(const file of ['20260917105315_create_your_3b_city_v2.sql','20260917105501_city_3b_districts_and_collectibles.sql','20260917111213_city_3b_progression_catalog_v3.sql'])await db.exec(sql(file));
 await db.exec('alter table nexus_city_placements add column footprint_w smallint default 1,add column footprint_h smallint default 1,add column request_id uuid;');
 for(const file of ['20260917132738_city3b_wallet_store_move_v5.sql','20260928122225_separate_world_city_progression.sql','20260930150000_city3b_guided_campaign.sql','20260930233000_city3b_living_runtime.sql'])await db.exec(sql(file));
 await db.exec('grant usage on schema auth,public to authenticated,service_role;grant select on auth.users to authenticated;grant select on nexus_cities to authenticated;grant all on all tables in schema public to service_role;grant usage on all sequences in schema public to service_role;');
 for(const uid of [A,B]){await db.query('insert into auth.users values($1)',[uid]);await db.query("insert into member_profiles values($1,'France','active')",[uid]);await db.query("select nexus_city_create($1,'Ville test','France')",[uid]);}
 const query=async(text,args=[])=>{const r=await db.query(text,args);return r.rows[0]};
 const city=async(uid=A)=>(await query('select * from nexus_cities where user_id=$1',[uid]));
 const snapshot=async(uid=A)=>(await query('select nexus_city_campaign_snapshot($1) as campaign',[uid])).campaign;
 const claim=async(code,uid=A)=>(await query('select nexus_city_mission_claim($1,$2) as reward',[uid,code])).reward;
 const coins=async(uid=A)=>Number((await query('select coins from economy_accounts where user_id=$1',[uid])).coins);
 const metrics=async(uid=A)=>(await query('select nexus_city_campaign_metrics($1) as metrics',[uid])).metrics;
 let nextPlacement=0;
 const place=async(code,uid=A)=>{const n=nextPlacement++;return query('select nexus_city_place_v2($1,$2,$3,$4,0::smallint,$5) as id',[uid,code,-80+(n%20)*6,-80+Math.floor(n/20)*6,randomUUID()]);};
 const roads=async(count,uid=A)=>{const list=Array.from({length:count},(_,i)=>({id:'road-'+i,x1:-70,z1:-60+i*8,x2:-50,z2:-60+i*8,width:4}));await db.query("update nexus_cities set city=jsonb_set(city,'{roads}',$2::jsonb) where user_id=$1",[uid,JSON.stringify(list)]);await snapshot(uid);};
 return {db,query,city,snapshot,claim,coins,metrics,place,roads};
}


const life=async f=>(await f.query('select nexus_city_life_snapshot($1) as v',[A])).v;
const act=async(f,action,value='',uid=A,request=randomUUID())=>(await f.query('select nexus_city_life_action($1,$2,$3,$4) as v',[uid,action,value,request])).v;
const tick=async(f,cycles=1)=>{await f.db.query("update nexus_city_life set last_tick=now()-($2::integer * interval '30 seconds') where city_id=(select city_id from nexus_cities where user_id=$1)",[A,cycles]);return life(f);};
const foundation=async f=>{await f.place('CITY_HALL_3B');await f.snapshot();await f.claim('foundation_hall');await f.claim('foundation_homes');await f.roads(1);await f.claim('foundation_road');await f.place('PARK_UNITY');await f.snapshot();await f.claim('neighbourhood_park');};

test('persistent city life starts empty, advances on server time and resumes with a bounded census',async()=>{
 const f=await fixture();try{
  let v=await life(f);assert.equal(v.population,0);assert.equal(v.jobs,0);assert.equal(v.inhabitants.length,0);
  await f.place('HOME_ORIGIN');await f.place('HOME_ORIGIN');
  v=await life(f);assert.equal(v.housingCapacity,36);assert.equal(v.population,0);
  v=await tick(f,3);assert.equal(v.day,3);assert.equal(v.population,9);assert.equal(v.inhabitants.length,9);
  const unchanged=await act(f,'advance');assert.equal(unchanged.day,3);assert.equal(unchanged.population,9);
  const resumed=await tick(f,1000);assert.equal(resumed.cyclesCaughtUp,12);assert.equal(resumed.day,15);assert.equal(resumed.population,36);assert.equal(resumed.inhabitants.length,24);
  assert.equal(resumed.history.length,12);assert.deepEqual((await life(f)).inhabitants,resumed.inhabitants);
  const c=await f.city();await f.db.query("update nexus_city_placements set placement_state='stored' where city_id=$1",[c.city_id]);
  v=await life(f);assert.equal(v.housingCapacity,0);assert.equal(v.population,0);assert.equal(v.inhabitants.length,0);
  assert.equal((await life(f)).day,15);
 }finally{await f.db.close();}
});

test('guided events require sustained saved conditions and grant fixed rewards once under the active Passport lock',async()=>{
 const f=await fixture();try{
  await f.db.exec('set role service_role');
  await life(f);await f.place('HOME_ORIGIN');await f.place('HOME_ORIGIN');
  await foundation(f);
  await f.db.query('update economy_accounts set coins=10000 where user_id=$1',[A]);
  await f.place('SHOP_3B');let v=await tick(f,4);assert.ok(v.population>=8);
  await assert.rejects(act(f,'event_claim','welcome'),/maintenus/);
  await assert.rejects(act(f,'event_start','market_day'),/précédent/);
  v=await act(f,'event_start','welcome');assert.equal(v.activeEvent.heldCycles,0);
  await tick(f);await assert.rejects(act(f,'event_claim','welcome'),/maintenus/);
  v=await tick(f);assert.equal(v.activeEvent.status,'ready');
  const before=await f.coins();await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[A]);
  await assert.rejects(act(f,'event_claim','welcome'),/Passeport 3B actif/);assert.equal(await f.coins(),before);
  await f.db.query("update member_profiles set passport_state='active' where user_id=$1",[A]);
  await f.db.exec("set test.wallet_fail='yes'");await assert.rejects(act(f,'event_claim','welcome'),/wallet unavailable/);await f.db.exec("set test.wallet_fail='no'");
  const first=await act(f,'event_claim','welcome');assert.equal(first.reward.coins,120);assert.equal(first.reward.alreadyClaimed,false);assert.equal(await f.coins(),before+120);
  const retry=await act(f,'event_claim','welcome');assert.equal(retry.reward.alreadyClaimed,true);assert.equal(await f.coins(),before+120);
  assert.equal((await f.query("select count(*)::integer n from threeb_wallet_ledger where event_key='city_life'")).n,1);
  assert.equal((await f.snapshot()).stats.eventXp,250);assert.equal((await f.query('select xp from economy_accounts where user_id=$1',[A])).xp,0);
  const c=await f.city();await f.db.query("update nexus_city_placements set placement_state='stored' where city_id=$1",[c.city_id]);await f.snapshot();assert.equal(Number((await f.city()).city_xp),1520);
  assert.equal((await life(f)).events[0].status,'claimed');assert.equal((await life(f)).events[1].status,'available');
 }finally{await f.db.close();}
});

test('services jobs policy and ownership use actual placed buildings; removing event conditions resets its preparation',async()=>{
 const f=await fixture();try{
  await life(f);await f.place('HOME_ORIGIN');await f.place('HOME_ORIGIN');await f.db.query('update economy_accounts set coins=10000 where user_id=$1',[A]);
  await foundation(f);
  await f.place('SHOP_3B');await f.place('WATER_3B');await f.place('SOLAR_3B');await f.place('BUS_STOP_3B');
  let v=await tick(f,5);assert.equal(v.jobs,36);assert.ok(v.employed>0);assert.equal(v.needs.find(n=>n.code==='water').score,100);assert.equal(v.needs.find(n=>n.code==='health').score,0);
  assert.ok(v.inhabitants.some(n=>n.workPlacementId));assert.ok(v.mobility>=15);
  v=await act(f,'policy_set','green');assert.equal(v.policy,'green');assert.equal((await life(f)).policy,'green');await assert.rejects(act(f,'policy_set','invented'),/Orientation/);
  await act(f,'event_start','welcome');await tick(f);assert.equal((await life(f)).activeEvent.heldCycles,1);
  await f.db.query("update nexus_city_placements set placement_state='stored' where building_code='SHOP_3B'");v=await tick(f);assert.equal(v.activeEvent.heldCycles,0);assert.equal(v.activeEvent.status,'active');
  assert.equal((await f.query('select nexus_city_life_snapshot($1) v',[B])).v.population,0);
  await f.db.exec(`set request.jwt.claim.sub='${B}';set role authenticated;`);
  assert.equal((await f.db.query('select * from nexus_city_life where city_id=(select city_id from nexus_cities where user_id=$1)',[A])).rows.length,0);
  await assert.rejects(act(f,'event_claim','welcome',A),/permission denied/);
  await assert.rejects(f.db.query('update nexus_city_life set population=9999'),/permission denied/);
 }finally{await f.db.close();}
});

test('all eight neighbourhood events are playable after the funded construction campaign and survive recalculation',async()=>{
 const f=await fixture();try{
  const byMetric={housing:'HOME_ORIGIN',commerce:'SHOP_3B',green:'TREE_MATRIX',civic:'SCHOOL_3B',culture:'WORKSHOP_3B',sport:'ARENA_1618',landmark:'GOLD_GATE_3B',mobility:'BUS_STOP_3B',buildings:'HOME_ORIGIN'};
  for(const mission of CITY_CAMPAIGN_MISSIONS.filter(m=>!m.optional)){
   for(const goal of mission.objectives){
    let metrics=await f.metrics();
    if(goal.metric==='roads'){await f.roads(goal.target);continue;}
    if(goal.metric==='districts'){assert.ok(metrics.districts>=goal.target);continue;}
    if(goal.metric==='variety'){
     const options=(await f.db.query('select b.* from nexus_city_buildings b where active and country is null and not exists(select 1 from nexus_city_placements p where p.building_code=b.code) order by cost_coins,code')).rows;
     for(const b of options){if(metrics.variety>=goal.target)break;if(b.unlock_level>(await f.city()).city_level)continue;await f.place(b.code);await f.snapshot();metrics=await f.metrics();}
    }else while(Number(metrics[goal.metric]||0)<goal.target){await f.place(goal.metric.startsWith('building:')?goal.metric.slice(9):byMetric[goal.metric]);await f.snapshot();metrics=await f.metrics();}
   }
   await f.claim(mission.code);
  }
  assert.equal((await f.snapshot()).missions.filter(m=>!m.optional&&m.status==='claimed').length,24);
  for(const [code,count]of [['WATER_3B',4],['SOLAR_3B',4],['CLINIC_3B',3],['SCHOOL_3B',2]])for(let i=0;i<count;i++){await f.place(code);await f.snapshot();}
  const c=await f.city(),roads=Array.from({length:10},(_,i)=>({id:'network-'+i,x1:-90,z1:-82+i*12,x2:70,z2:-82+i*12,width:4}));
  await f.db.query('select nexus_city_plan_roads($1,$2)',[A,JSON.stringify(roads)]);
  await life(f);let current=await tick(f,12);const startCoins=await f.coins();let rewards=0,eventXp=0;
  for(const event of current.events){
   assert.equal((await act(f,'event_start',event.code)).activeEvent.code,event.code);
   current=await tick(f,event.cycles);const active=current.activeEvent;
   assert.equal(active.status,'ready',`${event.code}: ${JSON.stringify(active.requirements)}`);
   const result=await act(f,'event_claim',event.code);assert.equal(result.reward.alreadyClaimed,false);rewards+=event.coins;eventXp+=event.cityXp;
   assert.equal((await act(f,'event_claim',event.code)).reward.alreadyClaimed,true);
  }
  current=await life(f);assert.equal(current.events.filter(e=>e.status==='claimed').length,8);assert.equal(current.activeEvent,null);
  assert.equal(await f.coins(),startCoins+rewards);assert.equal((await f.snapshot()).stats.eventXp,eventXp);
  assert.equal((await f.query("select count(*)::integer n from threeb_wallet_ledger where event_key='city_life'")).n,8);
  await assert.rejects(f.db.query('select nexus_city_plan_roads($1,$2)',[A,JSON.stringify([{x1:0,z1:0,x2:1,z2:0}])]),/trop courte/);
  assert.equal((await f.city()).city.progression,'city_only');assert.equal((await f.city()).city.roads.length,10);
 }finally{await f.db.close();}
});
