import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const trust=readFileSync(new URL('../supabase/migrations/20260928125354_passport_identity_trust_foundation_v3.sql',import.meta.url),'utf8');
const consent=readFileSync(new URL('../supabase/migrations/20260928125754_passport_identity_consent_v1.sql',import.meta.url),'utf8');
const auth=readFileSync(new URL('../supabase/functions/member-auth/index.ts',import.meta.url),'utf8');
const verifier=readFileSync(new URL('../supabase/functions/passport-verify/index.ts',import.meta.url),'utf8');
const passportIdentity=readFileSync(new URL('../supabase/functions/passport-identity/index.ts',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/loyalty/client.js',import.meta.url),'utf8');
const account=readFileSync(new URL('../src/loyalty/AccountPage.jsx',import.meta.url),'utf8');
const visual=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
const staticPassport=readFileSync(new URL('../src/passport/passportData.js',import.meta.url),'utf8');

test('civil identity trust cannot become verified from self-declared fields alone',()=>{
 assert.match(trust,/identity_verification_state text not null default 'unverified'/);
 assert.match(trust,/identity_verification_state <> 'verified'/);
 assert.match(trust,/identity_verified_at is not null/);
 assert.match(trust,/identity_verification_provider is not null/);
 assert.match(trust,/identity_verification_ref_hash is not null/);
 assert.match(trust,/identity_assurance_level in \('identity_verified','high_assurance'\)/);
 assert.match(auth,/identity_verification_state:'unverified'/);
 assert.doesNotMatch(auth,/identity_verification_state:'verified'/);
});

test('declared legal identity is private service-only data with separate consent',()=>{
 assert.match(trust,/create table if not exists public\.member_identity_claims/);
 assert.match(trust,/revoke all on public\.member_identity_claims from public, anon, authenticated/);
 assert.match(trust,/member_identity_claims_deny_anon/);
 assert.match(trust,/member_identity_claims_deny_authenticated/);
 assert.match(consent,/kind in \('terms','privacy','marketing','identity'\)/);
 assert.match(auth,/kind:'identity'/);
 assert.match(account,/identityDataAccepted/);
 assert.doesNotMatch(account,/profile\.user_id\.toUpperCase/);
});

test('passport verification uses civil trust state, never the public role badge',()=>{
 assert.match(verifier,/verified:profile\.identity_verification_state==='verified'/);
 assert.doesNotMatch(verifier,/verified:profile\.public_verified/);
 assert.match(verifier,/publicTitle:profile\.public_verified===true/);
 assert.match(passportIdentity,/identityVerified:profile\.identity_verification_state==='verified'/);
 assert.match(visual,/identityVerificationState === "verified"/);
});

test('passport security foundation stores no raw document or biometric columns',()=>{
 assert.doesNotMatch(trust,/\n\s*(document_image|document_scan|selfie|face_template|biometric_template)\s+/i);
 assert.match(trust,/Raw document images, biometric templates and provider payloads are not stored here/);
 assert.match(staticPassport,/Biométrie", value: "NON STOCKÉE PAR 3B"/);
 assert.doesNotMatch(staticPassport,/Biométrie", value: "ACTIVE"/);
 assert.doesNotMatch(staticPassport,/Chiffrement", value: "AES-256"/);
 assert.doesNotMatch(staticPassport,/Intégrité des données", value: "100%"/);
});

test('passkeys are wired through Supabase WebAuthn behind a release gate',()=>{
 assert.match(client,/experimental:\{passkey:true\}/);
 assert.match(client,/VITE_PASSKEY_ENABLED/);
 assert.match(client,/auth\.registerPasskey\(\)/);
 assert.match(client,/auth\.signInWithPasskey\(\)/);
 assert.match(client,/auth\.passkey\.list\(\)/);
 assert.match(account,/Ajouter une Passkey/);
 assert.match(account,/Se connecter avec une Passkey/);
});

test('public passport numbers use the complete opaque public identifier',()=>{
 assert.match(verifier,/replaceAll\('-',''\)\.toUpperCase\(\)/);
 assert.doesNotMatch(verifier,/slice\(0,16\)/);
 assert.match(passportIdentity,/replaceAll\('-',''\)\.toUpperCase\(\)/);
 assert.doesNotMatch(passportIdentity,/slice\(0,16\)/);
});
