import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import {PGlite} from '@electric-sql/pglite';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const sql=f=>readFileSync(new URL('../supabase/migrations/'+f,import.meta.url),'utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table inventory_items(code text primary key,name text,category text,coin_price integer,active boolean,metadata jsonb,description text,item_type text,rarity text,tradeable boolean,marketable boolean,permanent boolean,stackable boolean,max_supply bigint,minted_count bigint default 0);
 create table item_instances(id uuid primary key default gen_random_uuid(),item_code text,serial_no bigint,owner_id uuid,state text,origin text,origin_ref text,metadata jsonb);`);
 await db.exec(sql('20260928140344_digital_store_v1.sql'));
 await db.exec(sql('20261003184500_digital_store_credit_wallet.sql'));
 await db.query('insert into auth.users values($1),($2)',[A,B]);
 const query=async(t,args=[])=>(await db.query(t,args)).rows[0];
 const grant=async(txn,user=A,code='CITY_CREDITS_500')=>(await query("select digital_store_fulfill_v2($1,$2,'stripe',$3,'price_test',499,'eur','verified_hash','{}') v",[user,code,txn])).v;
 const revoke=async(txn)=>(await query("select digital_store_revoke_purchase('stripe',$1,'refund') v",[txn])).v;
 const balance=async(user=A)=>(await query("select balance from digital_credit_accounts where user_id=$1 and asset='credits'",[user]))?.balance;
 const spend=async(request=randomUUID(),user=A,code='CITY_MATRIX_ROAD_THEME')=>(await query('select digital_store_spend_credits($1,$2,$3) v',[user,code,request])).v;
 return {db,query,grant,revoke,balance,spend};
}
test('repeatable packs, ownership isolation, atomic cosmetic spend and refund debt are idempotent',async()=>{
 const f=await fixture();try{
  await f.grant('pi_first');assert.equal(await f.balance(),500);
  assert.equal((await f.grant('pi_first')).duplicate,true);assert.equal(await f.balance(),500);
  await assert.rejects(f.grant('pi_first',B),/transaction_owner_mismatch/);
  await assert.rejects(f.grant('pi_first',A,'CITY_PREMIUM_CREDITS_100'),/transaction_owner_mismatch/);
  await assert.rejects(f.spend(),/credit_product_unavailable/);
  await f.db.exec("update digital_store_products set release_state='live' where code='CITY_MATRIX_ROAD_THEME';");
  const request=randomUUID();assert.equal((await f.spend(request)).ok,true);assert.equal(await f.balance(),300);
  assert.equal((await f.spend(request)).duplicate,true);assert.equal(await f.balance(),300);
  await assert.rejects(f.spend(request,B),/transaction_owner_mismatch/);
  await assert.rejects(f.spend(),/already_owned/);
  await f.revoke('pi_first');assert.equal(await f.balance(),-200);
  assert.equal((await f.revoke('pi_first')).duplicate,true);assert.equal(await f.balance(),-200);
  assert.equal((await f.grant('pi_first')).ok,false,'refunded transaction must never mint again');
  await f.grant('pi_second');assert.equal(await f.balance(),300,'new grant first settles debt');
  await f.grant('pi_third');assert.equal(await f.balance(),800,'same pack can be bought again');
  const count=await f.query('select count(*)::integer n,sum(delta)::integer total from digital_credit_ledger');assert.equal(count.n,5);assert.equal(count.total,800);
  await f.db.exec(`grant usage on schema auth,public to authenticated;set request.jwt.claim.sub='${B}';set role authenticated;`);
  assert.equal((await f.db.query('select * from digital_credit_accounts')).rows.length,0);
  await assert.rejects(f.grant('pi_forged'),/permission denied/);
  await assert.rejects(f.db.exec('update digital_credit_accounts set balance=999999'),/permission denied/);
 }finally{await f.db.close();}
});
test('refund of an old cosmetic purchase cannot revoke a later repurchase',async()=>{
 const f=await fixture();try{
  const first=await f.query("select digital_store_fulfill_v2($1,'CITY_MATRIX_ROAD_THEME','stripe','pi_old','price_test',199,'eur','hash','{}') v",[A]);
  await f.revoke('pi_old');
  const next=await f.query("select digital_store_fulfill_v2($1,'CITY_MATRIX_ROAD_THEME','stripe','pi_new','price_test',199,'eur','hash','{}') v",[A]);
  assert.notEqual(first.v.itemInstanceId,next.v.itemInstanceId);
  await f.revoke('pi_old');
  assert.equal((await f.query('select status from digital_store_entitlements where user_id=$1',[A])).status,'active');
 }finally{await f.db.close();}
});
