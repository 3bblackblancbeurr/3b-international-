import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("daily Secret uses a server clock and server-authorized attempt lifecycle", () => {
  const client = read("../src/secret/dailySecret.js");
  const page = read("../src/secret/PremierSecretPage.jsx");
  const app = read("../src/App.jsx");
  const nav = read("../src/components/AppNavigation.jsx");

  assert.match(client, /secret3b_daily_status/);
  assert.match(client, /secret3b_start_daily_attempt/);
  assert.match(client, /secret3b_complete_daily_attempt/);
  assert.match(client, /POLL_MS = 5000/);
  assert.match(client, /timeZone: "Europe\/Paris"/);

  assert.match(page, /dailySecret\?\.phase !== "open"/);
  assert.match(page, /startDailySecretAttempt/);
  assert.match(page, /completeDailySecretAttempt/);
  assert.match(page, /30 minutes d’ouverture/);
  assert.match(page, /15 minutes maximum par tentative/);
  assert.match(page, /Modifier l’heure du téléphone ne change pas l’ouverture/);
  assert.doesNotMatch(page, /onClick=\{stage === 0 \? startSignal/);

  assert.match(app, /useDailySecret\(\)/);
  assert.match(app, /secretPhase: secret\.phase/);
  assert.match(nav, /<SecretClock secret=\{secret\}/);
});

test("daily Secret migration hides the future hour from public status and allows Director overrides", () => {
  const sql = read("../supabase/migrations/20260924173412_secret3b_daily_hour_event_v1.sql");

  assert.match(sql, /secret3b_daily_events/);
  assert.match(sql, /secret3b_daily_attempts/);
  assert.match(sql, /attempt_minutes integer not null default 15/);
  assert.match(sql, /open_minutes integer not null default 30/);
  assert.match(sql, /when v_phase in \('open','attempt','completed','expired','missed'\) then v_event\.opens_at else null end/);
  assert.match(sql, /secret3b_director_set_event/);
  assert.match(sql, /already has player attempts and can no longer be rescheduled/);
  assert.match(sql, /grant execute on function public\.secret3b_daily_status\(\) to anon, authenticated/);
  assert.doesNotMatch(sql, /grant .*secret3b_daily_events.*anon/);
});

test("phone layout preserves the cinematic Secret identity", () => {
  const css = read("../src/secret/premier-secret.css");
  const dailyCss = read("../src/secret/daily-secret.css");

  assert.match(css, /Phone keeps the desktop cinematic identity/);
  assert.match(css, /\.ps-nexus::before\{display:block/);
  assert.match(css, /\.ps-nexus::after\{display:block/);
  assert.match(css, /\.ps-nexus-core\{display:grid/);
  assert.match(css, /\.ps-veilleur-frame\{min-height:440px/);
  assert.match(css, /\.ps-global-deadline/);
  assert.match(dailyCss, /\.secret-clock-open/);
  assert.match(dailyCss, /\.secret-universe-card\.is-secret-live/);
  assert.match(dailyCss, /@media\(max-width:720px\)/);
});
