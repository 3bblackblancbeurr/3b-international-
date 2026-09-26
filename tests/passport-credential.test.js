import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePassportPublicId,
  passportNumberFromPublicId,
  createPassportCredentialSubject,
  canPresentPassportCredential,
  passportCredentialType,
} from '../src/passport/credential.js';

const PUBLIC_ID='123e4567-e89b-42d3-a456-426614174000';
const identity={
  userId:'internal-auth-id',
  passportPublicId:PUBLIC_ID,
  passportState:'active',
  passportVersion:2,
  passportIssuedAt:'2026-09-26T14:58:25.000Z',
  handle:'amina3b',
  name:'Amina El Mansouri',
  countryCode:'MA',
  value:'Noblesse',
  public_verified:true,
};

test('Passport vNext uses the canonical opaque public id instead of exposing the auth id',()=>{
  const subject=createPassportCredentialSubject(identity);
  assert.equal(subject.id,`urn:3b:passport:${PUBLIC_ID}`);
  assert.equal(subject.passportNumber,'3B-PASS-123E4567E89B42D3');
  assert.doesNotMatch(subject.passportNumber,/internal-auth-id/i);
  assert.equal(subject.assurance,'verified');
  assert.equal(subject.status,'active');
  assert.equal(subject.credentialVersion,2);
  assert.equal(subject.issuedAt,'2026-09-26T14:58:25.000Z');
});

test('invalid or missing public identifiers cannot mint a credential subject',()=>{
  assert.equal(normalizePassportPublicId('member-1'),null);
  assert.equal(passportNumberFromPublicId('member-1'),null);
  assert.equal(createPassportCredentialSubject({...identity,passportPublicId:'member-1'}),null);
});

test('only active recognized assurance levels are presentable',()=>{
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'active',assurance:'member'}),true);
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'revoked',assurance:'verified'}),false);
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'active',assurance:'invented'}),false);
});

test('credential type is standards-friendly without claiming government identity',()=>{
  assert.deepEqual(passportCredentialType(),['VerifiableCredential','ThreeBPassportCredential']);
});
