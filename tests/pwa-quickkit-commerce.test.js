import test from 'node:test';
import assert from 'node:assert/strict';
import { createPwaQuickKitCommerce } from '../server/pwa-quickkit-commerce.js';

const baseEnv = {
  PWA_QUICKKIT_PUBLIC_URL: 'https://example.com/pwa-quickkit/',
  PWA_QUICKKIT_CHECKOUT_ENABLED: 'false',
};

test('QuickKit checkout stays fail-closed while disabled', async () => {
  const api = createPwaQuickKitCommerce({ env: baseEnv });
  const request = new Request('https://example.com/api/pwa-quickkit-checkout', {
    method: 'POST',
    headers: { origin: 'https://example.com', 'content-type': 'application/json' },
    body: JSON.stringify({ attemptId: '123e4567-e89b-42d3-a456-426614174000' }),
  });
  const response = await api.checkout(request);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.match(body.error, /pas encore activé/i);
});

test('QuickKit checkout rejects cross-origin requests', async () => {
  const api = createPwaQuickKitCommerce({ env: baseEnv });
  const request = new Request('https://example.com/api/pwa-quickkit-checkout', {
    method: 'POST',
    headers: { origin: 'https://attacker.invalid', 'content-type': 'application/json' },
    body: '{}',
  });
  const response = await api.checkout(request);
  assert.equal(response.status, 403);
});

test('QuickKit status rejects malformed bearer token without database access', async () => {
  const api = createPwaQuickKitCommerce({ env: baseEnv });
  const request = new Request('https://example.com/api/pwa-quickkit-status', {
    headers: { authorization: 'Bearer short' },
  });
  const response = await api.status(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { active: false });
});
