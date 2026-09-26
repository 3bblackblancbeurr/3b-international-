import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  PASSPORT_CONTRACT_VERSION,
  PASSPORT_MODULE_SCOPES,
  PASSPORT_SCOPES,
  formatPassportCode,
  isPassportOperational,
  publicPassportClaim,
} from '../src/passport/contract.js';

const PUBLIC_ID='4f87d51c-62ab-4d10-8f11-9270c1a2b3c4';

test('Passport v2 public code is opaque and stable',()=>{
  assert.equal(PASSPORT_CONTRACT_VERSION,2);
  assert.equal(
    formatPassportCode(PUBLIC_ID),
    '3B-PASS-4F87D51C-62AB4D10-8F119270-C1A2B3C4',
  );
  assert.equal(formatPassportCode('not-a-uuid'),'');
});

test('only active server-backed Passports unlock protected modules',()=>{
  assert.equal(isPassportOperational({
    userId:'internal-account',
    passportPublicId:PUBLIC_ID,
    passportState:'active',
  }),true);
  assert.equal(isPassportOperational({
    userId:'internal-account',
    passportPublicId:PUBLIC_ID,
    passportState:'revoked',
  }),false);
  assert.equal(isPassportOperational({
    userId:'internal-account',
    passportState:'active',
  }),false);
});

test('external basic claim never leaks internal account or economy data',()=>{
  const claim=publicPassportClaim({
    userId:'123e4567-e89b-12d3-a456-426614174000',
    passportPublicId:PUBLIC_ID,
    passportId:formatPassportCode(PUBLIC_ID),
    passportState:'active',
    issuedAt:'2026-09-26T00:00:00Z',
    handle:'amina3b',
    name:'Amina',
    country:'Maroc',
    countryCode:'MA',
    value:'Noblesse',
    xp:900,
    points:450,
  });
  assert.equal(claim.subject,formatPassportCode(PUBLIC_ID));
  assert.equal(Object.hasOwn(claim,'userId'),false);
  assert.equal(Object.hasOwn(claim,'xp'),false);
  assert.equal(Object.hasOwn(claim,'points'),false);
  assert.equal(Object.hasOwn(claim,'profile'),false);
  assert.equal(Object.hasOwn(claim,'origin'),false);
});

test('profile and origin are disclosed only through explicit scopes',()=>{
  const claim=publicPassportClaim({
    passportPublicId:PUBLIC_ID,
    passportId:formatPassportCode(PUBLIC_ID),
    passportState:'active',
    issuedAt:'2026-09-26T00:00:00Z',
    handle:'amina3b',
    name:'Amina',
    country:'Maroc',
    countryCode:'MA',
    value:'Noblesse',
  },[PASSPORT_SCOPES.BASIC,PASSPORT_SCOPES.PROFILE,PASSPORT_SCOPES.ORIGIN]);
  assert.deepEqual(claim.profile,{
    handle:'amina3b',
    name:'Amina',
    publicVerified:false,
    publicTitle:'',
  });
  assert.deepEqual(claim.origin,{
    country:'Maroc',
    countryCode:'MA',
    value:'Noblesse',
  });
});

test('all major 3B surfaces have a declared Passport scope contract',()=>{
  for(const module of ['passport','world3b','city3b','nosbloc','games','shop','community','sport']){
    assert.ok(Array.isArray(PASSPORT_MODULE_SCOPES[module]),module);
    assert.ok(PASSPORT_MODULE_SCOPES[module].includes(PASSPORT_SCOPES.BASIC),module);
  }
});

test('member client hydrates the canonical Passport identity RPC',()=>{
  const client=readFileSync(new URL('../src/loyalty/client.js',import.meta.url),'utf8');
  assert.match(client,/passport_identity_snapshot/);
  assert.match(client,/passport_public_id/);
});

test('member API is ready to carry Passport v2 fields when redeployed',()=>{
  const api=readFileSync(new URL('../supabase/functions/member-api/index.ts',import.meta.url),'utf8');
  for(const field of ['passport_public_id','passport_issued_at','passport_version','passport_state']){
    assert.match(api,new RegExp(field));
  }
});

test('legacy Passport demo data contains no baked personal or unverifiable security claim',()=>{
  const data=readFileSync(new URL('../src/passport/passportData.js',import.meta.url),'utf8');
  assert.doesNotMatch(data,/3bblackblancbeurre@gmail\.com/i);
  assert.doesNotMatch(data,/Biométrie.*ACTIVE/i);
  assert.doesNotMatch(data,/AES-256/i);
  assert.doesNotMatch(data,/Intégrité des données.*100%/i);
});

test('live card does not label every authenticated account as verified identity',()=>{
  const visual=readFileSync(new URL('../src/components/PassportVisual.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(visual,/active \? "IDENTITÉ VÉRIFIÉE"/);
  assert.match(visual,/PASSEPORT ACTIF/);
});
