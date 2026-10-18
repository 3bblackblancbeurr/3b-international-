import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../src/lib/analytics.js', import.meta.url), 'utf8');
const policy = readFileSync(new URL('../public/privacy-policy.html', import.meta.url), 'utf8');
const healthPage = readFileSync(new URL('../src/health/HealthPage.jsx', import.meta.url), 'utf8');
const healthData = readFileSync(new URL('../src/health/useHealth.js', import.meta.url), 'utf8');

test('third-party telemetry requires explicit feature enablement and member opt-in', () => {
  assert.match(analytics, /VITE_POSTHOG_ENABLED\s*===\s*'true'/);
  assert.match(analytics, /readAnalyticsConsent\(window\.localStorage\)/);
  assert.match(analytics, /isPrivateAnalyticsContext/);
  assert.match(analytics, /!externalAnalyticsAllowed\(\)/);
  assert.match(policy, /désactivé par défaut/);
  assert.match(policy, /accord explicite du membre/);
});

test('the health feature has local-only vault writes and no server upload endpoint', () => {
  assert.match(healthData, /localStorage\.setItem\(HEALTH_VAULT_KEY/);
  assert.doesNotMatch(healthData, /(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/);
  assert.match(healthPage, /data-health-private="true"/);
  assert.match(healthPage, /Exporter mes données en clair/);
});
