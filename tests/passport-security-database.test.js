import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createHash} from 'node:crypto';

const U='123e4567-e89b-12d3-a456-426614174000',OTHER='123e4567-e89b-12d3-a456-426614174001';
const S='123e4567-e89b-12d3-a456-426614174002',OS='123e4567-e89b-12d3-a456-426614174003';
const HASH='a'.repeat(64),REF='b'.repeat(64),PROOF='c'.repeat(64),SECRET='d'.repeat(64),CTX='e'.repeat(64),KEY='f'.repeat(32);
let db;
const first=async(sql,args=[])=> (await db.query(sql,args)).rows[0];
const value=async(sql,args=[])=>Object.values(await first(sql,args))[0];
before(async()=>{
  db=new PGlite();await db.waitReady;
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
    create table public.passport_verification_tickets(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,consumed_at timestamptz,revoked_at timestamptz);
    create table public.member_profiles(user_id uuid primary key references auth.users(id),passport_state text default 'active',passport_public_id uuid default gen_random_uuid(),created_at timestamptz default now());
    create function public.loyalty_session_valid(p_user uuid,p_session uuid) returns boolean language sql security invoker set search_path='' as
      $$select exists(select 1 from auth.sessions where id=p_session and user_id=p_user);$$;`);
  for(const file of ['20260928125354_passport_identity_trust_foundation_v3.sql','20260930180000_passport_identity_atomic_lifecycle_v4.sql','20260930181000_passport_partner_passkeys_pilot_v1.sql','20260930203000_passport_cards_v1.sql'])
    await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
});
beforeEach(async()=>{
  await db.exec(`truncate auth.users cascade; truncate passport_partner_clients cascade;`);
  await db.query(`insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now());`,[U,OTHER]);
  await db.query(`insert into auth.sessions(id,user_id) values($1,$2),($3,$4);`,[S,U,OS,OTHER]);
  await db.query(`insert into member_profiles(user_id) values($1),($2);`,[U,OTHER]);
  await db.query(`insert into member_identity_claims(user_id,legal_given_names,legal_family_name,birth_date) values($1,'Synthetic','Fixture','1990-01-01');`,[U]);
  await db.query(`insert into passport_partner_clients(client_id,display_name,audience,secret_hash,purpose,allowed_scopes,enabled,reviewed_at)
    values('partner-one','Synthetic partner','https://partner.example/verify',$1,'Synthetic fixture purpose',array['passport.basic','identity.verified'],true,now());`,[SECRET]);
  await db.query(`insert into passport_passkeys(credential_id,user_id,public_key,counter,device_type,backed_up) values($1,$2,$3,0,'multiDevice',true);`,[KEY,U,'x'.repeat(32)]);
});
after(async()=>{await db?.close();});

const cardReference='9'.repeat(64),secondReference='8'.repeat(64);
const cardIssue=()=>value('select passport_card_issue($1,$2,$3,$4,$5)',[U,S,cardReference,'physical','Synthetic card']);
const cardContext=id=>createHash('sha256').update('card_activate:'+id).digest('hex');
async function activeCard(){const id=await cardIssue();await stepup('credential_manage',cardContext(id));await value('select passport_card_activate($1,$2,$3,$4)',[U,S,id,PROOF]);await db.query('delete from passport_stepup_proofs where proof_hash=$1',[PROOF]);return id;}
const cardRequest=()=>value(`select passport_partner_card_request_create('partner-one',$1,'https://partner.example/verify',$2,array['passport.basic','identity.verified'],$3,$4)`,[SECRET,'n'.repeat(32),HASH,cardReference]);

const createRequest=()=>value(`select passport_partner_request_create('partner-one',$1,'https://partner.example/verify',$2,array['passport.basic','identity.verified'],$3)`,[SECRET,'n'.repeat(32),HASH]);
async function stepup(purpose='partner_approve',context=HASH,proof=PROOF) {
  await db.query(`insert into passport_stepup_proofs(proof_hash,user_id,session_id,credential_id,purpose,context_hash) values($1,$2,$3,$4,$5,$6)`,[proof,U,S,KEY,purpose,context]);
}
const approve=()=>value(`select passport_partner_approve($1,$2,$3,array['passport.basic','identity.verified'],$4,$5)`,[U,S,HASH,'3bp_'+'1'.repeat(64),PROOF]);
const redeem=(patch={})=>value(`select passport_partner_redeem($1,$2,$3,$4,$5)`,[patch.client||'partner-one',patch.secret||SECRET,HASH,patch.audience||'https://partner.example/verify',patch.nonce||'n'.repeat(32)]);

test('migration compiles; every new table and RPC denies real anonymous/authenticated roles',async()=>{
  const tables=['passport_partner_clients','passport_partner_requests','passport_passkey_accounts','passport_passkeys','passport_webauthn_challenges','passport_stepup_proofs','passport_cards','passport_auth_capabilities'];
  for(const role of ['anon','authenticated']) {
    await db.exec('set role '+role);
    for(const table of tables)await assert.rejects(db.query('select * from '+table),/permission denied/);
    await assert.rejects(db.query('select passport_identity_attempt_begin($1)',[U]),/permission denied/);
    await assert.rejects(db.query('select passport_partner_approve($1,$2,$3,$4,$5,$6)',[U,S,HASH,['passport.basic'],'3bp_'+'1'.repeat(64),PROOF]),/permission denied/);
    await assert.rejects(db.query('select passport_recovery_revoke($1)',[U]),/permission denied/);
    await db.exec('reset role');
  }
  const functions=(await db.query(`select p.oid::regprocedure::text as name,has_function_privilege('authenticated',p.oid,'execute') as allowed
    from pg_proc p where p.proname like 'passport_%' and p.pronamespace='public'::regnamespace`)).rows;
  assert.ok(functions.length>=13);assert.equal(functions.filter(row=>row.allowed).length,0);
});

test('printed reference is inactive by default; scan resolves only for its authenticated holder and leaks no reference hash',async()=>{
 const id=await cardIssue();await assert.rejects(cardRequest(),/unavailable/);
 const card=await value('select passport_card_resolve($1,$2,$3)',[U,S,cardReference]);assert.equal(card.id,id);assert.equal(card.state,'issued');
 await assert.rejects(value('select passport_card_resolve($1,$2,$3)',[OTHER,OS,cardReference]),/unavailable/);
 await assert.rejects(value('select passport_card_resolve($1,$2,$3)',[U,OS,cardReference]),/session expired/);
 const cards=await value('select passport_card_list($1,$2)',[U,S]);assert.equal(cards.length,1);assert.ok(!JSON.stringify(cards).includes(cardReference));
 assert.equal((await value('select passport_card_list($1,$2)',[OTHER,OS])).length,0);
});
test('activation needs holder, current session, exact card context and a one-use unexpired UV proof',async()=>{
 const id=await cardIssue();await stepup('credential_manage',CTX);
 await assert.rejects(value('select passport_card_activate($1,$2,$3,$4)',[U,S,id,PROOF]),/stepup invalid/);
 await db.query('update passport_stepup_proofs set context_hash=$1 where proof_hash=$2',[cardContext(id),PROOF]);
 await assert.rejects(value('select passport_card_activate($1,$2,$3,$4)',[OTHER,OS,id,PROOF]),/unavailable/);
 await assert.rejects(value('select passport_card_activate($1,$2,$3,$4)',[U,OS,id,PROOF]),/session expired/);
 assert.equal(await value('select passport_card_activate($1,$2,$3,$4)',[U,S,id,PROOF]),true);
 await assert.rejects(value('select passport_card_activate($1,$2,$3,$4)',[U,S,id,PROOF]),/unavailable/);
 const second=await value('select passport_card_issue($1,$2,$3,$4,$5)',[U,S,secondReference,'digital','Second']);
 await assert.rejects(value('select passport_card_activate($1,$2,$3,$4)',[U,S,second,PROOF]),/stepup invalid/);
});
test('another logged-in account cannot approve or decline a card-bound request; failed approval is rolled back',async()=>{
 await activeCard();await cardRequest();
 await db.query(`insert into passport_passkeys(credential_id,user_id,public_key,counter,device_type,backed_up) values($1,$2,$3,0,'multiDevice',true)`,['other'.repeat(6),OTHER,'x'.repeat(32)]);
 await db.query(`insert into passport_stepup_proofs(proof_hash,user_id,session_id,credential_id,purpose,context_hash) values($1,$2,$3,$4,'partner_approve',$5)`,[PROOF,OTHER,OS,'other'.repeat(6),HASH]);
 await assert.rejects(value(`select passport_partner_approve($1,$2,$3,array['passport.basic','identity.verified'],$4,$5)`,[OTHER,OS,HASH,'3bp_'+'1'.repeat(64),PROOF]),/holder mismatch/);
 assert.equal(await value('select count(*)::integer from passport_partner_consents where user_id=$1',[OTHER]),0);
 assert.equal(await value('select consumed_at from passport_stepup_proofs where proof_hash=$1',[PROOF]),null);
 await assert.rejects(value('select passport_partner_decline($1,$2,$3)',[OTHER,OS,HASH]),/holder mismatch/);
 assert.equal(await value('select state from passport_partner_requests where request_hash=$1',[HASH]),'pending');
});
test('card-backed partner proof is minimal, single-use and records real presentation/control activity',async()=>{
 const id=await activeCard();await cardRequest();await stepup();await approve();
 const proof=await redeem();assert.equal(proof.passport_active,true);assert.equal(proof.identity_verified,false);
 for(const hidden of [U,cardReference,id,'Synthetic'])assert.ok(!JSON.stringify(proof).includes(hidden));
 await assert.rejects(redeem(),/unavailable/);
 const card=await first('select last_presented_at,last_proof_at from passport_cards where id=$1',[id]);assert.ok(card.last_presented_at);assert.ok(card.last_proof_at);
});
test('card revocation invalidates pending and approved proofs and stays available after Passport suspension',async()=>{
 const id=await activeCard();await cardRequest();await stepup();await approve();
 assert.equal(await value('select passport_card_revoke($1,$2,$3)',[OTHER,OS,id]),false);
 await db.query(`update member_profiles set passport_state='suspended' where user_id=$1`,[U]);
 assert.equal(await value('select passport_card_revoke($1,$2,$3)',[U,S,id]),true);await assert.rejects(redeem(),/unavailable/);
 assert.equal(await value('select state from passport_partner_requests where request_hash=$1',[HASH]),'revoked');
});
test('expired cards cannot authorize a request or redeem an already approved proof',async()=>{
 const id=await activeCard();await cardRequest();await stepup();await approve();
 await db.query(`update passport_cards set issued_at=now()-interval '3 days',expires_at=now()-interval '1 day' where id=$1`,[id]);
 await assert.rejects(redeem(),/card unavailable/);await assert.rejects(cardRequest(),/card unavailable/);
});
test('replacement is atomic, invalidates the old reference and starts inactive; recovery revokes all cards and bound requests',async()=>{
 const old=await activeCard();await cardRequest();
 await db.query('insert into passport_verification_tickets(user_id) values($1)',[U]);
 await assert.rejects(value('select passport_card_issue($1,$2,$3,$4,$5,$6)',[OTHER,OS,secondReference,'physical','Other',old]),/unavailable/);
 const replacement=await value('select passport_card_issue($1,$2,$3,$4,$5,$6)',[U,S,secondReference,'physical','Replacement',old]);
 assert.equal(await value('select state from passport_cards where id=$1',[old]),'revoked');assert.equal(await value('select state from passport_cards where id=$1',[replacement]),'issued');
 assert.equal(await value('select state from passport_partner_requests where request_hash=$1',[HASH]),'revoked');await assert.rejects(cardRequest(),/unavailable/);
 assert.equal(await value('select passport_recovery_revoke($1)',[U]),true);
 assert.equal(await value(`select count(*)::integer from passport_cards where user_id=$1 and state<>'revoked'`,[U]),0);
 assert.equal(await value('select count(*)::integer from passport_verification_tickets where user_id=$1 and revoked_at is null',[U]),0);
});
test('hosted-login qualification starts closed, cannot enable without evidence, and preserves its recovery marker after disabling',async()=>{
 assert.equal((await value('select passport_auth_capability()')).enabled,false);
 await assert.rejects(db.exec('update passport_auth_capabilities set initial_passkey_enabled=true'),/check constraint/);
 await assert.rejects(db.exec("update passport_auth_capabilities set initial_passkey_enabled=true,rp_id='3b.example',rp_origin='https://3b.example',qualified_at=now(),qualification_evidence=null"),/check constraint/);
 await db.query(`update passport_auth_capabilities set initial_passkey_enabled=true,rp_id='3b.example',rp_origin='https://3b.example',qualified_at=now(),qualification_evidence=$1`,['Synthetic hosted qualification and recovery evidence only for this test']);
 assert.equal((await value('select passport_auth_capability()')).everEnabled,true);
 await db.exec('update passport_auth_capabilities set initial_passkey_enabled=false,initial_passkey_ever_enabled=false');
 const capability=await value('select passport_auth_capability()');assert.equal(capability.enabled,false);assert.equal(capability.everEnabled,true);
});
test('historical public verifier civil claim requires fresh live production evidence and a matching provider reference',async()=>{
 await db.query(`update member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',identity_verified_at=now(),identity_verification_provider='idnow',identity_verification_ref_hash=$1 where user_id=$2`,[REF,U]);
 assert.equal(await value('select passport_identity_live_assertion($1,$2)',[U,REF]),false);
 await db.query(`insert into passport_identity_verification_attempts(user_id,provider,state,provider_session_ref_hash,production_live_verified) values($1,'idnow','verified',$2,true)`,[U,REF]);
 assert.equal(await value('select passport_identity_live_assertion($1,$2)',[U,REF]),true);assert.equal(await value('select passport_identity_live_assertion($1,$2)',[U,HASH]),false);
 await db.query(`update member_profiles set identity_verified_at=now()-interval '366 days' where user_id=$1`,[U]);assert.equal(await value('select passport_identity_live_assertion($1,$2)',[U,REF]),false);
});
test('identity reservation prevents concurrent starts; accepted terminal transition is atomic/idempotent',async()=>{
  const id=await value('select passport_identity_attempt_begin($1)',[U]);
  await assert.rejects(db.query('select passport_identity_attempt_begin($1)',[U]),/already pending/);
  assert.equal(await value('select passport_identity_attempt_bind($1,$2,null)',[id,REF]),true);
  assert.equal(await value(`select passport_identity_attempt_finish($1,'verified',$2,null)`,[id,REF]),'verified');
  const profile=await first('select identity_verification_state,identity_verification_ref_hash from member_profiles where user_id=$1',[U]);
  assert.deepEqual(profile,{identity_verification_state:'verified',identity_verification_ref_hash:REF});
  assert.equal(await value('select production_live_verified from passport_identity_verification_attempts where id=$1',[id]),true);
  assert.equal(await value(`select passport_identity_attempt_finish($1,'rejected',$2,'provider_rejected')`,[id,REF]),'already_terminal');
  assert.equal(await value('select identity_verification_state from member_profiles where user_id=$1',[U]),'verified');
});
test('provider error releases pending; delayed success cannot resurrect revoked identity',async()=>{
  let id=await value('select passport_identity_attempt_begin($1)',[U]);
  assert.equal(await value(`select passport_identity_attempt_finish($1,'error',null,'provider_error')`,[id]),'error');
  assert.equal(await value('select identity_verification_state from member_profiles where user_id=$1',[U]),'unverified');
  id=await value('select passport_identity_attempt_begin($1)',[U]);await value('select passport_identity_attempt_bind($1,$2,null)',[id,REF]);
  await db.query(`update member_profiles set identity_verification_state='revoked' where user_id=$1`,[U]);
  assert.equal(await value(`select passport_identity_attempt_finish($1,'verified',$2,null)`,[id,REF]),'stale_attempt');
  assert.equal(await value('select identity_verification_state from member_profiles where user_id=$1',[U]),'revoked');
});
test('live evidence older than the partner freshness window can be renewed',async()=>{
  const id=await value('select passport_identity_attempt_begin($1)',[U]);await value('select passport_identity_attempt_bind($1,$2,null)',[id,REF]);
  await value(`select passport_identity_attempt_finish($1,'verified',$2,null)`,[id,REF]);
  await assert.rejects(db.query('select passport_identity_attempt_begin($1)',[U]),/already verified/);
  await db.query(`update member_profiles set identity_verified_at=now()-interval '366 days' where user_id=$1`,[U]);
  assert.ok(await value('select passport_identity_attempt_begin($1)',[U]));
});
test('expired identity attempts never become verified and can be retried',async()=>{
  const id=await value('select passport_identity_attempt_begin($1)',[U]);await value('select passport_identity_attempt_bind($1,$2,null)',[id,REF]);
  await db.query(`update passport_identity_verification_attempts set started_at=now()-interval '20 minutes',expires_at=now()-interval '1 minute' where id=$1`,[id]);
  assert.equal(await value(`select passport_identity_attempt_finish($1,'verified',$2,null)`,[id,REF]),'expired');
  assert.equal(await value('select production_live_verified from passport_identity_verification_attempts where id=$1',[id]),false);
  assert.ok(await value('select passport_identity_attempt_begin($1)',[U]));
});
test('partner request requires registered secret, exact audience, reviewed enabled client and non-reused nonce',async()=>{
  await assert.rejects(db.query(`select passport_partner_request_create('partner-one',null,'https://partner.example/verify',$1,array['passport.basic'],$2)`,['n'.repeat(32),HASH]),/unauthorized/);
  await assert.rejects(db.query(`select passport_partner_request_create('partner-one',$1,'https://evil.example',$2,array['passport.basic'],$3)`,[SECRET,'n'.repeat(32),HASH]),/unauthorized/);
  await assert.rejects(db.query(`select passport_partner_request_create('partner-one',$1,'https://partner.example/verify',$2,array['age.over18'],$3)`,[SECRET,'n'.repeat(32),HASH]),/unauthorized/);
  await createRequest();await assert.rejects(createRequest(),/duplicate key/);
  await db.exec(`update passport_partner_clients set enabled=false`);
  await assert.rejects(db.query(`select passport_partner_request_create('partner-one',$1,'https://partner.example/verify',$2,array['passport.basic'],$3)`,[SECRET,'o'.repeat(32),REF]),/unauthorized/);
});
test('expired requests and stepup proofs are refused; declined requests remain closed',async()=>{
  await createRequest();await stepup();
  await db.exec(`update passport_stepup_proofs set expires_at=now()-interval '1 second'`);await assert.rejects(approve(),/stepup invalid/);
  await db.exec(`update passport_stepup_proofs set expires_at=now()+interval '1 minute'`);
  assert.equal(await value('select passport_partner_decline($1,$2,$3)',[U,S,HASH]),true);
  assert.equal(await value('select passport_partner_decline($1,$2,$3)',[U,S,HASH]),false);
  await assert.rejects(approve(),/request unavailable/);
});
test('consent must match scopes and live user/session/one-use stepup',async()=>{
  await createRequest();await stepup();
  await assert.rejects(db.query(`select passport_partner_approve($1,$2,$3,array['passport.basic'],$4,$5)`,[U,S,HASH,'3bp_'+'1'.repeat(64),PROOF]),/scope mismatch/);
  await assert.rejects(db.query(`select passport_partner_approve($1,$2,$3,array['passport.basic','identity.verified'],$4,$5)`,[OTHER,OS,HASH,'3bp_'+'1'.repeat(64),PROOF]),/stepup invalid/);
  await db.query('delete from auth.sessions where id=$1',[S]);await assert.rejects(approve(),/session expired/);
});
test('redemption is minimal, audience/nonce-bound, single-use; legacy verification cannot grant civil trust',async()=>{
  await db.query(`update member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',identity_verified_at=now(),identity_verification_provider='idnow',identity_verification_ref_hash=$1 where user_id=$2`,[REF,U]);
  await createRequest();await stepup();await approve();
  await assert.rejects(redeem({audience:'https://evil.example'}),/unauthorized/);
  await assert.rejects(redeem({nonce:'other'.repeat(8)}),/unavailable/);
  const claims=await redeem();assert.equal(claims.passport_active,true);assert.equal(claims.identity_verified,false);
  assert.deepEqual(Object.keys(claims).sort(),['audience','expires_at','identity_verified','issued_at','nonce','passport_active','subject','version']);
  const serialized=JSON.stringify(claims);for(const privateValue of [U,'Synthetic','Fixture','1990-01-01',REF])assert.ok(!serialized.includes(privateValue));
  await assert.rejects(redeem(),/unavailable/);
});
test('new live attestation grants identity boolean; later Passport revocation closes the proof',async()=>{
  const id=await value('select passport_identity_attempt_begin($1)',[U]);await value('select passport_identity_attempt_bind($1,$2,null)',[id,REF]);
  await value(`select passport_identity_attempt_finish($1,'verified',$2,null)`,[id,REF]);
  await createRequest();await stepup();await approve();assert.equal((await redeem()).identity_verified,true);
  await db.query(`insert into passport_partner_requests(client_id,request_hash,nonce,audience,scopes,user_id,consent_id,pairwise_subject,state)
    select client_id,$1,$2,audience,scopes,user_id,consent_id,pairwise_subject,'approved' from passport_partner_requests where request_hash=$3`,[REF,'z'.repeat(32),HASH]);
  await db.query(`update member_profiles set passport_state='revoked' where user_id=$1`,[U]);
  await assert.rejects(db.query(`select passport_partner_redeem('partner-one',$1,$2,'https://partner.example/verify',$3)`,[SECRET,REF,'z'.repeat(32)]),/unavailable/);
});
test('parallel redemption attempts yield exactly one proof',async()=>{
  await createRequest();await stepup();await approve();
  const results=await Promise.allSettled([redeem(),redeem()]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
});
test('consent revocation prevents redemption even on inactive Passport; cannot revoke another member consent',async()=>{
  await createRequest();await stepup();const id=await approve();
  assert.equal(await value('select passport_partner_revoke($1,$2,$3)',[OTHER,OS,id]),false);
  await db.query(`update member_profiles set passport_state='suspended' where user_id=$1`,[U]);
  assert.equal(await value('select passport_partner_revoke($1,$2,$3)',[U,S,id]),true);
  await assert.rejects(redeem(),/unavailable/);
});
test('challenge is user/session/purpose-bound, expiring and atomically consumed',async()=>{
  const id=await value(`insert into passport_webauthn_challenges(user_id,session_id,challenge_hash,purpose,context_hash) values($1,$2,$3,'partner_approve',$4) returning id`,[U,S,HASH,CTX]);
  await assert.rejects(db.query(`select passport_webauthn_take($1,$2,$3,'partner_approve')`,[OTHER,OS,id]),/challenge invalid/);
  await assert.rejects(db.query(`select passport_webauthn_take($1,$2,$3,'credential_manage')`,[U,S,id]),/challenge invalid/);
  assert.deepEqual(await value(`select passport_webauthn_take($1,$2,$3,'partner_approve')`,[U,S,id]),{challenge_hash:HASH,context_hash:CTX});
  await assert.rejects(db.query(`select passport_webauthn_take($1,$2,$3,'partner_approve')`,[U,S,id]),/challenge invalid/);
});
test('expired challenges fail; managing a key remains possible after Passport suspension',async()=>{
  const id=await value(`insert into passport_webauthn_challenges(user_id,session_id,challenge_hash,purpose,context_hash,created_at,expires_at)
    values($1,$2,$3,'credential_manage',$4,now()-interval '5 minutes',now()-interval '2 minutes') returning id`,[U,S,HASH,CTX]);
  await assert.rejects(db.query(`select passport_webauthn_take($1,$2,$3,'credential_manage')`,[U,S,id]),/challenge invalid/);
  await db.query(`update passport_webauthn_challenges set created_at=now(),expires_at=now()+interval '3 minutes' where id=$1`,[id]);
  await db.query(`update member_profiles set passport_state='suspended' where user_id=$1`,[U]);
  assert.ok(await value(`select passport_webauthn_take($1,$2,$3,'credential_manage')`,[U,S,id]));
  assert.equal(await value('select passport_webauthn_confirm($1,$2,$3,$4,0,0,$5)',[U,S,id,KEY,PROOF]),true);
  assert.equal(await value('select passport_passkey_revoke($1,$2,$3,$4,$5)',[U,S,KEY,PROOF,CTX]),true);
});
test('WebAuthn confirmation uses counter CAS, forbids revoked credentials and cannot complete twice',async()=>{
  const id=await value(`insert into passport_webauthn_challenges(user_id,session_id,challenge_hash,purpose,context_hash) values($1,$2,$3,'partner_approve',$4) returning id`,[U,S,HASH,CTX]);
  await value(`select passport_webauthn_take($1,$2,$3,'partner_approve')`,[U,S,id]);
  await assert.rejects(db.query('select passport_webauthn_confirm($1,$2,$3,$4,1,2,$5)',[U,S,id,KEY,PROOF]),/counter mismatch/);
  assert.equal(await value('select passport_webauthn_confirm($1,$2,$3,$4,0,0,$5)',[U,S,id,KEY,PROOF]),true);
  await assert.rejects(db.query('select passport_webauthn_confirm($1,$2,$3,$4,0,0,$5)',[U,S,id,KEY,REF]),/confirmation invalid/);
  await db.query(`update passport_passkeys set revoked_at=now() where credential_id=$1`,[KEY]);
  await assert.rejects(db.query(`select passport_stepup_consume($1,$2,$3,'partner_approve',$4)`,[U,S,PROOF,CTX]),/credential revoked/);
});
test('registration requires consumed challenge and an existing-key stepup; no fresh-session bypass',async()=>{
  const id=await value(`insert into passport_webauthn_challenges(user_id,session_id,challenge_hash,purpose,context_hash) values($1,$2,$3,'register',$4) returning id`,[U,S,HASH,CTX]);
  const args=[U,S,id,'q'.repeat(32),'k'.repeat(32),CTX];
  const sql=`select passport_webauthn_register($1,$2,$3,$4,$5,0,'{}','Synthetic key','multiDevice',true,null,$6)`;
  await assert.rejects(db.query(sql,args),/registration invalid/);
  await value(`select passport_webauthn_take($1,$2,$3,'register')`,[U,S,id]);
  await assert.rejects(db.query(sql,args),/stepup invalid/);
  await db.query('delete from passport_passkeys where user_id=$1',[U]);
  await db.query(`update auth.sessions set created_at=now()-interval '1 hour' where id=$1`,[S]);
  await assert.rejects(db.query(sql,args),/fresh sign-in required/);
  await db.query('update auth.sessions set created_at=now() where id=$1',[S]);assert.equal(await value(sql,args),true);
  await assert.rejects(db.query(sql,args),/registration invalid/);
});
test('key revocation consumes exact-context proof and recovery revokes every outstanding protection',async()=>{
  await createRequest();await stepup();const consent=await approve();
  await stepup('credential_manage',CTX,REF);
  await assert.rejects(db.query('select passport_passkey_revoke($1,$2,$3,$4,$5)',[U,S,KEY,REF,HASH]),/stepup invalid/);
  assert.equal(await value('select passport_recovery_revoke($1)',[U]),true);
  assert.ok(await value('select revoked_at is not null from passport_passkeys where credential_id=$1',[KEY]));
  assert.ok(await value('select revoked_at is not null from passport_partner_consents where id=$1',[consent]));
  assert.equal(await value('select state from passport_partner_requests where request_hash=$1',[HASH]),'revoked');
  assert.equal(await value('select count(*)::integer from passport_stepup_proofs where user_id=$1 and consumed_at is null',[U]),0);
  await assert.rejects(redeem(),/unavailable/);
});
