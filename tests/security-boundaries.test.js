import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

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

test('legacy passport fixture contains no personal email or verified-security claims',()=>{
  const fixture=read('src/passport/passportData.js');
  assert.doesNotMatch(fixture,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(fixture,/AES-256|INTÉGRITÉ DES DONNÉES[^\n]*100%|BIOMÉTRIE[^\n]*ACTIVE/i);
  assert.match(fixture,/Never use this file as an identity, authentication or wallet source of truth/);
});

test('GitHub Actions are pinned to immutable commit SHAs',()=>{
  const dir=new URL('../.github/workflows/',import.meta.url);
  for(const name of readdirSync(dir).filter(name=>/\.ya?ml$/.test(name))){
    const yaml=readFileSync(new URL(name,dir),'utf8');
    for(const match of yaml.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)){
      assert.match(match[2],/^[0-9a-f]{40}$/i,`${name}: ${match[1]} must use an immutable SHA`);
    }
  }
});

test('future postgres-owned public objects are private by default',()=>{
  const sql=read('supabase/migrations/20260920165411_fortress_postgres_default_privileges_private_by_default.sql');
  assert.match(sql,/alter default privileges for role postgres in schema public[\s\S]*revoke all on tables from anon, authenticated/i);
  assert.match(sql,/revoke all on sequences from anon, authenticated/i);
  assert.match(sql,/revoke execute on functions from public, anon, authenticated/i);
  assert.match(sql,/grant execute on functions to service_role/i);
});

test('disabled 3BC staging ledger is fail-closed and client-inaccessible',()=>{
  const sql=read('supabase/migrations/20260920163251_quarantine_disabled_3bc_sql_ledger_20260920.sql');
  assert.match(sql,/token_enabled\s*=\s*false/i);
  assert.match(sql,/token_blockchain_enabled\s*=\s*false/i);
  assert.match(sql,/token_trading_enabled\s*=\s*false/i);
  assert.match(sql,/revoke all[\s\S]*threeb_token_ledger from anon,\s*authenticated/i);
  assert.match(sql,/3bc_disabled_security_gate/i);
});

test('wallet and Vault documents create no real key material',()=>{
  const wallet=read('docs/3B_SECURITY/WALLET_ARCHITECTURE.md');
  const vault=read('docs/3B_SECURITY/VAULT_HSM_MPC_MULTISIG.md');
  assert.match(wallet,/No production keys, seeds, funds, wallet addresses or blockchain activation/i);
  assert.match(vault,/No real Vault, signer or reserve key is created/i);
  assert.doesNotMatch(wallet,/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
  assert.doesNotMatch(vault,/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/);
});

test('future 3BC transaction contract requires replay and domain separation fields',()=>{
  const schema=JSON.parse(read('docs/3B_SECURITY/3BC_TRANSACTION_ENVELOPE.schema.json'));
  for(const key of ['protocol_version','suite_id','network_id','sender','recipient','asset_id','amount','nonce','payload_hash','signature']){
    assert.ok(schema.required.includes(key),key);
  }
  assert.equal(schema.additionalProperties,false);
  assert.ok(!('private_key' in schema.properties));
  assert.ok(!('seed' in schema.properties));
});

test('Vault policy is an approval state machine and contains no signing secret field',()=>{
  const schema=JSON.parse(read('docs/3B_SECURITY/VAULT_OPERATION_POLICY.schema.json'));
  const states=schema.properties.state.enum;
  for(const required of ['requested','policy_checked','risk_checked','human_approved','threshold_approved','broadcast','reconciled','rejected']){
    assert.ok(states.includes(required),required);
  }
  assert.ok(!('private_key' in schema.properties));
  assert.ok(!('seed' in schema.properties));
  assert.ok(!('mnemonic' in schema.properties));
});

test('3BC release evidence is explicitly blocked until independently proven',()=>{
  const evidence=JSON.parse(read('docs/3B_SECURITY/CRYPTO_RELEASE_EVIDENCE.json'));
  assert.equal(evidence.state,'blocked');
  for(const [gate,value] of Object.entries(evidence.approvals)){
    assert.equal(value.approved,false,gate);
    assert.deepEqual(value.evidence_refs,[],gate);
  }
});

test('runtime code does not directly enable 3BC/testnet/mainnet gates',()=>{
  const files=[
    'supabase/functions/world-engine/index.ts',
    'supabase/functions/world-bootstrap/index.ts',
    'src/loyalty/AccountPage.jsx'
  ];
  const forbidden=/(token_enabled|token_blockchain_enabled|token_trading_enabled|testnet_authorized|mainnet_authorized)\s*[:=]\s*true/;
  for(const file of files){
    assert.doesNotMatch(read(file),forbidden,file);
  }
});
