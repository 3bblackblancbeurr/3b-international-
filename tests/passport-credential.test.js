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
  handle:'amina3b',
  name:'Amina El Mansouri',
  countryCode:'MA',
  value:'Noblesse',
};

test('Passport vNext uses an opaque public id instead of exposing the auth id',()=>{
  const subject=createPassportCredentialSubject(identity,{
    passport_public_id:PUBLIC_ID,
    assurance_level:'verified',
    status:'active',
    credential_version:2,
  });
  assert.equal(subject.id,`urn:3b:passport:${PUBLIC_ID}`);
  assert.equal(subject.passportNumber,'3B-PASS-123E4567E89B42D3');
  assert.doesNotMatch(subject.passportNumber,/internal-auth-id/i);
  assert.equal(subject.assurance,'verified');
  assert.equal(subject.credentialVersion,2);
});

test('invalid public identifiers cannot mint a credential subject',()=>{
  assert.equal(normalizePassportPublicId('member-1'),null);
  assert.equal(passportNumberFromPublicId('member-1'),null);
  assert.equal(createPassportCredentialSubject(identity,{passport_public_id:'member-1'}),null);
});

test('only active recognized assurance levels are presentable',()=>{
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'active',assurance:'member'}),true);
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'revoked',assurance:'verified'}),false);
  assert.equal(canPresentPassportCredential({id:'x',passportNumber:'p',status:'active',assurance:'invented'}),false);
});

test('credential type is standards-friendly without claiming government identity',()=>{
  assert.deepEqual(passportCredentialType(),['VerifiableCredential','ThreeBPassportCredential']);
});
