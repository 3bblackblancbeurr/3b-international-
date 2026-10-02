import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
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

test('shop hardening migration executes against the deployed shop contract', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table public.shop_orders(
        stripe_session_id text primary key,
        payment_intent_id text,
        livemode boolean not null default false,
        payment_status text not null default 'paid',
        fulfillment_status text not null default 'awaiting_seller',
        amount_total bigint not null,
        updated_at timestamptz not null default now()
      );
      create table public.shop_notification_log(
        stripe_session_id text not null,
        event text not null,
        channel text not null,
        state text not null,
        attempts integer not null default 0,
        provider_id text,
        last_error text,
        updated_at timestamptz not null default now(),
        unique(stripe_session_id,event,channel)
      );
    `);
    await db.exec(shopMigration);
    const result = await db.query(`
      select
        to_regclass('public.shop_staff') is not null as shop_staff_exists,
        to_regprocedure('public.shop_apply_refund(text,boolean,bigint,bigint)') is not null as refund_rpc_exists,
        to_regprocedure('public.shop_claim_notification(text,text,text,integer)') is not null as notification_rpc_exists
    `);
    assert.deepEqual(result.rows, [{
      shop_staff_exists: true,
      refund_rpc_exists: true,
      notification_rpc_exists: true,
    }]);
  } finally {
    await db.close();
  }
});
