import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20261005225825_destin_passport_policy_alignment_v2.sql','utf8');

test('DESTIN database access matches the active-Passport cinema policy',()=>{
  assert.ok(migration.includes("'passportActive',true,'allowed',true,'code','ready'"));
  assert.ok(migration.includes("identity proof remains optional metadata"));
  assert.ok(migration.includes("p_action<>''catalog''"));
  assert.ok(migration.includes("Unexpected DESTIN passport gate version"));
});

test('civil identity remains informational after cinema access is granted',()=>{
  const accessGrant=migration.indexOf("'passportActive',true,'allowed',true,'code','ready'");
  const identityCheck=migration.indexOf("p.identity_verification_state");
  assert.ok(accessGrant>0);
  assert.ok(identityCheck>accessGrant);
});
