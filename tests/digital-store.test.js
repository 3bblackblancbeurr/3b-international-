import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {digitalStoreConfig} from "../server/digital-store.js";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const base={
  APP_URL:"https://3b-international.vercel.app",
  SUPABASE_URL:"https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY:"x".repeat(40),
  STRIPE_WEBHOOK_SECRET:"whsec_test",
};

test("digital store stays fail-closed in Stripe test mode without an explicit allowlist",()=>{
  assert.equal(digitalStoreConfig({...base,STRIPE_SECRET_KEY:"sk_test_demo"}).enabled,false);
  assert.equal(digitalStoreConfig({...base,STRIPE_SECRET_KEY:"sk_test_demo",DIGITAL_STORE_TEST_ENABLED:"true"}).enabled,false);
  const cfg=digitalStoreConfig({...base,STRIPE_SECRET_KEY:"sk_test_demo",DIGITAL_STORE_TEST_ENABLED:"true",DIGITAL_STORE_TEST_USER_IDS:"11111111-1111-4111-8111-111111111111"});
  assert.equal(cfg.enabled,true);
  assert.equal(cfg.mode,"test");
});

test("digital store never enables live payments without the explicit live gate",()=>{
  assert.equal(digitalStoreConfig({...base,STRIPE_SECRET_KEY:"sk_live_demo"}).enabled,false);
  const cfg=digitalStoreConfig({...base,STRIPE_SECRET_KEY:"sk_live_demo",DIGITAL_STORE_LIVE_APPROVED:"true"});
  assert.equal(cfg.enabled,true);
  assert.equal(cfg.mode,"live");
});

test("premium catalog is cosmetic, permanent and non-resellable",()=>{
  const sql=read("supabase/migrations/20260928140344_digital_store_v1.sql");
  assert.match(sql,/no_pay_to_win boolean not null default true check\(no_pay_to_win=true\)/);
  assert.match(sql,/rarity,tradeable,marketable,permanent[\s\S]*'epic',false,false,true/);
  assert.match(sql,/PREM_WORLD_KAIS_JACKET/);
  assert.match(sql,/PREM_CITY_BROKEN_MONUMENT/);
  assert.match(sql,/digital_store_entitlements/);
  assert.match(sql,/digital_store_revoke_purchase/);
  assert.match(sql,/state='retired'/);
  assert.match(sql,/revoke all on function public\.digital_store_fulfill_nonconsumable/);
  assert.match(sql,/grant execute on function public\.digital_store_fulfill_nonconsumable[\s\S]*to service_role/);
});

test("real-money item fulfillment is server authoritative and idempotent",()=>{
  const server=read("server/digital-store.js");
  assert.match(server,/digital_store_fulfill_nonconsumable/);
  assert.match(server,/provider_transaction_id/);
  assert.match(server,/paymentIntents\.retrieve/);
  assert.match(server,/charge\.amount_refunded!==0/);
  assert.match(server,/digital_store_revoke_purchase/);
  assert.match(server,/3b-digital-store-v1/);
});

test("native apps never fall back to Stripe web checkout for digital goods",()=>{
  const client=read("src/store/digital-store-client.js");
  assert.match(client,/platform==="android"\)return "google_play"/);
  assert.match(client,/platform==="ios"\)return "app_store"/);
  assert.match(client,/if\(platform==="google_play"\)/);
  assert.match(client,/if\(platform==="app_store"\)/);
  const googleIndex=client.indexOf('if(platform==="google_play")');
  const webIndex=client.indexOf('digital-store-checkout');
  assert.ok(googleIndex>=0&&webIndex>googleIndex);
});

test("both games expose the shared Premium store without sharing progression",()=>{
  const world=read("src/world/WorldPage.jsx");
  const city=read("src/components/City3BPortal.jsx");
  assert.match(world,/DigitalStorePanel/);
  assert.match(world,/scope="world"/);
  assert.match(city,/DigitalStorePanel/);
  assert.match(city,/scope="city"/);
  assert.match(city,/setPanel\('premium'\)/);
});

test("shared Stripe webhook processes digital purchases separately from physical shop orders",()=>{
  const webhook=read("api/stripe-webhook.js");
  const catalog=read("api/catalog.js");
  assert.match(webhook,/createDigitalStore/);
  assert.match(webhook,/3b-digital-store-v1/);
  assert.match(webhook,/createShop\(\)\.webhook/);
  assert.match(webhook,/createDigitalStore\(\)\.webhook/);
  assert.match(catalog,/digital-store-catalog/);
  assert.match(catalog,/digital-store-checkout/);
  assert.match(catalog,/digital-store-status/);
});
