import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const analytics = readFileSync(new URL("../src/lib/analytics.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../public/privacy-policy.html", import.meta.url), "utf8");

test("3B analytics uses the EU PostHog capture endpoint without a package dependency", () => {
  assert.match(analytics, /https:\/\/eu\.i\.posthog\.com/);
  assert.match(analytics, /\/i\/v0\/e\//);
  assert.match(analytics, /VITE_POSTHOG_PROJECT_TOKEN/);
  assert.match(analytics, /VITE_POSTHOG_HOST/);
});

test("3B analytics is privacy-first and session-only", () => {
  assert.match(analytics, /\$process_person_profile:\s*false/);
  assert.match(analytics, /globalPrivacyControl/);
  assert.match(analytics, /doNotTrack/);
  assert.doesNotMatch(analytics, /localStorage\.setItem/);
  assert.doesNotMatch(analytics, /sessionStorage\.setItem/);
  assert.doesNotMatch(analytics, /email|user_id|member_id/i);
});

test("3B captures app open and route views only", () => {
  assert.match(main, /captureAppOpen/);
  assert.match(app, /captureRouteView\(\{ page, gameSlug \}\)/);
  assert.match(analytics, /3b_app_open/);
  assert.match(analytics, /3b_route_view/);
});

test("Vercel CSP authorizes the PostHog EU ingestion host", () => {
  assert.match(vercel, /connect-src[^;]*https:\/\/eu\.i\.posthog\.com/);
});

test("privacy policy documents the anonymous analytics behavior", () => {
  assert.match(privacy, /PostHog Europe/);
  assert.match(privacy, /Aucun profil personne n’est créé/);
  assert.match(privacy, /Do Not Track/);
  assert.match(privacy, /Global Privacy Control/);
});
