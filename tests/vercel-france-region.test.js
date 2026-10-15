import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('3B keeps one Vercel Functions region in France without paid multi-region failover', () => {
  assert.deepEqual(config.regions, ['cdg1'], 'France-only function region must be explicit');
  assert.equal(Object.hasOwn(config, 'functionFailoverRegions'), false, 'no paid failover');
  for (const [glob, details] of Object.entries(config.functions || {})) {
    assert.ok(!details.regions || details.regions.every(region => region === 'cdg1'), `No foreign function override: ${glob}`);
    assert.equal(Object.hasOwn(details, 'functionFailoverRegions'), false, `No paid failover: ${glob}`);
  }
});

test('3B preserves core security headers when changing the compute region', () => {
  const headers = (config.headers || []).flatMap(rule => rule.headers || []);
  const policies = headers.filter(header => header.key.toLowerCase() === 'content-security-policy');
  const hsts = headers.filter(header => header.key.toLowerCase() === 'strict-transport-security');
  assert.ok(policies.some(header => header.value.includes("object-src 'none'") && header.value.includes("frame-ancestors 'none'")));
  assert.ok(hsts.some(header => header.value.includes('max-age=31536000')));
});
