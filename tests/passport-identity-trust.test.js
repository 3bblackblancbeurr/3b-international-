import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPassportAccess, hasVerifiedIdentity} from '../src/passport/access.js';
import {passportFromProfile} from '../src/passport/identity.js';

const UID='123e4567-e89b-12d3-a456-426614174000';
const PUBLIC_ID='8f501f17-07f0-4edc-9cf1-1be8bcb9d507';

const profile=overrides=>({
  user_id:UID,
  passport_public_id:PUBLIC_ID,
  passport_issued_at:'2026-09-26T14:58:25.000Z',
  passport_version:2,
  passport_state:'active',
  identity_verification_state:'verified',
  identity_assurance_level:'identity_verified',
  identity_verified_at:'2026-09-28T12:00:00.000Z',
  handle:'amina3b',
  name:'Amina El Mansouri',
  country:'Maroc',
  xp:0,
  points:0,
  ...overrides,
});

test('Passport access requires an active server-backed Passport',()=>{
  assert.equal(hasPassportAccess(null),false);
  assert.equal(hasPassportAccess({userId:'u',passportState:'active'}),true);
  assert.equal(hasPassportAccess({userId:'u',passportState:'suspended'}),false);
  assert.equal(hasPassportAccess({userId:'u',passportState:'revoked'}),false);
  assert.equal(hasPassportAccess({userId:'u',passportState:'expired'}),false);
});

test('civil identity verification is separate from account verification',()=>{
  assert.equal(hasVerifiedIdentity({identityVerificationStatus:'verified',identityAssuranceLevel:'identity_verified'}),true);
  assert.equal(hasVerifiedIdentity({identityVerificationStatus:'verified',identityAssuranceLevel:'high_assurance'}),true);
  assert.equal(hasVerifiedIdentity({identityVerificationStatus:'pending',identityAssuranceLevel:'identity_verified'}),false);
  assert.equal(hasVerifiedIdentity({identityVerificationStatus:'verified',identityAssuranceLevel:'account_verified'}),false);
});

test('identity metadata is mapped without exposing provider references',()=>{
  const passport=passportFromProfile(profile(),{id:UID});
  assert.equal(passport.identityVerificationStatus,'verified');
  assert.equal(passport.identityAssuranceLevel,'identity_verified');
  assert.equal(passport.identityVerifiedAt,'2026-09-28T12:00:00.000Z');
  assert.equal(Object.hasOwn(passport,'identity_verification_ref_hash'),false);
});

test('production identity foundation is privacy-first and service-only',()=>{
  const source=readFileSync(new URL('../supabase/migrations/20260928125354_passport_identity_trust_foundation_v3.sql',import.meta.url),'utf8');
  assert.match(source,/member_identity_claims/);
  assert.match(source,/passport_identity_verification_attempts/);
  assert.match(source,/passport_partner_consents/);
  assert.match(source,/revoke all on public\.member_identity_claims from public, anon, authenticated/);
  assert.doesNotMatch(source,/face_embedding|fingerprint_template|raw_document|document_image|selfie_blob/i);
});

test('live Passport visual delegates civil verification to the trust policy',()=>{
  const source=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
  assert.match(source,/hasVerifiedIdentity\(identity\)/);
  assert.doesNotMatch(source,/active \? "IDENTITÉ VÉRIFIÉE"/);
});

test('legacy UI no longer claims fake biometric or encryption guarantees',()=>{
  const source=readFileSync(new URL('../src/passport/passportData.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Biométrie.*ACTIVE/i);
  assert.doesNotMatch(source,/AES-256/i);
  assert.doesNotMatch(source,/Intégrité des données.*100%/i);
});


test('database rejects future birth dates for private civil claims',()=>{
  const source=readFileSync(new URL('../supabase/migrations/20260928153842_member_identity_birth_date_guard_v1.sql',import.meta.url),'utf8');
  assert.match(source,/birth_date <= current_date/);
});
