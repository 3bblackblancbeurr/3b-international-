import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../public/pwa-quickkit/app.js', import.meta.url), 'utf8');

function pageFixture({ availability = { mode: 'test', checkoutConfigured: true, offerState: 'in_preparation' },
  checkout = { mode: 'test', url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' }, offline = false } = {}) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: id === 'proCheckout' ? 'Vérifier la disponibilité Pro' : '', disabled: false,
      listeners: {}, addEventListener(event, listener) { this.listeners[event] = listener; },
    });
    return elements.get(id);
  };
  const requests = [], redirects = [];
  const context = {
    document: { getElementById: get },
    location: { search: '', pathname: '/pwa-quickkit/', hash: '' },
    window: { location: { assign: url => redirects.push(url) } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URL, URLSearchParams, crypto: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (offline) throw new TypeError('Network unavailable');
      if (url === '/api/pwa-quickkit-availability') return Response.json(availability);
      if (url === '/api/pwa-quickkit-checkout') return Response.json(checkout);
      throw new Error('Unexpected request: ' + url);
    },
  };
  vm.runInNewContext(source, context);
  return { requests, redirects, button: get('proCheckout'), note: get('proCheckoutNote'),
    async click() { await get('proCheckout').listeners.click(); } };
}

test('checking Pro availability performs only a read; a separately labelled click opens the test demo', async () => {
  const page = pageFixture();
  await page.click();
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].url, '/api/pwa-quickkit-availability');
  assert.equal(page.requests[0].options.method, 'GET');
  assert.deepEqual(page.redirects, []);
  assert.match(page.button.textContent, /démo.*aucun débit réel/);
  assert.match(page.note.textContent, /MODE TEST/);
  await page.click();
  assert.equal(page.requests[1].url, '/api/pwa-quickkit-checkout');
  assert.equal(page.requests[1].options.method, 'POST');
  assert.equal(JSON.parse(page.requests[1].options.body).expectedMode, 'test');
  assert.deepEqual(page.redirects, ['https://checkout.stripe.com/c/pay/cs_test_fixture']);
});

test('closed, disabled and live configurations never offer a purchase of the unimplemented Pro features', async () => {
  for (const availability of [
    { mode: 'off', checkoutConfigured: false, offerState: 'in_preparation' },
    { mode: 'test', checkoutConfigured: false, offerState: 'in_preparation' },
    { mode: 'live', checkoutConfigured: false, offerState: 'in_preparation' },
    { mode: 'live', checkoutConfigured: true, offerState: 'in_preparation' },
  ]) {
    const page = pageFixture({ availability });
    await page.click();
    await page.click();
    assert.equal(page.requests.length, 2);
    assert.equal(page.requests.every(request => request.options.method === 'GET'), true);
    assert.deepEqual(page.redirects, []);
    assert.doesNotMatch(page.button.textContent, /S.abonner|Tester/);
    if (availability.mode === 'live') assert.match(page.note.textContent, /MODE RÉEL.*en préparation/);
  }
});

test('unavailable or malformed availability never falls back to checkout', async () => {
  for (const options of [{ offline: true }, { availability: {} },
    { availability: { mode: 'live', checkoutConfigured: true, offerState: 'unknown' } }]) {
    const page = pageFixture(options);
    await page.click();
    await page.click();
    assert.equal(page.requests.every(request => request.url === '/api/pwa-quickkit-availability'), true);
    assert.deepEqual(page.redirects, []);
    assert.equal(page.button.disabled, false);
    assert.equal(page.button.textContent, 'Vérifier la disponibilité Pro');
  }
});

test('test demo refuses a live response or an untrusted redirect URL', async () => {
  for (const checkout of [
    { mode: 'live', url: 'https://checkout.stripe.com/c/pay/cs_live_fixture' },
    { mode: 'test', url: 'https://attacker.invalid/pay' },
    { url: 'https://checkout.stripe.com/c/pay/cs_test_fixture' },
  ]) {
    const page = pageFixture({ checkout });
    await page.click();
    await page.click();
    assert.deepEqual(page.redirects, []);
    assert.equal(page.button.disabled, false);
    assert.equal(page.button.textContent, 'Vérifier la disponibilité Pro');
  }
});
