import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIdentityAssurance,isCivilIdentityVerified} from '../src/passport/assurance.js';

const now=new Date('2026-09-28T12:00:00Z');

test('missing civil proof fails closed',()=>{
 const result=normalizeIdentityAssurance({},now);
 assert.equal(result.status,'unverified');
 assert.equal(result.level,'account');
 assert.equal(result.civilIdentityVerified,false);
});

test('a display badge or email-level account is never civil identity proof',()=>{
 const result=normalizeIdentityAssurance({
  public_verified:true,
  identity_verification_status:'verified',
  identity_assurance_level:'email',
  identity_verified_at:'2026-09-27T12:00:00Z'
 },now);
 assert.equal(result.civilIdentityVerified,false);
});

test('document proof becomes verified only with a real verification timestamp',()=>{
 const result=normalizeIdentityAssurance({
  identity_verification_status:'verified',
  identity_assurance_level:'document_liveness',
  identity_verified_at:'2026-09-27T12:00:00Z',
  identity_verification_expires_at:'2027-09-27T12:00:00Z',
  identity_age_over_18:true,
  identity_document_verified:true,
  identity_liveness_verified:true
 },now);
 assert.equal(result.civilIdentityVerified,true);
 assert.equal(result.ageOver18,true);
 assert.equal(isCivilIdentityVerified(result,now),true);
});

test('expired proof fails closed even if the stored status still says verified',()=>{
 const result=normalizeIdentityAssurance({
  identity_verification_status:'verified',
  identity_assurance_level:'high',
  identity_verified_at:'2025-01-01T00:00:00Z',
  identity_verification_expires_at:'2026-01-01T00:00:00Z'
 },now);
 assert.equal(result.status,'expired');
 assert.equal(result.civilIdentityVerified,false);
});
