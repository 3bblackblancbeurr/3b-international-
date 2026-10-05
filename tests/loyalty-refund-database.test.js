import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createCompetitionSchema} from './helpers/loyalty-competition-schema.js';

const USER='00000000-0000-4000-8000-000000000001';
const sql=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const original='supabase/migrations/20260910105242_member_accounts_loyalty_and_game_rewards.sql';
const patch='supabase/migrations/20261005131925_loyalty_refund_ledger_reversal_v1.sql';
function functionSql(path,name){
 const source=sql(path),start=source.search(new RegExp('create(?: or replace)? function public\\.'+name+'\\('));
 assert.notEqual(start,-1,'function exists: '+name);
 const end=source.indexOf('$$;',start);
 assert.notEqual(end,-1,'function terminates: '+name);
 return source.slice(start,end+3);
}

async function fixture({patched=true}={}){
 const db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table member_profiles(user_id uuid primary key,xp bigint not null default 0 check(xp>=0),points bigint not null default 0 check(points>=0));
  create table member_ledger(id bigint generated always as identity primary key,user_id uuid not null references member_profiles(user_id),event_key text not null unique,source text not null,label text not null,xp integer not null,points integer not null,created_at timestamptz default now());
  create table member_purchase_rewards(session_id text primary key,user_id uuid not null references member_profiles(user_id),payment_intent text unique not null,merchandise_cents bigint not null check(merchandise_cents>=0),refunded_cents bigint not null default 0,points integer not null,xp integer not null,created_at timestamptz default now());
  create table economy_accounts(user_id uuid primary key,xp integer not null default 0 check(xp>=0),coins bigint not null default 0 check(coins>=0),updated_at timestamptz default now());
  create table economy_transactions(user_id uuid not null,asset text not null check(asset in ('xp','coins')),amount bigint not null check(amount<>0),kind text not null check(kind in ('earn','spend','refund','admin_adjustment')),source text not null,idempotency_key text not null,metadata jsonb not null,unique(user_id,idempotency_key));
  create table threeb_wallet_ledger(id bigint generated always as identity primary key,user_id uuid not null,event_key text not null,event_id text not null,xp_delta integer not null check(xp_delta between -1000000 and 1000000),coins_delta bigint not null check(coins_delta between -1000000 and 1000000),source text not null,economy_version text not null,rule_version text,metadata jsonb,created_at timestamptz default now(),unique(user_id,event_key,event_id));
  create table threeb_economy_flags(singleton boolean primary key,economy_version text,xp_curve_version text);
  create table threeb_level_curve(level integer,xp_required bigint,curve_version text);
  create function threeb_level_from_xp(bigint) returns integer language sql as $$select 1$$;
  insert into threeb_economy_flags values(true,'2026.2','test-curve');
  insert into threeb_level_curve values(1,0,'test-curve'),(2,1000,'test-curve');
  insert into member_profiles(user_id) values('${USER}');
 `);
 await createCompetitionSchema(db);
 await db.exec(functionSql('supabase/migrations/20260920162537_threeb_global_xp_150_antifarm_token_foundation.sql','threeb_wallet_apply_server'));
 await db.exec(sql('supabase/migrations/20260920162852_threeb_loyalty_global_ledger_unification.sql'));
 await db.exec(functionSql('supabase/migrations/20260910110824_settle_purchase_rewards_with_existing_refunds.sql','loyalty_record_purchase'));
 await db.exec(functionSql(original,'loyalty_refund_purchase'));
 if(patched)await db.exec(sql(patch));
 await db.query('select loyalty_grant($1,$2,$3,$4,$5,$6)',[USER,'other:earned','game','Progression hors achat',75,5]);
 await db.query('select threeb_wallet_apply_server($1,$2,$3)',[USER,0,250]);
 return db;
}

const purchase=(db,cents=9000,refunded=0)=>db.query('select loyalty_record_purchase($1,$2,$3,$4,$5) awarded',[USER,'cs_purchase','pi_purchase',cents,refunded]);
const refund=async(db,cents,intent='pi_purchase')=>(await db.query('select loyalty_refund_purchase($1,$2) awarded',[intent,cents])).rows[0].awarded;
async function state(db){
 const balance=(await db.query('select p.xp profile_xp,p.points,a.xp wallet_xp,a.coins from member_profiles p join economy_accounts a using(user_id) where p.user_id=$1',[USER])).rows[0];
 const order=(await db.query('select refunded_cents,points,xp from member_purchase_rewards where payment_intent=$1',['pi_purchase'])).rows[0];
 const counts=(await db.query("select (select count(*) from member_ledger where source='refund') member_rows,(select count(*) from threeb_wallet_ledger where event_key='loyalty:refund') wallet_rows,(select count(*) from economy_transactions where kind='refund') tx_rows")).rows[0];
 return {balance,order,counts};
}

test('purchase refunds reverse the existing reward once while preserving earned XP and Coins',async()=>{
 const db=await fixture({patched:false});
 try{
  await purchase(db);const before=await state(db);
  await assert.rejects(refund(db,4500),/invalid_loyalty_grant/);
  assert.deepEqual(await state(db),before,'the existing failure rolls back the purchase update');
  await db.exec(sql(patch));
  assert.equal(await refund(db,4500),true);
  assert.deepEqual(await state(db),{
   balance:{profile_xp:525,points:455,wallet_xp:525,coins:250},
   order:{refunded_cents:4500,points:450,xp:450},
   counts:{member_rows:1,wallet_rows:1,tx_rows:1}
  });
  const ledger=(await db.query("select xp_delta,coins_delta,metadata->>'points_delta' points_delta from threeb_wallet_ledger where event_key='loyalty:refund'")).rows[0];
  assert.deepEqual(ledger,{xp_delta:-450,coins_delta:0,points_delta:'-450'});
  assert.deepEqual((await db.query("select asset,amount,kind from economy_transactions where kind='refund'")).rows,[{asset:'xp',amount:-450,kind:'refund'}]);
  const partial=await state(db);
  assert.equal(await refund(db,4500),false);
  assert.equal(await refund(db,3000),false,'an older cumulative event cannot undo a newer refund');
  assert.deepEqual(await state(db),partial);
  assert.equal(await refund(db,9000),true);
  assert.equal(await refund(db,9000),false);
  assert.deepEqual(await state(db),{
   balance:{profile_xp:75,points:5,wallet_xp:75,coins:250},
   order:{refunded_cents:9000,points:0,xp:0},
   counts:{member_rows:2,wallet_rows:2,tx_rows:2}
  });
 }finally{await db.close();}
});

test('cumulative refunds preserve the existing merchandise rounding and initial partial-refund settlement',async()=>{
 const db=await fixture();
 try{
  await purchase(db,12345,3334);
  assert.equal((await state(db)).order.points,901);
  assert.equal(await refund(db,3334),false);
  assert.equal(await refund(db,3335),true,'a refund event may leave the rounded reward unchanged');
  assert.deepEqual((await state(db)).counts,{member_rows:1,wallet_rows:1,tx_rows:0});
  assert.equal((await state(db)).balance.wallet_xp,976);
  assert.equal(await refund(db,3336),true);
  assert.equal((await state(db)).balance.wallet_xp,975,'remaining merchandise, not each refund fragment, determines rounding');
  assert.equal(await refund(db,12345),true);
  assert.deepEqual((await state(db)).balance,{profile_xp:75,points:5,wallet_xp:75,coins:250});
 }finally{await db.close();}
});

test('refund amount bounds, ledger conflicts and inconsistent purchase state fail without changing balances',async()=>{
 const db=await fixture();
 try{
  await purchase(db);const before=await state(db);
  assert.equal(await refund(db,4500,'pi_unknown'),false);
  for(const amount of [null,-1,9001])await assert.rejects(refund(db,amount),/invalid_loyalty_refund_amount/);
  assert.deepEqual(await state(db),before);
  await db.query("insert into member_ledger(user_id,event_key,source,label,xp,points) values($1,'refund:pi_purchase:4500','refund','Existing event',0,0)",[USER]);
  const collision=await state(db);
  await assert.rejects(refund(db,4500),/loyalty_refund_event_conflict/);
  assert.deepEqual(await state(db),collision);
  await db.exec('update member_purchase_rewards set points=0,xp=0');
  const inconsistent=await state(db);
  await assert.rejects(refund(db,100),/invalid_loyalty_refund_reward_state/);
  assert.deepEqual(await state(db),inconsistent,'a refund cannot become an extra reward grant');
 }finally{await db.close();}
});

test('a late purchase-write failure rolls back the wallet and every refund ledger entry',async()=>{
 const db=await fixture();
 try{
  await purchase(db);
  await db.exec(`create function test_refund_failure() returns trigger language plpgsql as $$begin
   if current_setting('test.fail_refund',true)='yes' then raise exception 'purchase update unavailable';end if;return new;
  end $$;
  create trigger fail_refund before update on member_purchase_rewards for each row execute function test_refund_failure();
  set test.fail_refund='yes';`);
  const before=await state(db);
  await assert.rejects(refund(db,4500),/purchase update unavailable/);
  assert.deepEqual(await state(db),before);
  await db.exec("set test.fail_refund='no'");
  assert.equal(await refund(db,4500),true);
  assert.deepEqual((await state(db)).counts,{member_rows:1,wallet_rows:1,tx_rows:1});
 }finally{await db.close();}
});

test('refund corrections remain service-only and ordinary loyalty grants still reject negative values',async()=>{
 const db=await fixture();
 try{
  const privileges=(await db.query("select has_function_privilege('anon','public.loyalty_refund_purchase(text,bigint)','EXECUTE') anon,has_function_privilege('authenticated','public.loyalty_refund_purchase(text,bigint)','EXECUTE') member,has_function_privilege('service_role','public.loyalty_refund_purchase(text,bigint)','EXECUTE') service")).rows[0];
  assert.deepEqual(privileges,{anon:false,member:false,service:true});
  assert.equal((await db.query("select prosecdef from pg_proc where oid='public.loyalty_refund_purchase(text,bigint)'::regprocedure")).rows[0].prosecdef,false);
  const before=await state(db);
  await assert.rejects(db.query('select loyalty_grant($1,$2,$3,$4,$5,$6)',[USER,'unrelated:negative','game','Invalid correction',-10,-10]),/invalid_loyalty_grant/);
  assert.deepEqual(await state(db),before);
 }finally{await db.close();}
});
