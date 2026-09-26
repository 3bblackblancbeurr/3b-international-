import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRelyingParty,relyingPartyCanAuthorize,relyingPartyIsProduction} from '../src/passport/relying-party.js';

test('a relying party must use an explicit HTTPS origin and known Passport scopes',()=>{
 const party=normalizeRelyingParty({
  clientKey:'stylcam.sandbox',
  displayName:'Stylcam Sandbox',
  redirectOrigins:['https://sandbox.example.test','javascript:alert(1)','http://insecure.test'],
  allowedScopes:['passport.basic','profile.public','unknown.all'],
  status:'sandbox',
 });
 assert.ok(party);
 assert.deepEqual(party.redirectOrigins,['https://sandbox.example.test']);
 assert.deepEqual(party.allowedScopes,['passport.basic','profile.public']);
});

test('disabled or revoked relying parties can never authorize',()=>{
 for(const status of ['disabled','revoked']){
  const party=normalizeRelyingParty({
   clientKey:'partner.test',
   displayName:'Partner',
   redirectOrigins:['https://partner.test'],
   allowedScopes:['passport.basic'],
   status,
  });
  assert.equal(relyingPartyCanAuthorize(party,'https://partner.test',['passport.basic']),false);
 }
});

test('redirect origin and every requested scope must match the registered contract',()=>{
 const party=normalizeRelyingParty({
  clientKey:'partner.sandbox',
  displayName:'Partner Sandbox',
  redirectOrigins:['https://partner.test'],
  allowedScopes:['passport.basic','profile.public'],
  status:'sandbox',
 });
 assert.equal(relyingPartyCanAuthorize(party,'https://partner.test',['passport.basic']),true);
 assert.equal(relyingPartyCanAuthorize(party,'https://evil.test',['passport.basic']),false);
 assert.equal(relyingPartyCanAuthorize(party,'https://partner.test',['economy.read']),false);
 assert.equal(relyingPartyIsProduction(party),false);
});
