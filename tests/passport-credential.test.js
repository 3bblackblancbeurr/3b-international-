import test from 'node:test';
import assert from 'node:assert/strict';
import {createPassportCredentialSubject,passportNumberFromPublicId,canPresentPassportCredential} from '../src/passport/credential.js';

const ID='8F501F17-07F0-4EDC-9CF1-1BE8BCB9D507';

test('credential uses only the opaque Passport public id',()=>{
 const subject=createPassportCredentialSubject({
  userId:'private-auth-uuid',passportPublicId:ID,passportState:'active',passportVersion:2,
  passportIssuedAt:'2026-09-26T14:58:25.000Z',handle:'amina3b',name:'Amina',countryCode:'MA',
  value:'Noblesse',identityVerificationStatus:'unverified',identityAssuranceLevel:'account',
  civilIdentityVerified:false
 });
 assert.equal(subject.passportNumber,'3B-PASS-'+ID);
 assert.ok(!subject.passportNumber.includes('private-auth-uuid'));
 assert.equal(subject.civilIdentityVerified,false);
 assert.equal(canPresentPassportCredential(subject),true);
});

test('invalid public ids cannot mint a Passport credential subject',()=>{
 assert.equal(passportNumberFromPublicId('member-1'),null);
 assert.equal(createPassportCredentialSubject({userId:'x',passportPublicId:'member-1',countryCode:'FR'}),null);
});
