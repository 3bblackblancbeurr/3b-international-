import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditSupabaseSecurity} from '../scripts/verify-supabase-security.mjs';

const shopMigration = readFileSync(
  new URL('../supabase/migrations/20261002184542_shop_checkout_hardening_v1.sql', import.meta.url),
  'utf8'
);

test('all public tables and SECURITY DEFINER functions keep the audited boundaries', () => {
  const audit = auditSupabaseSecurity();
  assert.equal(audit.ok, true, JSON.stringify(audit.problems));
  assert.ok(audit.publicTables >= 160);
  assert.ok(audit.securityDefiners >= 100);
  assert.equal(audit.shopBoundaries, 10);
});

test('shop hardening keeps staff private and refund/notification RPCs service-only', () => {
  assert.match(shopMigration, /create table if not exists public\.shop_staff/);
  assert.match(shopMigration, /revoke all on table public\.shop_staff from public, anon, authenticated/);
  assert.match(shopMigration, /create unique index if not exists shop_orders_payment_intent_unique_idx/);
  assert.match(shopMigration, /select \* into v_order[\s\S]+?for update/);
  assert.match(shopMigration, /p_amount_refunded <= v_order\.amount_refunded/);
  assert.match(shopMigration, /attempts < p_max_attempts/);
  assert.match(shopMigration, /updated_at < now\(\) - interval '5 minutes'/);
  for (const rpc of ['shop_apply_refund', 'shop_claim_notification']) {
    assert.match(
      shopMigration,
      new RegExp(`revoke all on function public\\.${rpc}[^;]+from public, anon, authenticated;[\\s\\S]+?grant execute[^;]+to service_role;`)
    );
  }
});
