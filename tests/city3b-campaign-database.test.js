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
 for(const file of ['20260917132738_city3b_wallet_store_move_v5.sql','20260928122225_separate_world_city_progression.sql','20260930150000_city3b_guided_campaign.sql'])await db.exec(sql(file));
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

test('SQL campaign rejects unmet, unknown and foreign progress; rewards and city XP survive retries and storage',async()=>{
 const f=await fixture();try{
  assert.equal((await f.snapshot()).missions.length,32);
  const definitions=(await f.db.query('select * from nexus_city_mission_definitions order by sort_order')).rows;
  for(const [i,m] of CITY_CAMPAIGN_MISSIONS.entries()){assert.equal(definitions[i].code,m.code);assert.deepEqual(definitions[i].objectives,m.objectives);assert.equal(definitions[i].coins,m.coins);assert.equal(definitions[i].city_xp,m.cityXp);}
  await assert.rejects(f.claim('unknown_mission'),/introuvable/);
  await assert.rejects(f.claim('foundation_hall'),/objectifs/);
  await f.place('CITY_HALL_3B');await f.place('HOME_ORIGIN');await f.place('HOME_ORIGIN');
  const cityA=await f.city(),cityB=await f.city(B);
  assert.equal((await f.metrics(B)).buildings,0);
  await assert.rejects(f.claim('foundation_hall',B),/objectifs/);
  await assert.rejects(f.claim('neighbourhood_park'),/chapitre/);
  await f.db.exec("set test.wallet_fail='yes'");await assert.rejects(f.claim('foundation_hall'),/wallet unavailable/);await f.db.exec("set test.wallet_fail='no'");
  assert.equal(await f.coins(),500);assert.equal((await f.query('select count(*)::integer n from nexus_city_mission_progress')).n,0);
  await f.db.exec('set role service_role');
  await f.db.query("update member_profiles set passport_state='suspended' where user_id=$1",[A]);
  await assert.rejects(f.claim('foundation_hall'),/Passeport 3B actif/);
  assert.equal(await f.coins(),500);assert.equal((await f.query('select count(*)::integer n from nexus_city_mission_progress')).n,0);
  await f.db.query("update member_profiles set passport_state='active' where user_id=$1",[A]);
  const first=await f.claim('foundation_hall');assert.equal(first.alreadyClaimed,false);assert.equal(await f.coins(),600);
  const parallel=await Promise.all([f.claim('foundation_hall'),f.claim('foundation_hall')]);assert.ok(parallel.every(r=>r.alreadyClaimed));assert.equal(await f.coins(),600);
  await f.db.exec('reset role');
  await f.claim('foundation_homes');await f.roads(1);await f.claim('foundation_road');
  assert.equal((await f.snapshot()).missions.find(m=>m.code==='neighbourhood_park').status,'available');
  assert.equal((await f.snapshot()).missions.find(m=>m.code==='foundation_rearrange').status,'available');
  assert.equal((await f.query('select xp from economy_accounts where user_id=$1',[A])).xp,0);
  const before=await f.city();assert.equal(Number(before.city_xp),1620);
  await f.db.query("update nexus_city_placements set placement_state='stored' where city_id=$1",[cityA.city_id]);
  const resumed=await f.snapshot();assert.equal(resumed.missions.find(m=>m.code==='foundation_hall').status,'claimed');assert.equal(Number((await f.city()).city_xp),870);
  assert.equal(await f.coins(),950);assert.equal((await f.claim('foundation_hall')).alreadyClaimed,true);
  assert.equal((await f.query('select count(*)::integer n from threeb_wallet_ledger where event_key=$1',['city_campaign'])).n,3);
  assert.equal((await f.metrics(B)).buildings,0);assert.notEqual(cityA.city_id,cityB.city_id);
  await f.db.exec(`set request.jwt.claim.sub='${B}';set role authenticated;`);
  assert.equal((await f.db.query('select * from nexus_city_mission_progress')).rows.length,0);
  await assert.rejects(f.claim('foundation_hall',A),/permission denied/);
  await assert.rejects(f.db.query('insert into nexus_city_mission_progress(city_id,mission_code,granted_coins,granted_city_xp) values($1,$2,999,999)',[cityB.city_id,'foundation_hall']),/permission denied/);
  await f.db.exec(`reset role;set request.jwt.claim.sub='${A}';set role authenticated;`);
  assert.equal((await f.db.query('select * from nexus_city_mission_progress')).rows.length,3);
 }finally{await f.db.close();}
});

test('all 24 main missions can be funded and completed from the starter grant without optional tasks or premium',async()=>{
 const f=await fixture();try{
  const byMetric={housing:'HOME_ORIGIN',commerce:'SHOP_3B',green:'TREE_MATRIX',civic:'SCHOOL_3B',culture:'WORKSHOP_3B',sport:'ARENA_1618',landmark:'GOLD_GATE_3B',mobility:'BUS_STOP_3B',buildings:'HOME_ORIGIN'};
  for(const m of CITY_CAMPAIGN_MISSIONS.filter(m=>!m.optional)){
   for(const g of m.objectives){
    let metrics=await f.metrics();
    if(g.metric==='roads'){await f.roads(g.target);continue;}
    if(g.metric==='districts'){assert.ok(metrics.districts>=g.target,`${m.code} must unlock through the prior required construction path, not a hidden grind`);continue;}
    if(g.metric==='variety'){
     const options=(await f.db.query('select b.* from nexus_city_buildings b where active and country is null and not exists(select 1 from nexus_city_placements p where p.building_code=b.code) order by cost_coins,code')).rows;
     for(const b of options){if(metrics.variety>=g.target)break;if(b.unlock_level>(await f.city()).city_level)continue;await f.place(b.code);await f.snapshot();metrics=await f.metrics();}
    }else while(Number(metrics[g.metric]||0)<g.target){await f.place(g.metric.startsWith('building:')?g.metric.slice(9):byMetric[g.metric]);await f.snapshot();metrics=await f.metrics();}
   }
   assert.equal((await f.snapshot()).missions.find(row=>row.code===m.code).status,'ready',m.code);
   await f.claim(m.code);
   assert.ok(await f.coins()>=0);
  }
  const end=await f.snapshot();assert.equal(end.missions.filter(m=>!m.optional&&m.status==='claimed').length,24);
  assert.equal(end.missions.filter(m=>m.optional&&m.status==='claimed').length,0);assert.equal(end.metrics.districts,8);
  assert.equal((await f.query('select xp from economy_accounts where user_id=$1',[A])).xp,0);
  assert.equal(end.stats.missionXp,CITY_CAMPAIGN_MISSIONS.filter(m=>!m.optional).reduce((sum,m)=>sum+m.cityXp,0));
 }finally{await f.db.close();}
});

test('metrics ignore stored buildings, reverse duplicate roads, short roads and self visits; environment records actual changes',async()=>{
 const f=await fixture();try{
  const c=await f.city();await f.place('HOME_ORIGIN');
  await f.db.query("update nexus_city_placements set placement_state='stored' where city_id=$1",[c.city_id]);
  const roads=[{x1:0,z1:0,x2:10,z2:0},{x1:10,z1:0,x2:0,z2:0},{x1:0,z1:0,x2:1,z2:0},{x1:'bad',z1:0,x2:10,z2:0}];
  await f.db.query("update nexus_cities set city=jsonb_set(city,'{roads}',$2::jsonb) where user_id=$1",[A,JSON.stringify(roads)]);
  await f.db.query('insert into nexus_city_visits(city_id,visitor_id) values($1,$2),($1,$3)',[c.city_id,A,B]);
  const metrics=await f.metrics();assert.equal(metrics.housing,0);assert.equal(metrics.roads,1);assert.equal(metrics.visitors,1);
  await f.db.query("select nexus_city_environment($1,'auto','clear','matrix')",[A]);assert.equal((await f.metrics()).environment_changes,0);
  await f.db.query("select nexus_city_environment($1,'night','rain','gold')",[A]);await f.db.query("select nexus_city_environment($1,'night','rain','gold')",[A]);assert.equal((await f.metrics()).environment_changes,1);
  await assert.rejects(f.db.query("select nexus_city_environment($1,null,'rain','gold')",[A]),/invalide/);
 }finally{await f.db.close();}
});
