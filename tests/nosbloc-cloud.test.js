import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const page = read("../src/nosbloc/NosblocPremiumPage.jsx");
const client = read("../src/nosbloc/client.js");
const api = read("../supabase/functions/nosbloc-api/index.ts");
const pending = read("../supabase/pending/20260926011500_nosbloc_creator_economy_v1.sql");

test("Nosbloc premium has authenticated cloud sync with safe local fallback", () => {
  assert.match(page, /nosblocCloudAvailable/);
  assert.match(page, /nosblocRequest\("ensure-profile"/);
  assert.match(page, /nosblocRequest\("save-project"/);
  assert.match(page, /Cloud sécurisé/);
  assert.match(page, /Local sécurisé/);
  assert.match(client, /Authorization: "Bearer " \+ session\.access_token/);
  assert.match(client, /AbortSignal\.timeout\(15000\)/);
});

test("Nosbloc server authenticates before data actions and limits request size", () => {
  assert.match(api, /authenticate\(req\)/);
  assert.match(api, /\/auth\/v1\/user/);
  assert.match(api, /if\(text\.length>32768\)/);
  assert.match(api, /Origine non autorisée/);
  assert.match(api, /Cache-Control':'no-store/);
});

test("Nosbloc client cannot publish, refund, mutate ledger or request payout directly", () => {
  assert.match(api, /request-payout/);
  assert.match(api, /versements restent verrouillés/);
  assert.match(api, /publish.*approve.*ledger-write.*refund/s);
  assert.match(api, /opération sensible ne peut pas être déclenchée depuis le client/);
});

test("Nosbloc project sync always keeps publication and monetization locked", () => {
  assert.match(api, /publication_locked:true/);
  assert.match(api, /monetization_locked:true/);
  assert.match(api, /status:'draft'/);
  assert.match(api, /visibility:'private'/);
});

test("creator economy schema stays pending and immutable ledger is protected", () => {
  assert.match(pending, /nosbloc_ledger_entries/);
  assert.match(pending, /nosbloc_ledger_immutable/);
  assert.match(pending, /enable row level security/gi);
  assert.match(pending, /rollback;/i);
  assert.doesNotMatch(pending, /commit;\s*$/i);
});
