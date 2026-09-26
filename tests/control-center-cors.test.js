import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/functions/control-center/index.ts',import.meta.url),'utf8');

test('Control Center keeps the deployed owner-user-id authorization guard',()=>{
  assert.match(source,/select=enabled,owner_email,owner_user_id,max_devices,pairing_ttl_seconds/);
  assert.match(source,/if\(ownerUserId\)/);
  assert.match(source,/if\(user\.id!==ownerUserId\)throw new Failure\(403/);
});

test('Control Center accepts browser preflight only through its explicit CORS contract',()=>{
  assert.match(source,/req\.method==='OPTIONS'/);
  assert.match(source,/status:204/);
  assert.match(source,/Access-Control-Allow-Headers/);
  assert.match(source,/Access-Control-Allow-Methods':'POST,OPTIONS'/);
  assert.match(source,/https:\/\/3b-international\.vercel\.app/);
  assert.match(source,/capacitor:\/\/localhost/);
  assert.match(source,/origin&&!ORIGINS\.has\(origin\)/);
  assert.doesNotMatch(source,/Access-Control-Allow-Origin':'\*'/);
});
