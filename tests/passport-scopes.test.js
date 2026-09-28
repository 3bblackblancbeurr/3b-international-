import test from 'node:test';
import assert from 'node:assert/strict';
import {PASSPORT_SCOPES,DEFAULT_EXTERNAL_SCOPES,normalizePassportScopes,isSensitivePassportScope,requiresExplicitPassportConsent} from '../src/passport/scopes.js';

test('external services receive only basic Passport presence by default',()=>{
 assert.deepEqual(DEFAULT_EXTERNAL_SCOPES,['passport.basic']);
 assert.deepEqual(normalizePassportScopes(null),['passport.basic']);
});

test('unknown scopes are removed and identity/age are sensitive',()=>{
 assert.deepEqual(normalizePassportScopes(['passport.basic','unknown.root','age.over18']),['passport.basic','age.over18']);
 assert.equal(isSensitivePassportScope(PASSPORT_SCOPES.IDENTITY_VERIFIED),true);
 assert.equal(isSensitivePassportScope(PASSPORT_SCOPES.AGE_OVER_18),true);
});

test('anything beyond basic Passport presence needs explicit consent',()=>{
 assert.equal(requiresExplicitPassportConsent(['passport.basic']),false);
 assert.equal(requiresExplicitPassportConsent(['passport.basic','profile.public']),true);
 assert.equal(requiresExplicitPassportConsent(['age.over18']),true);
});
