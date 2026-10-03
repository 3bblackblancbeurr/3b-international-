import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const A='00000000-0000-4000-8000-000000000001';
test('the production first-build reward handles XP and Coins once under the real unique key',async()=>{
 const db=new PGlite();try{
  await db.exec(`
   create table reward_definitions(code text,active boolean,repeatable boolean,xp integer,coins bigint);
   create table threeb_reward_policy(reward_code text,active boolean,sensitive boolean,max_events_lifetime integer,min_global_level integer,max_events_per_day integer,cooldown_seconds integer,diminishing jsonb,daily_xp_cap bigint,daily_coins_cap bigint,policy_version text);
   create table threeb_economy_flags(singleton boolean,economy_version text,xp_curve_version text,new_economy_enabled boolean,season_enabled boolean);
   create table threeb_economy_risk_profiles(user_id uuid,risk_score integer);
   create table threeb_seasons(code text,xp_multiplier numeric,coins_multiplier numeric,status text,starts_at timestamptz,ends_at timestamptz);
   create table threeb_wallet_ledger(user_id uuid,event_key text,event_id text,xp_delta integer,coins_delta bigint,source text,economy_version text,rule_version text,metadata jsonb,created_at timestamptz default now(),unique(user_id,event_key,event_id));
   create table economy_transactions(user_id uuid,asset text,amount bigint,kind text,source text,idempotency_key text,metadata jsonb);
   create unique index economy_transactions_user_idempotency_uq on economy_transactions(user_id,idempotency_key);
   create table economy_accounts(user_id uuid primary key,xp integer,coins bigint);
   create function threeb_level_from_xp(bigint) returns integer language sql as $$select 1$$;
   create function threeb_wallet_apply_server(p_user uuid,p_xp integer,p_coins bigint) returns jsonb language plpgsql set search_path=public as $$begin
    if current_setting('test.fail_wallet',true)='yes' and (p_xp<>0 or p_coins<>0) then raise exception 'wallet unavailable';end if;
    insert into economy_accounts values(p_user,p_xp,p_coins) on conflict(user_id) do update set xp=economy_accounts.xp+p_xp,coins=economy_accounts.coins+p_coins;
    return (select jsonb_build_object('xp',xp,'coins',coins) from economy_accounts where user_id=p_user);
   end $$;
   insert into reward_definitions values('nexus_first_build',true,false,25,40);
   insert into threeb_reward_policy values('nexus_first_build',true,false,1,1,1,0,'[]',100,100,'first');
   insert into threeb_economy_flags values(true,'2026.1','global-150-v1',true,false);
  `);
  await db.exec(sql('tests/fixtures/city3b-credit-reward-before-asset-keys.sql'));
  const claim=()=>db.query('select threeb_credit_reward_server($1,$2,$3) reward',[A,'nexus_first_build','first-v1']);
  await assert.rejects(claim(),/economy_transactions_user_idempotency_uq/);
  assert.equal((await db.query('select count(*) n from threeb_wallet_ledger')).rows[0].n,0);
  await db.exec(sql('supabase/migrations/20261003030633_city3b_reward_transaction_keys.sql'));
  await db.exec("set test.fail_wallet='yes'");await assert.rejects(claim(),/wallet unavailable/);
  assert.equal((await db.query('select count(*) n from economy_transactions')).rows[0].n,0);
  await db.exec("set test.fail_wallet='no'");const result=(await claim()).rows[0].reward;assert.equal(result.xp_awarded,25);assert.equal(result.coins_awarded,40);
  const repeated=(await claim()).rows[0].reward;assert.equal(repeated.idempotent,true);assert.equal(repeated.coins,40);assert.equal(repeated.xp,25);
  const tx=(await db.query('select * from economy_transactions order by asset')).rows;assert.equal(tx.length,2);assert.notEqual(tx[0].idempotency_key,tx[1].idempotency_key);
  await assert.rejects(db.query('select threeb_credit_reward_server($1,$2,$3)',[A,'nexus_first_build','another-build']),/already_claimed/);
 }finally{await db.close();}
});
