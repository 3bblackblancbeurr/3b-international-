import test from 'node:test';
import assert from 'node:assert/strict';
import { consumePwaQuickKitRateLimit } from '../server/pwa-quickkit-rate-limit.js';

test('QuickKit rate limiter permits local/test execution when server storage is absent', async () => {
  const request = new Request('https://example.com/api/pwa-audit?url=example.org', {
    headers: { 'x-forwarded-for': '203.0.113.10' },
  });
  const result = await consumePwaQuickKitRateLimit(request, { env: {}, fetcher: async () => { throw new Error('must not fetch'); } });
  assert.deepEqual(result, { allowed: true, limited: false });
});
