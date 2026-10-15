import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const migrations=new URL('../supabase/migrations/',import.meta.url);
const migrationName=readdirSync(migrations).find(name=>/^\d{14}_passport_identity_attempt_transactions_v1\.sql$/.test(name));
const migration=readFileSync(new URL(migrationName,migrations),'utf8');
const USER='00000000-0000-4000-8000-000000000001',SESSION='00000000-0000-4000-8000-000000000002';
const hash=n=>String(n).padStart(64,'0');

test('identity attempt transitions execute atomically and reject stale or untrusted outcomes',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
   create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql as $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user)$$;
   create table public.member_profiles(user_id uuid primary key references auth.users,passport_state text default 'active',identity_verification_state text default 'unverified',identity_assurance_level text default 'account_verified',identity_verified_at timestamptz,identity_verification_provider text,identity_verification_ref_hash text);
   create table public.passport_identity_verification_attempts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,provider text not null,provider_session_ref_hash text,state text not null,assurance_requested text,started_at timestamptz not null default now(),completed_at timestamptz,expires_at timestamptz,last_error_code text,provider_consent_at timestamptz,provider_consent_version smallint,unique(provider,provider_session_ref_hash),check(completed_at is null or completed_at>=started_at));
  `);
  await db.exec(migration);
  await db.query('insert into auth.users values($1)',[USER]);
  await db.query('insert into auth.sessions values($1,$2)',[SESSION,USER]);
  await db.query('insert into member_profiles(user_id) values($1)',[USER]);
  const reset=async()=>{
   await db.exec('truncate passport_identity_verification_attempts');
   await db.exec("update member_profiles set passport_state='active',identity_verification_state='unverified',identity_assurance_level='account_verified',identity_verified_at=null,identity_verification_provider=null,identity_verification_ref_hash=null");
  };
  const begin=async(n,sid=SESSION)=>(await db.query('select passport_identity_begin_attempt_v1($1,$2,$3) as result',[USER,sid,hash(n)])).rows[0].result;
  const finish=async(id,n,state='rejected',code='provider_rejected')=>(await db.query('select passport_identity_finish_attempt_v1($1,$2,$3,$4) as result',[id,hash(n),state,code])).rows[0].result;
  const confirm=async(id,n)=>(await db.query('select passport_identity_confirm_production_v1($1,$2) as result',[id,hash(n)])).rows[0].result;
  const profile=async()=>(await db.query('select * from member_profiles where user_id=$1',[USER])).rows[0];
  const attempt=async id=>(await db.query('select * from passport_identity_verification_attempts where id=$1',[id])).rows[0];

  await t.test('begin requires a live member session and never resets revoked or verified identity',async()=>{
   await reset();
   await assert.rejects(begin(1,'00000000-0000-4000-8000-000000000099'),/Session/);
   for(const state of ['verified','revoked','pending',null]){
    await db.query('update member_profiles set identity_verification_state=$1',[state]);
    await assert.rejects(begin(1),/contrôle/);
    assert.equal((await profile()).identity_verification_state,state);
   }
   assert.equal((await db.query('select count(*)::int n from passport_identity_verification_attempts')).rows[0].n,0);
  });

  await t.test('two start requests leave exactly one pending attempt with recorded consent',async()=>{
   await reset();
   const requests=await Promise.allSettled([begin(10),begin(11)]);
   assert.equal(requests.filter(result=>result.status==='fulfilled').length,1);
   assert.equal(requests.filter(result=>result.status==='rejected').length,1);
   const record=await attempt(requests.find(result=>result.status==='fulfilled').value.id);
   assert.equal((await profile()).identity_verification_state,'pending');
   assert.equal(record.state,'processing');
   assert.equal(record.provider,'idnow');
   assert.equal(record.provider_consent_version,1);
   assert.ok(record.provider_consent_at);
   assert.equal((await db.query('select count(*)::int n from passport_identity_verification_attempts')).rows[0].n,1);
  });

  await t.test('each negative outcome updates attempt and profile together, once',async()=>{
   for(const [state,code,expected] of [
    ['rejected','provider_rejected','rejected'],['expired','session_expired','expired'],
    ['cancelled','session_aborted','unverified'],['error','provider_error','unverified'],
    ['error','test_flow_only','unverified'],['error','flow_not_approved','unverified']
   ]){
    await reset();const {id}=await begin(20);
    assert.deepEqual(await finish(id,20,state,code),{applied:true,state});
    assert.equal((await profile()).identity_verification_state,expected);
    assert.equal((await profile()).identity_verified_at,null);
    const completed=await attempt(id);
    assert.equal(completed.state,state);assert.equal(completed.last_error_code,code);assert.ok(completed.completed_at);
    assert.equal((await finish(id,20,state,code)).applied,false);
    assert.deepEqual(await attempt(id),completed);
    assert.equal((await confirm(id,20)).applied,false);
   }
  });

  await t.test('an older result cannot overwrite the latest pending or verified attempt',async()=>{
   await reset();const old=await begin(30);
   // A legacy interrupted attempt can remain processing while support permits a retry.
   await db.exec("update member_profiles set identity_verification_state='unverified'");
   const latest=await begin(31);
   for(const operation of [()=>finish(old.id,30),()=>confirm(old.id,30)])assert.equal((await operation()).applied,false);
   assert.equal((await profile()).identity_verification_state,'pending');
   assert.equal((await attempt(latest.id)).state,'processing');
   assert.equal((await confirm(latest.id,31)).applied,true);
   assert.equal((await finish(old.id,30,'expired','session_expired')).applied,false);
   assert.equal((await finish(latest.id,31,'cancelled','session_aborted')).applied,false);
   assert.equal((await profile()).identity_verification_state,'verified');
   assert.equal((await profile()).identity_verification_ref_hash,hash(31));
  });

  await t.test('administrative revocation and passport suspension are never undone by provider events',async()=>{
   for(const patch of ["identity_verification_state='revoked'","passport_state='suspended'"]){
    await reset();const {id}=await begin(40);
    await db.exec('update member_profiles set '+patch);
    const before=await profile();
    assert.equal((await finish(id,40)).applied,false);
    assert.equal((await confirm(id,40)).applied,false);
    assert.deepEqual(await profile(),before);
    assert.equal((await attempt(id)).state,'processing');
   }
  });

  await t.test('wrong reference, missing consent, and ambiguous equal start times fail closed',async()=>{
   await reset();const {id}=await begin(50);
   assert.equal((await finish(id,999)).applied,false);
   await db.query('update passport_identity_verification_attempts set provider_consent_at=null where id=$1',[id]);
   assert.equal((await finish(id,50)).applied,false);
   assert.equal((await confirm(id,50)).applied,false);
   await db.query('update passport_identity_verification_attempts set provider_consent_at=now() where id=$1',[id]);
   await db.query("insert into passport_identity_verification_attempts(user_id,provider,provider_session_ref_hash,state,started_at,provider_consent_at,provider_consent_version) select user_id,'idnow',$2,'processing',started_at,now(),1 from passport_identity_verification_attempts where id=$1",[id,hash(51)]);
   assert.equal((await finish(id,50)).applied,false);
   assert.equal((await confirm(id,50)).applied,false);
   assert.equal((await profile()).identity_verification_state,'pending');
  });

  await t.test('the negative outcome RPC cannot manufacture a verified identity or accept arbitrary errors',async()=>{
   await reset();const {id}=await begin(60);
   for(const [state,code] of [['verified','provider_accepted'],['error','user_supplied_message'],['expired','provider_rejected'],[null,'provider_error'],['error',null]]){
    await assert.rejects(finish(id,60,state,code),/Résultat/);
   }
   assert.equal((await profile()).identity_verification_state,'pending');
  });

  await t.test('both browser roles are denied all attempt transitions; only the server can call them',async()=>{
   await reset();const {id}=await begin(70);
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(begin(71),/permission denied/);
    await assert.rejects(finish(id,70),/permission denied/);
    await assert.rejects(confirm(id,70),/permission denied/);
    await db.exec('reset role');
   }
   await db.exec('set role service_role');
   assert.equal((await finish(id,70)).applied,true);
   await db.exec('reset role');
  });
 }finally{await db.close();}
});
