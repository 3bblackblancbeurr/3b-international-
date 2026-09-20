import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('server secrets stay placeholders in .env.example',()=>{
  const env=read('.env.example');
  for(const key of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'TWILIO_AUTH_TOKEN',
  ]){
    assert.match(env,new RegExp('^'+key+'=\\s*$','m'),key+' must remain blank in the public repository');
  }
});

test('real env files remain ignored',()=>{
  const ignore=read('.gitignore');
  assert.match(ignore,/^\.env\*$/m);
  assert.match(ignore,/^!\.env\.example$/m);
});

test('browser Supabase client contains no server secret material',()=>{
  const client=read('src/loyalty/client.js');
  assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
  assert.match(client,/sb_publishable_/);
});

test('world synchronization requires an authenticated bearer session',()=>{
  const save=read('src/world/save.js');
  assert.match(save,/Authorization:'Bearer '\+session\.access_token/);
  assert.match(save,/functions\/v1\/world-engine/);
});

test('Fortress least-privilege migration keeps economy flags read-only for members',()=>{
  const sql=read('supabase/migrations/20260920161246_threeb_fortress_foundation_hardening_20260920.sql');
  assert.match(sql,/revoke all privileges[\s\S]*threeb_economy_flags from anon/i);
  assert.match(sql,/grant select[\s\S]*threeb_economy_flags to authenticated/i);
  assert.match(sql,/threeb_wallet_apply_server[\s\S]*set search_path = ''/i);
});

test('database XP invariant matches the server wallet upper bound',()=>{
  const sql=read('supabase/migrations/20260920161644_threeb_economy_xp_cap_alignment_20260920.sql');
  assert.match(sql,/xp >= 0 and xp <= 1000000000/i);
});
