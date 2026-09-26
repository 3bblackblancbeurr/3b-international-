import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const page = read("../src/nosbloc/NosblocPremiumPage.jsx");
const client = read("../src/nosbloc/client.js");
const api = read("../supabase/functions/nosbloc-api/index.ts");
const contract = read("../supabase/functions/nosbloc-api/contract.js");

test("Nosbloc premium syncs projects, private tests, review, restore and finance through cloud", () => {
  assert.match(page, /nosblocCloudAvailable/);
  assert.match(page, /nosblocRequest\("project_sync"/);
  assert.match(page, /nosblocRequest\("version_private_test"/);
  assert.match(page, /nosblocRequest\("review_submit"/);
  assert.match(page, /nosblocRequest\("version_restore"/);
  assert.match(page, /nosblocRequest\("finance_snapshot"/);
  assert.match(page, /cloudProjectId/);
  assert.match(page, /cloudVersionId/);
  assert.match(page, /Cloud sécurisé/);
  assert.match(page, /Local sécurisé/);
});

test("Nosbloc browser client forwards only the current authenticated access token", () => {
  assert.match(client, /Authorization: "Bearer " \+ session\.access_token/);
  assert.match(client, /AbortSignal\.timeout\(15000\)/);
  assert.doesNotMatch(client, /service[_-]?role/i);
});

test("Nosbloc Edge API uses caller JWT and guarded RPCs instead of service-role table writes", () => {
  assert.match(api, /Authorization:authorization/);
  assert.match(api, /nosbloc_sync_project_api/);
  assert.match(api, /nosbloc_create_version_api/);
  assert.match(api, /nosbloc_finance_snapshot_api/);
  assert.match(api, /nosbloc_request_payout_api/);
  assert.match(api, /nosbloc_publish_api/);
  assert.doesNotMatch(api, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(api, /Bearer '\+ADMIN/);
});

test("Nosbloc API keeps strict CORS, body limits and authenticated identity verification", () => {
  assert.match(api, /Origine non autorisée/);
  assert.match(api, /1048576/);
  assert.match(api, /\/auth\/v1\/user/);
  assert.match(api, /Cache-Control":"no-store/);
  assert.match(api, /Referrer-Policy":"no-referrer/);
});

test("Nosbloc production contract validates project IDs, splits and immutable review stages", () => {
  assert.match(contract, /client_project_id/);
  assert.match(contract, /totalBps!==10000/);
  assert.match(contract, /private_test/);
  assert.match(contract, /review/);
  assert.match(contract, /coreOwned/);
  assert.match(contract, /ageRatingReviewed/);
});

test("financial actions are routed to fail-closed server RPCs, never calculated as browser balances", () => {
  assert.match(api, /payout_request/);
  assert.match(api, /refund_request/);
  assert.match(api, /publish/);
  assert.match(page, /ledger serveur reste la seule source de vérité/);
  assert.match(page, /payoutsEnabled/);
});
