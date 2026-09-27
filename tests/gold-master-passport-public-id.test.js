import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {passportFromProfile} from '../src/passport/identity.js';

const AUTH_UID='123e4567-e89b-12d3-a456-426614174000';
const PUBLIC_ID='8f501f17-07f0-4edc-9cf1-1be8bcb9d507';

const profile=overrides=>({
  user_id:AUTH_UID,
  passport_public_id:PUBLIC_ID,
  passport_issued_at:'2026-09-26T14:58:25.000Z',
  passport_version:2,
  passport_state:'active',
  handle:'amina3b',
  name:'Amina El Mansouri',
  country:'Maroc',
  xp:840,
  points:1250,
  theme:'explorer',
  created_at:'2026-09-20T00:00:00.000Z',
  ...overrides,
});

test('Gold Master member snapshot carries the opaque public Passport identity',()=>{
  const source=readFileSync('supabase/functions/member-api/index.ts','utf8');
  assert.match(source,/passport_public_id,passport_issued_at,passport_version,passport_state/);
});

test('Gold Master public labels use the opaque Passport ID, not the private account ID',()=>{
  const passport=passportFromProfile(profile(),{id:AUTH_UID});
  assert.equal(passport.passportId,'3B-PASS-'+PUBLIC_ID.toUpperCase());
  assert.equal(passport.memberId,'3B-MEM-'+PUBLIC_ID.toUpperCase());
  assert.ok(!passport.passportId.toLowerCase().includes(AUTH_UID));
  assert.ok(!passport.memberId.toLowerCase().includes(AUTH_UID));
});

test('Gold Master never falls back to the private account ID',()=>{
  const passport=passportFromProfile(profile({passport_public_id:null}),{id:AUTH_UID});
  assert.equal(passport.passportPublicId,null);
  assert.equal(passport.passportId,'3B-PASS-EN-ATTENTE');
  assert.equal(passport.memberId,'3B-MEM-EN-ATTENTE');
});
