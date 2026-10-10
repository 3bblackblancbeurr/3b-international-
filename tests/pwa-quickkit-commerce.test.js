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

const ORIGIN = 'https://example.com';
const INTEGRATION = 'pwa-quickkit-pro-v1';
const TEST_TOKEN = 'a'.repeat(43);
const future = new Date(Date.now() + 86400000).toISOString();

function commerceFixture({ livemode = false, env = {}, priceMode = livemode, sessionMode = livemode,
  subscriptionMode = livemode, eventMode = livemode, rowMode = livemode, paymentStatus = 'paid',
  ignoreModeFilter = false } = {}) {
  const configuration = {
    PWA_QUICKKIT_PUBLIC_URL: ORIGIN + '/pwa-quickkit/',
    PWA_QUICKKIT_CHECKOUT_ENABLED: 'true',
    PWA_QUICKKIT_ENABLE_TEST_CHECKOUT: '1',
    PWA_QUICKKIT_PRO_PRICE_ID: 'price_fixture',
    PWA_QUICKKIT_STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
    PWA_QUICKKIT_LIVE_APPROVED: livemode ? 'true' : 'false',
    STRIPE_SECRET_KEY: livemode ? 'sk_live_fixture' : 'sk_test_fixture',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40),
    ...env,
  };
  const calls = { checkout: [], database: [], writes: [], prices: [] };
  const subscription = { id: 'sub_fixture', status: 'active', customer: 'cus_fixture', livemode: subscriptionMode,
    metadata: { integration: INTEGRATION }, current_period_end: Math.floor(Date.now() / 1000) + 86400 };
  const session = { id: 'cs_test_fixture', url: 'https://checkout.stripe.com/c/pay/cs_test_fixture',
    livemode: sessionMode, mode: 'subscription', status: 'complete', payment_status: paymentStatus,
    metadata: { integration: INTEGRATION }, subscription, customer_details: { email: 'buyer@example.com' } };
  const stripe = {
    prices: { retrieve: async id => { calls.prices.push(id); return ({ active: true, currency: 'eur', unit_amount: 990, type: 'recurring',
      livemode: priceMode, recurring: { interval: 'month', interval_count: 1 },
      product: { active: true, metadata: { project: 'pwa-quickkit' } } }); } },
    checkout: { sessions: {
      create: async (body, options) => { calls.checkout.push({ body, options }); return session; },
      retrieve: async () => session,
    } },
    subscriptions: { retrieve: async () => subscription },
    customers: { retrieve: async () => ({ email: 'buyer@example.com' }) },
    webhooks: { constructEvent: () => ({ id: 'evt_fixture', livemode: eventMode,
      type: 'customer.subscription.updated', data: { object: subscription } }) },
  };
  const fetcher = async (input, options = {}) => {
    const url = new URL(input);
    calls.database.push(url);
    if ((options.method || 'GET') === 'GET') {
      if (url.searchParams.has('access_token_hash')) {
        if (!ignoreModeFilter && url.searchParams.get('livemode') !== `eq.${rowMode}`) return Response.json([]);
        return Response.json([{ status: 'active', current_period_end: future, cancel_at_period_end: false, livemode: rowMode }]);
      }
      return Response.json([]);
    }
    calls.writes.push({ path: url.pathname, body: JSON.parse(options.body) });
    return new Response(null, { status: 204 });
  };
  return { api: createPwaQuickKitCommerce({ env: configuration, stripe, fetcher }), calls };
}

function postRequest(endpoint, body) {
  return new Request(ORIGIN + '/api/pwa-quickkit-' + endpoint, {
    method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
const checkoutRequest = () => postRequest('checkout', { attemptId: '123e4567-e89b-42d3-a456-426614174000' });
const statusRequest = () => new Request(ORIGIN + '/api/pwa-quickkit-status', { headers: { authorization: 'Bearer ' + TEST_TOKEN } });
const webhookRequest = () => postRequest('webhook', {});

test('public availability separates disabled, test and live configuration without financial or database calls', async () => {
  for (const [options, mode, configured] of [
    [{ env: { STRIPE_SECRET_KEY: '' } }, 'off', false],
    [{ env: { PWA_QUICKKIT_CHECKOUT_ENABLED: 'false' } }, 'test', false],
    [{}, 'test', true],
    [{ livemode: true, env: { PWA_QUICKKIT_LIVE_APPROVED: '' } }, 'live', false],
    [{ livemode: true }, 'live', true],
  ]) {
    const f = commerceFixture(options);
    const response = await f.api.availability(new Request(ORIGIN + '/api/pwa-quickkit-availability'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      mode, checkoutConfigured: configured, offerState: 'in_preparation',
      amount: 990, currency: 'eur', interval: 'month',
    });
    assert.deepEqual(f.calls, { checkout: [], database: [], writes: [], prices: [] });
  }
});

test('availability is read-only and rejects POST without opening a session', async () => {
  const f = commerceFixture();
  const response = await f.api.availability(postRequest('availability', {}));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
  assert.deepEqual(f.calls, { checkout: [], database: [], writes: [], prices: [] });
});

test('a demonstration cannot silently become a live checkout after configuration changes', async () => {
  const f = commerceFixture({ livemode: true });
  const response = await f.api.checkout(postRequest('checkout', {
    attemptId: '123e4567-e89b-42d3-a456-426614174000', expectedMode: 'test',
  }));
  assert.equal(response.status, 409);
  assert.deepEqual(f.calls, { checkout: [], database: [], writes: [], prices: [] });
});

test('checkout rejects an unknown requested mode and reports its actual mode in a valid response', async () => {
  const f = commerceFixture();
  const invalid = await f.api.checkout(postRequest('checkout', {
    attemptId: '123e4567-e89b-42d3-a456-426614174000', expectedMode: 'preview',
  }));
  assert.equal(invalid.status, 400);
  assert.equal(f.calls.checkout.length, 0);
  const valid = await f.api.checkout(postRequest('checkout', {
    attemptId: '123e4567-e89b-42d3-a456-426614174000', expectedMode: 'test',
  }));
  assert.equal((await valid.json()).mode, 'test');
  assert.equal(f.calls.checkout.length, 1);
});

test('QuickKit test checkout and explicitly approved live checkout remain usable with secret or restricted keys', async () => {
  for (const livemode of [false, true]) {
    for (const prefix of ['sk', 'rk']) {
      const f = commerceFixture({ livemode, env: { STRIPE_SECRET_KEY: `${prefix}_${livemode ? 'live' : 'test'}_fixture` } });
      const response = await f.api.checkout(checkoutRequest());
      assert.equal(response.status, 200);
      assert.equal(f.calls.checkout.length, 1);
      assert.deepEqual(f.calls.checkout[0].body.line_items, [{ price: 'price_fixture', quantity: 1 }]);
    }
  }
  const explicitTestPrice = commerceFixture({ env: { PWA_QUICKKIT_ENABLE_TEST_CHECKOUT: '' } });
  assert.equal((await explicitTestPrice.api.checkout(checkoutRequest())).status, 200);
});

test('QuickKit refuses live checkout without live approval and never uses the test fallback price in live mode', async () => {
  for (const env of [{ PWA_QUICKKIT_LIVE_APPROVED: '' }, { PWA_QUICKKIT_PRO_PRICE_ID: '' }]) {
    const f = commerceFixture({ livemode: true, env });
    assert.equal((await f.api.checkout(checkoutRequest())).status, 503);
    assert.equal(f.calls.checkout.length, 0);
  }
});

test('QuickKit requires its subscription webhook before opening checkout', async () => {
  const f = commerceFixture({ env: { PWA_QUICKKIT_STRIPE_WEBHOOK_SECRET: '' } });
  assert.equal((await f.api.checkout(checkoutRequest())).status, 503);
  assert.equal(f.calls.checkout.length, 0);
});

test('QuickKit rejects prices and checkout responses from a different Stripe mode', async () => {
  const wrongPrice = commerceFixture({ priceMode: true });
  assert.equal((await wrongPrice.api.checkout(checkoutRequest())).status, 503);
  assert.equal(wrongPrice.calls.checkout.length, 0);
  const wrongSession = commerceFixture({ sessionMode: true });
  assert.equal((await wrongSession.api.checkout(checkoutRequest())).status, 503);
});

test('QuickKit does not accept unknown or incomplete API key prefixes', async () => {
  for (const key of ['', 'sk_test_', 'not_a_stripe_key']) {
    const f = commerceFixture({ env: { STRIPE_SECRET_KEY: key } });
    assert.equal((await f.api.checkout(checkoutRequest())).status, 503);
    assert.deepEqual(await (await f.api.status(statusRequest())).json(), { active: false });
    assert.equal(f.calls.checkout.length, 0);
    assert.equal(f.calls.database.length, 0);
  }
});

test('QuickKit entitlement lookup separates test and live access in both directions', async () => {
  for (const livemode of [false, true]) {
    const valid = commerceFixture({ livemode });
    assert.equal((await (await valid.api.status(statusRequest())).json()).active, true);
    assert.equal(valid.calls.database[0].searchParams.get('livemode'), `eq.${livemode}`);
    const wrongMode = commerceFixture({ livemode, rowMode: !livemode });
    assert.equal((await (await wrongMode.api.status(statusRequest())).json()).active, false);
  }
});

test('QuickKit rejects a mismatched entitlement even if a database response ignores its mode filter', async () => {
  const f = commerceFixture({ livemode: true, rowMode: false, ignoreModeFilter: true });
  const body = await (await f.api.status(statusRequest())).json();
  assert.equal(body.active, false);
  assert.equal(body.status, null);
});

test('QuickKit activation accepts a confirmed payment in the configured mode and stores only a token hash', async () => {
  for (const livemode of [false, true]) {
    const f = commerceFixture({ livemode });
    const response = await f.api.activate(postRequest('activate', { sessionId: 'cs_test_fixture' }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.active, true);
    assert.match(body.token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(f.calls.writes[0].body.livemode, livemode);
    assert.equal(JSON.stringify(f.calls.writes).includes(body.token), false);
  }
});

test('QuickKit activation refuses unpaid sessions and mode mismatches before writing an entitlement', async () => {
  for (const [options, expected] of [[{ paymentStatus: 'unpaid' }, 402], [{ sessionMode: true }, 503], [{ subscriptionMode: true }, 503]]) {
    const f = commerceFixture(options);
    assert.equal((await f.api.activate(postRequest('activate', { sessionId: 'cs_test_fixture' }))).status, expected);
    assert.equal(f.calls.writes.length, 0);
  }
});

test('QuickKit webhook refuses mismatched event or subscription modes before recording them', async () => {
  for (const options of [{ eventMode: true }, { subscriptionMode: true }]) {
    const f = commerceFixture(options);
    assert.equal((await f.api.webhook(webhookRequest())).status, 503);
    assert.equal(f.calls.writes.length, 0);
  }
});

test('QuickKit webhook keeps valid test and live subscription synchronization functional', async () => {
  for (const livemode of [false, true]) {
    const f = commerceFixture({ livemode });
    assert.equal((await f.api.webhook(webhookRequest())).status, 200);
    assert.equal(f.calls.writes.length, 2);
    assert.equal(f.calls.writes[0].body.livemode, livemode);
    assert.equal(f.calls.writes[1].body.livemode, livemode);
  }
});
