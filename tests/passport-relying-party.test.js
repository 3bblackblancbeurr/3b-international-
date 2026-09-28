import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRelyingParty,relyingPartyCanAuthorize,relyingPartyIsProduction} from '../src/passport/relying-party.js';

test('relying parties require registered HTTPS origins and known scopes',()=>{
 const party=normalizeRelyingParty({
  clientKey:'partner.sandbox',
  displayName:'Partner Sandbox',
  redirectOrigins:['https://partner.test','http://insecure.test','javascript:alert(1)'],
  allowedScopes:['passport.basic','identity.verified','unknown.root'],
  status:'sandbox'
 });
 assert.ok(party);
 assert.deepEqual(party.redirectOrigins,['https://partner.test']);
 assert.deepEqual(party.allowedScopes,['passport.basic','identity.verified']);
 assert.equal(party.explicitConsentRequired,true);
});

test('revoked parties, unknown origins and extra scopes fail closed',()=>{
 const party=normalizeRelyingParty({
  clientKey:'partner.sandbox',
  displayName:'Partner',
  redirectOrigins:['https://partner.test'],
  allowedScopes:['passport.basic'],
  status:'sandbox'
 });
 assert.equal(relyingPartyCanAuthorize(party,'https://partner.test',['passport.basic']),true);
 assert.equal(relyingPartyCanAuthorize(party,'https://evil.test',['passport.basic']),false);
 assert.equal(relyingPartyCanAuthorize(party,'https://partner.test',['age.over18']),false);
 assert.equal(relyingPartyIsProduction(party),false);
 assert.equal(relyingPartyCanAuthorize({...party,status:'revoked'},'https://partner.test',['passport.basic']),false);
});
