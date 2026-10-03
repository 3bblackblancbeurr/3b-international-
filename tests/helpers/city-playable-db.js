import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const sql=name=>readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8');
export const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
export async function fixture(){
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
 for(const file of ['20260917132738_city3b_wallet_store_move_v5.sql','20260928122225_separate_world_city_progression.sql','20261003000100_city3b_guided_campaign.sql','20261003000200_city3b_living_runtime.sql','20261003001500_city3b_playable_construction.sql'])await db.exec(sql(file));
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
