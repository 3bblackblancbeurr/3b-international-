import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSPORT_PARTNER_SCOPES,
  ageAt,
  buildPartnerClaims,
  derivePairwiseSubject,
  normalizePartnerScopes,
} from '../src/passport/partnerClaims.js';

const PUBLIC_ID='8f501f17-07f0-4edc-9cf1-1be8bcb9d507';
const SECRET='0123456789abcdef0123456789abcdef';
const profile=overrides=>({
  user_id:'123e4567-e89b-12d3-a456-426614174000',
  passport_public_id:PUBLIC_ID,
  passport_state:'active',
  identity_verification_state:'verified',
  identity_assurance_level:'identity_verified',
  handle:'amina3b',
  name:'Amina El Mansouri',
  country:'Maroc',
  xp:840,
  points:1250,
  ...overrides,
});

test('partner scopes are allowlisted and wildcards are impossible',()=>{
  assert.deepEqual(normalizePartnerScopes(['passport.basic','age.over18','age.over18']),['passport.basic','age.over18']);
  assert.throws(()=>normalizePartnerScopes(['*']),/unsupported_partner_scope/);
  assert.throws(()=>normalizePartnerScopes(['identity.birth_date']),/unsupported_partner_scope/);
  assert.equal(PASSPORT_PARTNER_SCOPES.includes('coins'),false);
  assert.equal(PASSPORT_PARTNER_SCOPES.includes('xp'),false);
});

test('pairwise subject is stable per partner but unlinkable across partners',async()=>{
  const first=await derivePairwiseSubject({passportPublicId:PUBLIC_ID,clientId:'shop-a',secret:SECRET});
  const same=await derivePairwiseSubject({passportPublicId:PUBLIC_ID,clientId:'shop-a',secret:SECRET});
  const other=await derivePairwiseSubject({passportPublicId:PUBLIC_ID,clientId:'shop-b',secret:SECRET});
  assert.equal(first,same);
  assert.notEqual(first,other);
  assert.match(first,/^3bp_[0-9a-f]{64}$/);
  assert.ok(!first.includes(PUBLIC_ID));
});

test('age calculation handles birthday boundaries without exposing the birth date',()=>{
  const now=new Date('2026-09-29T12:00:00.000Z');
  assert.equal(ageAt('2008-09-29',now),18);
  assert.equal(ageAt('2008-09-30',now),17);
  assert.equal(ageAt('2099-01-01',now),null);
});

test('age proof is a boolean only and requires verified civil identity',()=>{
  const now=new Date('2026-09-29T12:00:00.000Z');
  const subject='3bp_'+'a'.repeat(64);
  const claims=buildPartnerClaims({
    profile:profile(),
    identityClaim:{birth_date:'2000-02-29',legal_given_names:'Amina',legal_family_name:'El Mansouri'},
    subject,
    scopes:['passport.basic','identity.verified','age.over18'],
    now,
  });
  assert.equal(claims.identity_verified,true);
  assert.equal(claims.age_over_18,true);
  assert.equal(Object.hasOwn(claims,'birth_date'),false);
  assert.equal(Object.hasOwn(claims,'legal_given_names'),false);
  assert.equal(Object.hasOwn(claims,'legal_family_name'),false);

  const unverified=buildPartnerClaims({
    profile:profile({identity_verification_state:'pending'}),
    identityClaim:{birth_date:'2000-02-29'},
    subject,
    scopes:['age.over18'],
    now,
  });
  assert.equal(Object.hasOwn(unverified,'age_over_18'),false);
});

test('partner projection never leaks private account, economy or civil profile fields',()=>{
  const subject='3bp_'+'b'.repeat(64);
  const claims=buildPartnerClaims({
    profile:profile(),
    identityClaim:{birth_date:'1990-01-01'},
    subject,
    scopes:['passport.basic','profile.public','creator.status','access.entitlement'],
    creatorStatus:'active',
    entitlements:['member.discount','event:paris-2026','INVALID SPACE','member.discount'],
    now:new Date('2026-09-29T12:00:00.000Z'),
  });
  assert.equal(claims.public_handle,'amina3b');
  assert.equal(claims.creator_status,'active');
  assert.deepEqual(claims.entitlements,['member.discount','event:paris-2026']);
  for(const forbidden of ['user_id','passport_public_id','name','country','xp','points','birth_date']){
    assert.equal(Object.hasOwn(claims,forbidden),false,forbidden);
  }
});

test('inactive Passport returns no optional partner claims',()=>{
  const claims=buildPartnerClaims({
    profile:profile({passport_state:'revoked'}),
    identityClaim:{birth_date:'1990-01-01'},
    subject:'3bp_'+'c'.repeat(64),
    scopes:['identity.verified','age.over18','profile.public'],
  });
  assert.deepEqual(Object.keys(claims).sort(),['passport_active','subject','version']);
  assert.equal(claims.passport_active,false);
});
