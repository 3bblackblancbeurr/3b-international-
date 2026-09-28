import {existsSync, readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const exists=path=>existsSync(new URL(path,root));
const mode=process.argv.includes('--activation')?'activation':'foundation';

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
  /PASSPORT_IDENTITY_PROVIDER_API_KEY=/.test(env)
    && /PASSPORT_IDENTITY_PROVIDER_WEBHOOK_SECRET=/.test(env)
    && /PASSPORT_IDENTITY_REFERENCE_SECRET=/.test(env)
    && !/VITE_PASSPORT_IDENTITY_PROVIDER_API_KEY/.test(env),
  'Provider secrets are declared only as server-side variables'
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

const failed=checks.filter(x=>!x.ok);

if(mode==='activation'){
  const provider=(process.env.PASSPORT_IDENTITY_PROVIDER||'').trim();
  const apiKey=(process.env.PASSPORT_IDENTITY_PROVIDER_API_KEY||'').trim();
  const webhook=(process.env.PASSPORT_IDENTITY_PROVIDER_WEBHOOK_SECRET||'').trim();
  const referenceSecret=(process.env.PASSPORT_IDENTITY_REFERENCE_SECRET||'').trim();
  const enabled=process.env.PASSPORT_IDENTITY_VERIFICATION_ENABLED==='true';
  const captcha=process.env.MEMBER_CAPTCHA_REQUIRED==='true';
  const leakedPasswordProtection=process.env.PASSPORT_LEAKED_PASSWORD_PROTECTION_CONFIRMED==='true';
  const legalReview=process.env.PASSPORT_IDENTITY_LEGAL_REVIEW_APPROVED==='true';
  const retentionPolicy=process.env.PASSPORT_IDENTITY_RETENTION_POLICY_APPROVED==='true';
  const minorsPolicy=process.env.PASSPORT_IDENTITY_MINORS_POLICY_APPROVED==='true';
  const sandboxE2E=process.env.PASSPORT_IDENTITY_SANDBOX_E2E_APPROVED==='true';

  const activationChecks=[
    {id:'activation_explicitly_enabled',ok:enabled,detail:'PASSPORT_IDENTITY_VERIFICATION_ENABLED=true'},
    {id:'provider_selected',ok:provider.length>=2,detail:'A provider identifier is configured'},
    {id:'provider_api_key_present',ok:apiKey.length>=16,detail:'Provider API key is configured server-side'},
    {id:'provider_webhook_secret_present',ok:webhook.length>=24,detail:'Webhook verification secret is configured'},
    {id:'reference_hash_secret_present',ok:referenceSecret.length>=32,detail:'Reference hashing secret is configured'},
    {id:'captcha_required',ok:captcha,detail:'Anti-bot is required for production identity enrollment'},
    {id:'leaked_password_protection_confirmed',ok:leakedPasswordProtection,detail:'Supabase leaked-password protection has been enabled and verified'},
    {id:'legal_review_approved',ok:legalReview,detail:'Identity legal/privacy review is approved'},
    {id:'retention_policy_approved',ok:retentionPolicy,detail:'Identity retention/deletion policy is approved'},
    {id:'minors_policy_approved',ok:minorsPolicy,detail:'Minor/age policy is approved'},
    {id:'sandbox_e2e_approved',ok:sandboxE2E,detail:'Provider sandbox E2E, replay, duplicate and revocation tests are approved'}
  ];
  checks.push(...activationChecks);
  failed.push(...activationChecks.filter(x=>!x.ok));
}

const report={
  ok:failed.length===0,
  mode,
  foundationReady:checks.filter(x=>!x.id.startsWith('activation_')&&!['provider_selected','provider_api_key_present','provider_webhook_secret_present','reference_hash_secret_present','captcha_required'].includes(x.id)).every(x=>x.ok),
  externalActivationReady:mode==='activation' && failed.length===0,
  checks
};

console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
