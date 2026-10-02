import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const exists=path=>existsSync(new URL(path,root));
const checks=[];
const check=(id,ok,detail)=>checks.push({id,ok:Boolean(ok),detail});

const env=read('.env.example');
const trust=read('supabase/migrations/20260928125354_passport_identity_trust_foundation_v3.sql');
const consent=read('supabase/migrations/20260928125754_passport_identity_consent_v1.sql');
const auth=read('supabase/functions/member-auth/index.ts');
const passportData=read('src/passport/passportData.js');
const readiness=read('docs/passport/EXTERNAL_ACCEPTANCE_READINESS.md');

check('privacy_policy_present',exists('public/privacy-policy.html'),'Public privacy policy exists');
const privacyPolicy=read('public/privacy-policy.html');
const accountTerms=read('public/account-terms.html');
check(
  'privacy_contact_published',
  /mailto:3bblackblancbeurr@gmail\.com/.test(privacyPolicy),
  'A current public privacy-rights contact is published'
);
check(
  'account_terms_separate_declared_and_verified_identity',
  /ne constituent pas une identité vérifiée/.test(accountTerms)
    && /contrôle externe/.test(accountTerms),
  'Account terms do not equate self-declared civil claims with verified identity'
);
check('delete_account_present',exists('public/delete-account.html'),'Public account deletion flow exists');
const deletionPage=read('public/delete-account.html');
const deletionFunction=read('supabase/functions/delete-account/index.ts');
check(
  'delete_account_supports_v2_accounts',
  /functions\/v1\/member-auth/.test(deletionPage)
    && /identifier/.test(deletionPage)
    && !/accounts\.3b\.invalid/.test(deletionPage),
  'Public deletion authenticates through the current 3B member-auth flow'
);
check(
  'delete_account_checks_live_session',
  /loyalty_session_valid/.test(deletionFunction)
    && /session_id/.test(deletionFunction)
    && /delete-account/.test(deletionFunction),
  'Deletion rejects revoked/invalid sessions and is rate-limited'
);
check('incident_response_present',exists('docs/security/INCIDENT_RESPONSE_3B.md'),'Incident response document exists');
check('rgpd_register_present',exists('docs/legal/RGPD_REGISTER_DRAFT.md'),'RGPD working register exists');
check('acceptance_dossier_present',readiness.includes('Dossier de préparation aux acceptations externes'),'External acceptance dossier exists');
const birthGuardPath='supabase/migrations/20260928153842_member_identity_birth_date_guard_v1.sql';
check(
  'database_rejects_future_birth_dates',
  exists(birthGuardPath) && /birth_date <= current_date/.test(read(birthGuardPath)),
  'Database rejects future birth dates independently of client/server form validation'
);

check(
  'identity_provider_disabled_by_default',
  /PASSPORT_IDENTITY_VERIFICATION_ENABLED=false/.test(env),
  'Identity proofing is fail-closed in the example environment'
);
check(
  'provider_secrets_server_only',
  /IDNOW_CLIENT_ID=/.test(env)
    && /IDNOW_CLIENT_SECRET=/.test(env)
    && /IDNOW_FLOW_ID=/.test(env)
    && /IDNOW_WEBHOOK_AUDIENCE=/.test(env)
    && /PASSPORT_IDENTITY_REFERENCE_SECRET=/.test(env)
    && !/VITE_(?:IDNOW_CLIENT_SECRET|PASSPORT_IDENTITY_REFERENCE_SECRET)/.test(env),
  'The IDnow OAuth client/flow/audience and reference pepper are declared server-side; signed JWKS webhooks do not use a shared webhook secret'
);
check(
  'recognition_secrets_server_only',
  /PASSPORT_RECOGNITION_SIGNING_JWK=/.test(env)
    && /PASSPORT_RECOGNITION_PAIRWISE_SECRET=/.test(env)
    && /PASSPORT_RECOGNITION_ENABLED=false/.test(env)
    && !/VITE_PASSPORT_RECOGNITION_(?:SIGNING_JWK|PAIRWISE_SECRET)=/.test(env),
  'Recognition key material remains server-only and the example explicitly disables recognition'
);
check(
  'civil_claims_service_only',
  /create table if not exists public\.member_identity_claims/.test(trust)
    && /revoke all on public\.member_identity_claims from public, anon, authenticated/.test(trust)
    && /grant select, insert, update, delete on public\.member_identity_claims to service_role/.test(trust),
  'Self-declared civil claims are service-only'
);
check(
  'verification_attempts_service_only',
  /passport_identity_verification_attempts/.test(trust)
    && /revoke all on public\.passport_identity_verification_attempts from public, anon, authenticated/.test(trust),
  'Verification attempts are service-only'
);
check(
  'verified_requires_external_proof',
  /member_profiles_identity_verified_proof_check/.test(trust)
    && /identity_verification_provider is not null/.test(trust)
    && /identity_verification_ref_hash is not null/.test(trust)
    && /identity_assurance_level in \('identity_verified','high_assurance'\)/.test(trust),
  'Database constraint prevents self-asserted identity from becoming verified'
);
check(
  'identity_consent_separate',
  /'identity'/.test(consent)
    && /IDENTITY_CONSENT_VERSION/.test(auth)
    && /kind:'identity'/.test(auth),
  'Identity processing consent is versioned and separate'
);
check(
  'signup_collects_private_civil_claims',
  /member_identity_claims/.test(auth)
    && /legal_given_names/.test(auth)
    && /legal_family_name/.test(auth)
    && /birth_date/.test(auth),
  'Registration writes civil claims to the private service-only table'
);
check(
  'public_badge_not_civil_proof',
  readiness.includes('account_verified') && readiness.includes('identity_verified'),
  'Acceptance dossier separates account verification from civil identity verification'
);
check(
  'no_fake_security_claims',
  !/Biométrie.*ACTIVE/i.test(passportData)
    && !/AES-256/i.test(passportData)
    && !/Intégrité des données.*100%/i.test(passportData),
  'Legacy UI does not claim unimplemented biometric/encryption guarantees'
);
check(
  'raw_biometrics_not_in_schema',
  !/face_embedding|fingerprint_template|selfie_blob|raw_document|document_image/i.test(trust),
  'Identity schema contains no raw biometric/document storage fields'
);
check(
  'provider_acceptance_requirements_documented',
  /signature des webhooks/.test(readiness)
    && /idempotence/.test(readiness)
    && /rétention/.test(readiness)
    && /suppression/.test(readiness)
    && /mineurs/.test(readiness)
    && /tests anti-rejeu/.test(readiness),
  'Provider due-diligence gates are documented'
);

const value=(values,name)=>String(values[name]||'').trim();
const rawValue=(values,name)=>String(values[name]||'');
const httpsUrl=raw=>{
  if(typeof raw!=='string'||raw.length>2048||/\s/.test(raw))return false;
  try{
    const url=new URL(raw);
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash;
  }catch{return false;}
};
const result=(id,ok,detail)=>({id,ok:Boolean(ok),detail});

export function evaluateIdentityActivation(values={}){
  return [
    result('activation_explicitly_enabled',values.PASSPORT_IDENTITY_VERIFICATION_ENABLED==='true','PASSPORT_IDENTITY_VERIFICATION_ENABLED=true'),
    result('provider_selected',value(values,'PASSPORT_IDENTITY_PROVIDER').toLowerCase()==='idnow','The implemented provider adapter is idnow'),
    result('idnow_physical_environment_valid',['sandbox','production'].includes((value(values,'IDNOW_PHYSICAL_ENV')||'sandbox').toLowerCase()),'IDnow physical environment is sandbox or production'),
    result('idnow_logical_environment_valid',['staging','live'].includes((value(values,'IDNOW_LOGICAL_ENV')||'staging').toLowerCase()),'IDnow logical environment is staging or live'),
    result('idnow_external_environment_live',value(values,'IDNOW_PHYSICAL_ENV').toLowerCase()==='production'&&value(values,'IDNOW_LOGICAL_ENV').toLowerCase()==='live','External identity activation requires production/live; sandbox/staging configuration is not a real KYC attestation'),
    result('idnow_client_id_present',value(values,'IDNOW_CLIENT_ID').length>3,'IDNOW_CLIENT_ID is configured server-side'),
    result('idnow_client_secret_present',value(values,'IDNOW_CLIENT_SECRET').length>10,'IDNOW_CLIENT_SECRET is configured server-side'),
    result('idnow_flow_id_present',value(values,'IDNOW_FLOW_ID').length>8,'The approved IDnow flow identifier is configured'),
    result('idnow_webhook_audience_valid',httpsUrl(value(values,'IDNOW_WEBHOOK_AUDIENCE')),'IDNOW_WEBHOOK_AUDIENCE is an exact HTTPS audience without credentials, query or fragment'),
    result('idnow_flow_approved',values.IDNOW_PVID_FLOW_APPROVED==='true','The actual IDnow flow has been approved before an accepted outcome can become identity_verified'),
    result('reference_hash_secret_present',value(values,'PASSPORT_IDENTITY_REFERENCE_SECRET').length>=32,'Reference hashing secret is configured; its value is never reported'),
    result('captcha_required',values.MEMBER_CAPTCHA_REQUIRED==='true','Anti-bot is required for production identity enrollment'),
    result('leaked_password_protection_confirmed',values.PASSPORT_LEAKED_PASSWORD_PROTECTION_CONFIRMED==='true','Supabase leaked-password protection has been enabled and verified'),
    result('legal_review_approved',values.PASSPORT_IDENTITY_LEGAL_REVIEW_APPROVED==='true','Identity legal/privacy review is approved'),
    result('retention_policy_approved',values.PASSPORT_IDENTITY_RETENTION_POLICY_APPROVED==='true','Identity retention/deletion policy is approved'),
    result('minors_policy_approved',values.PASSPORT_IDENTITY_MINORS_POLICY_APPROVED==='true','Minor/age policy is approved'),
    result('sandbox_e2e_approved',values.PASSPORT_IDENTITY_SANDBOX_E2E_APPROVED==='true','Provider sandbox E2E, replay, duplicate and revocation tests are approved'),
  ];
}

function validSigningJwk(raw){
  try{
    const jwk=JSON.parse(raw);
    if(jwk?.kty!=='EC'||jwk.crv!=='P-256'||(jwk.alg&&jwk.alg!=='ES256')||(jwk.use&&jwk.use!=='sig'))return false;
    if(!['d','x','y'].every(name=>typeof jwk[name]==='string'&&/^[A-Za-z0-9_-]{43}$/.test(jwk[name])&&Buffer.from(jwk[name],'base64url').toString('base64url')===jwk[name]))return false;
    const privateKey=createPrivateKey({key:jwk,format:'jwk'});
    const publicKey=createPublicKey({key:{kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y},format:'jwk'});
    const challenge=Buffer.from('3b-recognition-readiness-key-consistency-v1');
    return verify('sha256',challenge,{key:publicKey,dsaEncoding:'ieee-p1363'},sign('sha256',challenge,{key:privateKey,dsaEncoding:'ieee-p1363'}));
  }catch{return false;}
}

export function evaluateRecognitionConfiguration(values={}){
  let jwkKid='';
  try{jwkKid=String(JSON.parse(value(values,'PASSPORT_RECOGNITION_SIGNING_JWK'))?.kid||'');}catch{}
  return [
    result('recognition_explicitly_enabled',values.PASSPORT_RECOGNITION_ENABLED==='true','Recognition is explicitly enabled independently of identity proofing'),
    result('recognition_issuer_valid',httpsUrl(rawValue(values,'PASSPORT_RECOGNITION_ISSUER')||rawValue(values,'APP_URL')||'https://3b-international.vercel.app'),'The issuer environment or backend fallback is a fixed HTTPS URL without credentials, whitespace, query or fragment'),
    result('recognition_signing_key_valid',validSigningJwk(value(values,'PASSPORT_RECOGNITION_SIGNING_JWK')),'A private EC P-256 JWK can sign and verify ES256; no key value is reported'),
    result('recognition_signing_kid_valid',/^[A-Za-z0-9._-]{1,64}$/.test(rawValue(values,'PASSPORT_RECOGNITION_SIGNING_KID')||jwkKid),'A safe signing key identifier is configured explicitly or in the JWK'),
    result('recognition_pairwise_secret_present',value(values,'PASSPORT_RECOGNITION_PAIRWISE_SECRET').length>=32,'A server-only pairwise pseudonym secret is configured'),
  ];
}

function recognitionMigrationSource(){
  const migrations=readdirSync(new URL('supabase/migrations/',root)).filter(name=>name.endsWith('.sql')&&name.includes('recognition'));
  return migrations.map(name=>read('supabase/migrations/'+name)).join('\n');
}

function permissionStatement(source,prefix,objectName,direction,roles){
  const pattern=new RegExp('\\b'+prefix+'\\s+([^;]*?)\\s+'+direction+'\\s+([^;]+);','gi');
  for(const match of source.matchAll(pattern)){
    const names=match[1];
    const targets=match[2].split(',').map(role=>role.trim().toLowerCase());
    if(new RegExp('\\b'+objectName.replaceAll('.','\\.')+'(?=\\s|,|\\(|$)','i').test(names)&&roles.every(role=>targets.includes(role)))return true;
  }
  return false;
}

function recognitionSchemaReady(){
  const source=recognitionMigrationSource();
  return /create\s+table\s+(?:if not exists\s+)?public\.passport_recognition_partners/i.test(source)
    && /create\s+table\s+(?:if not exists\s+)?public\.passport_recognition_proofs/i.test(source)
    && ['public.passport_recognition_partners','public.passport_recognition_proofs'].every(name=>
      permissionStatement(source,'revoke\\s+all\\s+on(?:\\s+table)?',name,'from',['public','anon','authenticated'])
      && permissionStatement(source,'grant\\s+select\\s*,\\s*insert\\s*,\\s*update\\s*,\\s*delete\\s+on(?:\\s+table)?',name,'to',['service_role'])
      && new RegExp('alter\\s+table\\s+'+name.replaceAll('.','\\.')+'\\s+enable\\s+row\\s+level\\s+security','i').test(source));
}

function recognitionVaultFallbackImplemented(){
  const path='supabase/functions/passport-recognition/index.ts';
  if(!exists(path))return false;
  const source=recognitionMigrationSource();
  const servicePath='shared/passport-recognition-service.js';
  const runtimeSource=read(path)+(exists(servicePath)?read(servicePath):'');
  return runtimeSource.includes('passport_recognition_signing_material_v1')
    && source.includes('vault.decrypted_secrets')
    && permissionStatement(source,'grant\\s+execute\\s+on\\s+function','public.passport_recognition_signing_material_v1','to',['service_role'])
    && permissionStatement(source,'revoke\\s+all\\s+on\\s+function','public.passport_recognition_signing_material_v1','from',['public','anon','authenticated']);
}

export function buildPassportReadinessReport(mode='foundation',values={}){
  if(!['foundation','activation','recognition'].includes(mode))throw new Error('Unknown readiness mode');
  const foundationReady=checks.every(item=>item.ok);
  const activationChecks=mode==='activation'?evaluateIdentityActivation(values):[];
  const environmentRecognitionChecks=mode==='recognition'?evaluateRecognitionConfiguration(values):[];
  const vaultFallbackImplemented=recognitionVaultFallbackImplemented();
  const vaultDependencies={
    recognition_explicitly_enabled:'PASSPORT_RECOGNITION_ENABLED',
    recognition_signing_key_valid:'PASSPORT_RECOGNITION_SIGNING_JWK',
    recognition_signing_kid_valid:'PASSPORT_RECOGNITION_SIGNING_KID',
    recognition_pairwise_secret_present:'PASSPORT_RECOGNITION_PAIRWISE_SECRET',
  };
  const recognitionChecks=environmentRecognitionChecks.map(item=>{
    const name=vaultDependencies[item.id];
    const suppliedJwkNeedsOwnKid=item.id==='recognition_signing_kid_valid'&&rawValue(values,'PASSPORT_RECOGNITION_SIGNING_JWK');
    if(!item.ok&&name&&!rawValue(values,name)&&vaultFallbackImplemented&&!suppliedJwkNeedsOwnKid){
      return {...item,ok:true,deferredToRuntime:true,detail:item.detail+'; absent environment value is deferred to the service-role-only Vault RPC. Runtime material/enabled state is not inspected.'};
    }
    return item;
  });
  const partnerRegistrySchemaReady=recognitionSchemaReady();
  const allChecks=[...checks,...activationChecks,...recognitionChecks,...(mode==='recognition'?[result('recognition_registry_schema_service_only',partnerRegistrySchemaReady,'Partner/proof registry tables have RLS and client revocations in source; deployment and actual partners are not inspected')]:[])];
  const recognitionConfigured=mode==='recognition'&&environmentRecognitionChecks.every(item=>item.ok);
  return {
    ok:allChecks.every(item=>item.ok),mode,foundationReady,
    externalActivationReady:mode==='activation'&&foundationReady&&activationChecks.every(item=>item.ok),
    assessmentScope:'Static repository/configuration checks and declared approval gates only; no provider network request, deployed database audit, legal certification or official recognition is performed.',
    recognition:{
      configurationReady:recognitionConfigured?true:recognitionChecks.some(item=>item.deferredToRuntime)&&recognitionChecks.every(item=>item.ok)?null:false,
      signingConfigured:mode==='recognition'&&environmentRecognitionChecks.filter(item=>item.id!=='recognition_explicitly_enabled').every(item=>item.ok),
      vaultFallbackImplemented,
      runtimeSigningReady:null,
      partnerRegistrySchemaReady,
      partnersReady:null,
      externalAcceptanceConfirmed:false,
      status:'requires_live_partner_registry_check',
      detail:'Static checks do not inspect the deployed partner allowlist, authenticate a real integrator or certify official recognition. Use the authenticated passport-recognition readiness endpoint for live status.',
    },
    checks:allChecks,
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const mode=process.argv.includes('--activation')?'activation':process.argv.includes('--recognition-check')?'recognition':'foundation';
  const report=buildPassportReadinessReport(mode,process.env);
  console.log(JSON.stringify(report,null,2));
  if(!report.ok)process.exitCode=1;
}
