import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const USER='00000000-0000-4000-8000-000000000001';

test('the dedicated Invisible reward commits through the CAS outbox and credits once without consuming existing caps',async()=>{
 const db=new PGlite();try{
  await db.exec(`
   create table reward_definitions(code text primary key,label text,active boolean,repeatable boolean,xp integer,coins bigint);
   create table threeb_reward_policy(reward_code text primary key,active boolean,sensitive boolean,max_events_lifetime integer,min_global_level integer,max_events_per_day integer,cooldown_seconds integer,diminishing jsonb,daily_xp_cap bigint,daily_coins_cap bigint,policy_version text,updated_at timestamptz);
   create table threeb_economy_flags(singleton boolean,economy_version text,xp_curve_version text,new_economy_enabled boolean,season_enabled boolean);
   create table threeb_economy_risk_profiles(user_id uuid,risk_score integer);
   create table threeb_seasons(code text,xp_multiplier numeric,coins_multiplier numeric,status text,starts_at timestamptz,ends_at timestamptz);
   create table threeb_wallet_ledger(user_id uuid,event_key text,event_id text,xp_delta integer,coins_delta bigint,source text,economy_version text,rule_version text,metadata jsonb,created_at timestamptz default now(),unique(user_id,event_key,event_id));
   create table economy_transactions(user_id uuid,asset text,amount bigint,kind text,source text,idempotency_key text,metadata jsonb,unique(user_id,idempotency_key));
   create table economy_accounts(user_id uuid primary key,xp integer,coins bigint);
   create function threeb_level_from_xp(bigint) returns integer language sql as $$select 1$$;
   create function threeb_wallet_apply_server(p_user uuid,p_xp integer,p_coins bigint) returns jsonb language plpgsql set search_path=public as $$begin
    insert into economy_accounts values(p_user,p_xp,p_coins) on conflict(user_id) do update set xp=economy_accounts.xp+p_xp,coins=economy_accounts.coins+p_coins;
    return (select jsonb_build_object('xp',xp,'coins',coins) from economy_accounts where user_id=p_user);
   end $$;
   insert into reward_definitions values('world_secret','Secret',true,true,80,15);
   insert into threeb_reward_policy values('world_secret',true,false,16,1,16,0,'[]',1280,240,'original',now());
   insert into threeb_economy_flags values(true,'2026.1','global-150-v1',true,false);
   create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key);
   insert into auth.users values('00000000-0000-4000-8000-000000000001');
   create table member_world_state(user_id uuid primary key,revision bigint,data jsonb,updated_at timestamptz);
   create table member_world_devices(user_id uuid,device uuid,sequence bigint,unique(user_id,device));
   insert into member_world_state values('00000000-0000-4000-8000-000000000001',0,'{}',now());
  `);
  await db.exec(sql('tests/fixtures/city3b-credit-reward-before-asset-keys.sql'));
  await db.exec(sql('supabase/migrations/20261003030633_city3b_reward_transaction_keys.sql'));
  const migration=sql('supabase/migrations/20261009132007_invisible_fragment_reward_v1.sql');await db.exec(migration);await db.exec(migration);
  const expansion=sql('supabase/migrations/20261009143221_invisible_eight_realms_rewards_v2.sql');await db.exec(expansion);await db.exec(expansion);
  await db.exec(sql('supabase/migrations/20260920163347_threeb_world_reward_transactional_outbox_v1.sql').split('create or replace function public.threeb_process_reward_outbox_server(')[0]);
  await db.exec(sql('supabase/migrations/20261005130821_threeb_reward_outbox_retry_accounting_v1.sql'));
  await db.exec(sql('supabase/migrations/20261009132006_world_commit_reward_names.sql'));
  const policy=(await db.query("select max_events_lifetime,max_events_per_day from threeb_reward_policy where reward_code='invisible_fragment'")).rows[0];assert.deepEqual(policy,{max_events_lifetime:1,max_events_per_day:1});
  assert.equal((await db.query("select max_events_lifetime from threeb_reward_policy where reward_code='world_secret'")).rows[0].max_events_lifetime,16);
  const args=[USER,0,JSON.stringify({invisible:{chestOpened:true}}),'00000000-0000-4000-8000-000000000002',5,JSON.stringify([{rewardCode:'invisible_fragment',eventId:'invisible:leman-001',source:'world'}])];
  const commit=values=>db.query('select world_commit_v2($1,$2,$3,$4,$5,$6) ok',values);
  assert.equal((await commit(args)).rows[0].ok,true);
  assert.equal((await commit(args)).rows[0].ok,false,'A stale concurrent revision cannot replace the committed snapshot');
  await assert.rejects(commit([...args.slice(0,1),1,args[2],args[3],6,JSON.stringify([{rewardCode:'unknown_reward',eventId:'invisible:bad',source:'world'}])]),/invalid_reward_intent/);
  assert.equal((await db.query('select revision from member_world_state')).rows[0].revision,1,'Invalid intents roll back the snapshot');
  assert.equal((await db.query('select sequence from member_world_devices')).rows[0].sequence,5,'Invalid intents roll back the device receipt');
  const process=()=>db.query('select threeb_process_reward_outbox_server($1) result',[USER]);
  assert.equal((await process()).rows[0].result.credited,1);
  assert.equal((await commit([args[0],1,args[2],args[3],6,args[5]])).rows[0].ok,true);
  assert.equal((await process()).rows[0].result.credited,0);
  assert.equal((await db.query('select count(*) n from threeb_reward_outbox')).rows[0].n,1,'Stable event identifiers deduplicate the outbox');
  const claim=event=>db.query('select threeb_credit_reward_server($1,$2,$3) reward',[USER,'invisible_fragment',event]);
  const replay=(await claim('invisible:leman-001')).rows[0].reward;assert.equal(replay.idempotent,true);assert.equal(replay.xp,120);assert.equal(replay.coins,15);
  await assert.rejects(claim('invisible:forged-other-episode'),/already_claimed/);
  assert.deepEqual((await db.query('select xp,coins from economy_accounts')).rows,[{xp:120,coins:15}]);
  assert.equal((await db.query("select count(*) n from threeb_wallet_ledger where event_key='reward:invisible_fragment'")).rows[0].n,1);
  const newCodes=['algerie','maroc','tunisie','espagne','italie','turquie','estonie'].map(realm=>'invisible_fragment_'+realm).concat('invisible_convergence');
  for(const code of newCodes){
   const event=code==='invisible_convergence'?'invisible:convergence-eight-v1':'invisible:realm-'+code.slice('invisible_fragment_'.length);
   const credit=()=>db.query('select threeb_credit_reward_server($1,$2,$3) reward',[USER,code,event]);
   await credit();
   const granted=(await db.query('select xp_delta,coins_delta from threeb_wallet_ledger where user_id=$1 and event_key=$2',[USER,'reward:'+code])).rows[0];
   assert.deepEqual(granted,{xp_delta:code==='invisible_convergence'?240:120,coins_delta:code==='invisible_convergence'?30:15});
   assert.equal((await credit()).rows[0].reward.idempotent,true);
   await assert.rejects(db.query('select threeb_credit_reward_server($1,$2,$3)',[USER,code,event+':forged']),/already_claimed/);
  }
  assert.deepEqual((await db.query('select xp,coins from economy_accounts')).rows,[{xp:1200,coins:150}]);
  assert.equal((await db.query("select count(*)::integer n from threeb_reward_policy where reward_code like 'invisible_%' and max_events_lifetime=1")).rows[0].n,9);
  assert.equal((await db.query("select max_events_lifetime from threeb_reward_policy where reward_code='world_secret'")).rows[0].max_events_lifetime,16);
 }finally{await db.close();}
});
