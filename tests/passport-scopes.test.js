import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSPORT_SCOPES,
  DEFAULT_EXTERNAL_SCOPES,
  normalizePassportScopes,
  isSensitivePassportScope,
  requiresExplicitPassportConsent,
} from '../src/passport/scopes.js';

test('external apps receive only basic public scopes by default',()=>{
  assert.deepEqual(DEFAULT_EXTERNAL_SCOPES,['passport.basic','profile.public']);
  assert.deepEqual(normalizePassportScopes(null),['passport.basic','profile.public']);
});

test('unknown and duplicate scopes are rejected',()=>{
  assert.deepEqual(
    normalizePassportScopes(['passport.basic','unknown.root','passport.basic','city.read']),
    ['passport.basic','city.read']
  );
});

test('sensitive scopes require explicit consent',()=>{
  assert.equal(isSensitivePassportScope(PASSPORT_SCOPES.ECONOMY_READ),true);
  assert.equal(requiresExplicitPassportConsent(['passport.basic']),false);
  assert.equal(requiresExplicitPassportConsent(['passport.basic','inventory.read']),true);
});
