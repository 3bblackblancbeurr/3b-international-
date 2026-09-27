import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const match = readFileSync("src/games/PenaltyRush.jsx", "utf8");
const css = readFileSync("src/games/penaltyRush.css", "utf8");

test("Penalty Rush restores the remembered room on browser lifecycle recovery", () => {
  assert.match(match, /room\?\.id \|\| rememberedPenaltyRoom\(\)/);
  assert.match(match, /window\.addEventListener\('online'/);
  assert.match(match, /window\.addEventListener\('offline'/);
  assert.match(match, /window\.addEventListener\('focus'/);
  assert.match(match, /document\.addEventListener\('visibilitychange'/);
  assert.match(match, /document\.visibilityState === 'visible'/);
});

test("Penalty Rush does not poll while the device is offline", () => {
  assert.match(match, /navigator\.onLine === false \|\| tickInFlight\.current/);
});

test("Realtime transport failures are visible and recoverable", () => {
  assert.match(match, /CHANNEL_ERROR/);
  assert.match(match, /TIMED_OUT/);
  assert.match(match, /CLOSED/);
  assert.match(match, /setConnection\('online'\)/);
});

test("connection status is accessible and includes a dedicated offline state", () => {
  assert.match(match, /aria-live="polite"/);
  assert.match(match, /offline: 'Hors ligne'/);
  assert.match(css, /penalty-connection\[data-state="offline"\]/);
  assert.match(css, /var\(--3b-warning\)/);
});
