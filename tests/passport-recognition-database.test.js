import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {generateSigningJWK} from '../shared/passport-recognition.js';

const migration=readFileSync(new URL('../supabase/migrations/20261002190934_passport_external_recognition_v1.sql',import.meta.url),'utf8');
const user='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const session='00000000-0000-4000-8000-000000000003';
const otherSession='00000000-0000-4000-8000-000000000004';
const hash=n=>String(n).padStart(64,'0');

test('Postgres enforces recognition consent, audience, revocation, live claims and QR single use',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
   create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql as $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user)$$;
   create table public.member_profiles(user_id uuid primary key references auth.users,passport_public_id uuid unique default gen_random_uuid(),passport_state text default 'active',passport_version smallint default 2,passport_issued_at timestamptz default now(),name text default 'Membre test',handle text default 'test',country text default 'France',public_verified boolean default false,public_title text,identity_verification_state text default 'unverified',identity_assurance_level text default 'account_verified',identity_verified_at timestamptz,identity_verification_provider text,identity_verification_ref_hash text);
   create table public.digital_store_entitlements(user_id uuid,product_code text,status text);
   create table public.member_entitlements(user_id uuid,plan_code text,status text,current_period_end timestamptz);
   create table public.passport_identity_verification_attempts(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users,provider text,provider_session_ref_hash text,state text,started_at timestamptz default now(),completed_at timestamptz,expires_at timestamptz,last_error_code text);
   create table public.passport_partner_consents(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users on delete cascade,client_id text,scopes text[],consent_version smallint,granted_at timestamptz,revoked_at timestamptz);
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260926150431_passport_verification_ticket_foundation.sql',import.meta.url),'utf8'));
  await db.exec(migration);
  for(const uid of [user,other]){await db.query('insert into auth.users values($1)',[uid]);await db.query('insert into member_profiles(user_id) values($1)',[uid]);}
  await db.query('insert into auth.sessions values($1,$2),($3,$4)',[session,user,otherSession,other]);
  const partner=(await db.query("insert into passport_recognition_partners(name,website,audience,allowed_scopes,api_key_hash,active) values('Partenaire de test','https://partner.test','https://partner.test/verification',array['passport.basic','identity.verified','profile.public','access.entitlements'],$1,true) returning id",[hash(99)])).rows[0].id;
  const partner2=(await db.query("insert into passport_recognition_partners(name,website,audience,allowed_scopes,api_key_hash,active) values('Autre test','https://other.test','https://other.test/verification',array['passport.basic'],$1,true) returning id",[hash(98)])).rows[0].id;
  const issue=async(n,scopes=['passport.basic'],consent=true,uid=user,sid=session)=>{
   const result=await db.query('select passport_recognition_issue_v1($1,$2,$3,$4,$5,$6,$7,$8) as proof',[uid,sid,partner,scopes,hash(n),'pairwise_'+hash(42),'https://issuer.test',consent]);
   return result.rows[0].proof;
  };
  const consume=async(proof,n,pid=partner,payload=proof.payload)=> (await db.query('select passport_recognition_consume_v1($1,$2,$3) as result',[pid,hash(n),payload])).rows[0].result;

  await t.test('only approved parties and explicit consent can issue',async()=>{
   await assert.rejects(issue(1,['passport.basic'],false),/accord/);
   await assert.rejects(issue(1,['age.over18']),/autorisées/);
   await assert.rejects(issue(1,['passport.basic','passport.basic']),/invalides/);
   await assert.rejects(issue(1,['passport.basic'],true,user,otherSession),/Session/);
   await db.query('update passport_recognition_partners set active=false where id=$1',[partner]);
   await assert.rejects(issue(1),/Partenaire/);
   await db.query('update passport_recognition_partners set active=true where id=$1',[partner]);
   const proof=await issue(1);
   assert.deepEqual(proof.payload.claims,{passport_active:true,passport_version:2});
   assert.equal(JSON.stringify(proof.payload).includes(user),false);
   assert.equal(JSON.stringify(proof.payload).includes('Membre test'),false);
   await assert.rejects(issue(1),/unique/);
   await assert.rejects(consume(proof,1,partner2),/invalide/);
   await assert.rejects(consume(proof,2),/invalide/);
   await assert.rejects(consume(proof,1,partner,{...proof.payload,aud:'https://other.test/verification'}),/invalide/);
   assert.equal((await consume(proof,1)).valid,true);
   await assert.rejects(consume(proof,1),/déjà utilisée/);
  });

  await t.test('civil identity requires provider evidence; current downgrades invalidate proof',async()=>{
   await assert.rejects(issue(2,['identity.verified']),/non vérifiée/);
   await db.query("update member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',identity_verified_at=now() where user_id=$1",[user]);
   await assert.rejects(issue(2,['identity.verified']),/non vérifiée/);
   await db.query("update member_profiles set identity_verification_provider='test-provider',identity_verification_ref_hash=$2 where user_id=$1",[user,hash(35)]);
   const proof=await issue(2,['identity.verified']);
   assert.deepEqual(proof.payload.claims,{identity_verified:true});
   await db.query("update member_profiles set identity_verification_state='revoked' where user_id=$1",[user]);
   await assert.rejects(consume(proof,2),/non vérifiée/);
   await db.query("update member_profiles set identity_verification_state='verified' where user_id=$1",[user]);
   assert.equal((await consume(proof,2)).valid,true);
  });

  await t.test('entitlements and public information are separately scoped and rechecked',async()=>{
   await db.query("insert into digital_store_entitlements values($1,'premium-course','active')",[user]);
   await db.query("insert into member_entitlements values($1,'gold','active',now()+interval '1 day')",[user]);
   const proof=await issue(3,['access.entitlements','profile.public']);
   assert.deepEqual(proof.payload.claims.entitlements,['digital:premium-course','plan:gold']);
   assert.equal(proof.payload.claims.display_name,'Membre test');
   assert.equal(Object.hasOwn(proof.payload.claims,'identity_verified'),false);
   await db.query("update digital_store_entitlements set status='revoked' where user_id=$1",[user]);
   await assert.rejects(consume(proof,3),/changé/);
   await db.query("update digital_store_entitlements set status='active' where user_id=$1",[user]);
   assert.equal((await consume(proof,3)).valid,true);
  });

  await t.test('owner revocation also revokes consent; suspension and expiration fail closed',async()=>{
   const proof=await issue(4);
   assert.equal((await db.query('select passport_recognition_revoke_v1($1,$2,$3) as revoked',[other,otherSession,proof.id])).rows[0].revoked,false);
   await db.query("update member_profiles set passport_state='suspended' where user_id=$1",[user]);
   await assert.rejects(consume(proof,4),/inactif/);
   await db.query("update member_profiles set passport_state='active' where user_id=$1",[user]);
   assert.equal((await db.query('select passport_recognition_revoke_v1($1,$2,$3) as revoked',[user,session,proof.id])).rows[0].revoked,true);
   await assert.rejects(consume(proof,4),/invalide/);
   assert.equal((await db.query('select count(*)::int as n from passport_partner_consents where revoked_at is not null')).rows[0].n,1);
   const expired=await issue(5);
   await db.query("update passport_recognition_proofs set issued_at=now()-interval '10 minutes',expires_at=now()-interval '5 minutes' where id=$1",[expired.id]);
   await assert.rejects(consume(expired,5),/expirée/);
  });

  await t.test('atomic QR issuance revokes earlier codes and concurrent consumption succeeds once',async()=>{
   const qr=async n=>(await db.query("select passport_ticket_issue_v1($1,$2,$3,now()+interval '4 minutes') as ticket",[user,session,hash(n)])).rows[0].ticket;
   const old=await qr(11);const fresh=await qr(12);
   await assert.rejects(db.query('select passport_ticket_consume_v1($1)',[hash(11)]),/invalide/);
   const attempts=await Promise.allSettled([db.query('select passport_ticket_consume_v1($1) as profile',[hash(12)]),db.query('select passport_ticket_consume_v1($1) as profile',[hash(12)])]);
   assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(attempts.filter(r=>r.status==='rejected').length,1);
   const profile=attempts.find(r=>r.status==='fulfilled').value.rows[0].profile;
   assert.equal(profile.passport_state,'active');assert.equal(Object.hasOwn(profile,'user_id'),false);
   const revoked=await qr(13);
   assert.equal((await db.query('select passport_ticket_revoke_v1($1,$2,$3) as revoked',[other,otherSession,revoked.ticket_id])).rows[0].revoked,false);
   assert.equal((await db.query('select passport_ticket_revoke_v1($1,$2,$3) as revoked',[user,session,revoked.ticket_id])).rows[0].revoked,true);
   await assert.rejects(db.query('select passport_ticket_consume_v1($1)',[hash(13)]),/invalide/);
   await assert.rejects(db.query("select passport_ticket_issue_v1($1,$2,$3,now()+interval '20 minutes')",[user,session,hash(14)]),/invalide/);
   assert.notEqual(old.ticket_id,fresh.ticket_id);
  });

  await t.test('database blocks client access to proof issuance, private keys and tables',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    await assert.rejects(db.query('select * from passport_recognition_proofs'),/permission denied/);
    await assert.rejects(db.query('select * from passport_recognition_partners'),/permission denied/);
    await assert.rejects(db.query('select passport_recognition_signing_material_v1()'),/permission denied/);
    await assert.rejects(db.query('select passport_recognition_claims_v1($1,$2)',[user,['passport.basic']]),/permission denied/);
    await db.exec('reset role');
   }
   await db.query('delete from auth.sessions where id=$1',[session]);
   await assert.rejects(issue(6),/Session/);
  });

  await t.test('feature closure stops issue and consumption but owner revocation remains available',async()=>{
   const proof=await issue(51,['passport.basic'],true,other,otherSession);
   await db.exec('update passport_recognition_settings set enabled=false');
   await assert.rejects(issue(52,['passport.basic'],true,other,otherSession),/désactivée/);
   await assert.rejects(consume(proof,51),/désactivée/);
   assert.equal((await db.query('select passport_recognition_revoke_v1($1,$2,$3) as revoked',[other,otherSession,proof.id])).rows[0].revoked,true);
   await db.exec('update passport_recognition_settings set enabled=true');
  });

  await t.test('a late IDnow result cannot restore a revoked identity or superseded attempt',async()=>{
   const attempt=(await db.query("insert into passport_identity_verification_attempts(user_id,provider,provider_session_ref_hash,state,provider_consent_at,provider_consent_version) values($1,'idnow',$2,'processing',now(),1) returning id",[other,hash(73)])).rows[0].id;
   const confirm=async()=> (await db.query('select passport_identity_confirm_production_v1($1,$2) as result',[attempt,hash(73)])).rows[0].result;
   await db.query("update member_profiles set identity_verification_state='revoked' where user_id=$1",[other]);
   assert.equal((await confirm()).applied,false);
   await db.query("update member_profiles set identity_verification_state='pending',passport_state='suspended' where user_id=$1",[other]);
   assert.equal((await confirm()).applied,false);
   await db.query("update member_profiles set passport_state='active' where user_id=$1",[other]);
   assert.equal((await confirm()).applied,true);
   assert.equal((await confirm()).applied,false);
   await db.query("update member_profiles set identity_verification_state='pending' where user_id=$1",[other]);
   await db.query("update passport_identity_verification_attempts set state='processing' where id=$1",[attempt]);
   await db.query("insert into passport_identity_verification_attempts(user_id,provider,provider_session_ref_hash,state,started_at) values($1,'idnow',$2,'processing',now()+interval '1 second')",[other,hash(74)]);
   assert.equal((await confirm()).applied,false);
  });

  await t.test('Vault bootstrap saves one stable key and never replaces it on a retry',async()=>{
   // In-memory Vault API fixture exercises the RPC logic; hosted Vault encryption
   // and privileges are separately checked on the actual Supabase installation.
   await db.exec(`create schema vault;
    create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,decrypted_secret text);
    create view vault.decrypted_secrets as select * from vault.secrets;
    create function vault.create_secret(value text,label text,description text) returns uuid language plpgsql as $$declare result uuid;begin insert into vault.secrets(name,decrypted_secret) values(label,value) returning id into result;return result;end$$;`);
   const jwk=await generateSigningJWK();
   const initial=(await db.query('select passport_recognition_signing_material_v1($1,$2) as material',[jwk,'first-entropy-material-for-test-only-0001'])).rows[0].material;
   const retry=(await db.query('select passport_recognition_signing_material_v1($1,$2) as material',[await generateSigningJWK(),'second-entropy-material-for-test-only-0002'])).rows[0].material;
   assert.deepEqual(retry,initial);
   assert.equal(initial.signing_jwk.kid,jwk.kid);
   assert.equal((await db.query('select count(*)::int as n from vault.secrets')).rows[0].n,2);
   await db.exec('update passport_recognition_settings set enabled=false');
   assert.deepEqual((await db.query('select passport_recognition_signing_material_v1() as material')).rows[0].material,{enabled:false});
  });
 }finally{await db.close();}
});
