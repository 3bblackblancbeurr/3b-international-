import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createShop, normalizeCart } from "../server/shop.js";
import { sanitizeCart, subtractPurchased } from "../src/shop/cart.js";

const ORIGIN = "https://shop.example.test";
const ATTEMPT = "a640a1e9-3e68-4f8b-8b3a-9e7e8d8d4490";
const env = {
  SHOP_ENABLED: "true", APP_URL: ORIGIN, STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_PRICE_IDS: "price_M,price_L",
  STRIPE_SHIPPING_RATE_ID: "shr_France", SUPABASE_URL: "https://db.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test_server_key", SHOP_TERMS_URL: `${ORIGIN}/terms`,
  SHOP_PRIVACY_URL: `${ORIGIN}/privacy`, SHOP_SHIPPING_URL: `${ORIGIN}/shipping`,
  SHOP_RETURNS_URL: `${ORIGIN}/returns`, SHOP_LEGAL_URL: `${ORIGIN}/legal`,
};
function fixture(overrides = {}) {
  const calls = { creates: [], writes: [], reads: [], productLists: [], retrieved: 0 };
  const records = new Map();
  const session = { id: "cs_test_fixture", url: "https://checkout.stripe.com/c/pay/cs_test_fixture",
    metadata: { integration: "3b-shop-v1" }, mode: "payment", status: "complete",
    payment_status: "paid", livemode: false, payment_intent: "pi_fixture", amount_total: 10500,
    currency: "eur", customer_details: { name: "Test Client", email: "test@example.test" },
    collected_information: { shipping_details: { name: "Test Client", address: { country: "FR" } } } };
  const prices = Object.fromEntries(["M", "L"].map(size => [`price_${size}`, {
    id: `price_${size}`, active: true, type: "one_time", currency: "eur", unit_amount: 10000,
    tax_behavior: "inclusive", billing_scheme: "per_unit", livemode: false, metadata: { size, color: "Noir", max_per_order: "5" },
    product: { id: `prod_${size}`, name: `Vêtement de test ${size} noir`, active: true, images: [],
      metadata: { shop_group: "testStyle", shop_name: "Vêtement de test" } },
  }]));
  const products = Object.fromEntries(Object.values(prices).map(price => [price.product.id,
    { ...price.product, default_price: { ...price, product: price.product.id } }]));
  const signer = new Stripe("sk_test_fixture");
  const stripe = {
    products: { list: async params => { calls.productLists.push(params); return { data: Object.values(products), has_more: false }; } },
    prices: { retrieve: async id => prices[id] },
    shippingRates: { retrieve: async () => ({ active: true, type: "fixed_amount", display_name: "Livraison test", fixed_amount: { amount: 500, currency: "eur" }, tax_behavior: "inclusive" }) },
    checkout: { sessions: {
      create: async (params, options) => { calls.creates.push({ params, options }); return session; },
      retrieve: async () => { calls.retrieved++; return session; },
      listLineItems: async () => ({ has_more: false, data: [{ price: prices.price_M, description: "Vêtement de test M noir", quantity: 1, amount_total: 10000, currency: "eur" }] }),
    } },
    webhooks: signer.webhooks,
  };
  const fetcher = async (url, options) => {
    if (options.method === "GET") { calls.reads.push(String(url)); return new Response("[]"); }
    const record = JSON.parse(options.body);
    calls.writes.push({ record, headers: options.headers });
    if (!records.has(record.stripe_session_id)) records.set(record.stripe_session_id, record);
    return new Response(null, { status: 201 });
  };
  const shop = createShop({ env, stripe, fetcher, ...overrides });
  return { shop, stripe, signer, calls, records, session, prices, products };
}
function checkoutRequest(items = [{ priceId: "price_M", quantity: 1 }], extra = {}, headers = {}) {
  return new Request(`${ORIGIN}/api/checkout`, { method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: JSON.stringify({ items, attemptId: ATTEMPT, ...extra }) });
}
async function authorizedStatus(f) {
  const start = await f.shop.checkout(checkoutRequest());
  const cookie = start.headers.get("set-cookie").split(";")[0];
  return new Request(`${ORIGIN}/api/order-status?session_id=${f.session.id}`, { headers: { cookie } });
}
function webhookRequest(f, type = "checkout.session.completed", mutate = false) {
  const payload = JSON.stringify({ id: "evt_fixture", type, data: { object: f.session } });
  const signature = f.signer.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
  return new Request(`${ORIGIN}/api/stripe-webhook`, { method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" }, body: mutate ? `${payload} ` : payload });
}

test("without credentials the store is closed and no prices are invented", async () => {
  const data = await (await createShop({ env: {} }).catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.equal(data.enabled, false); assert.deepEqual(data.items, []);
  assert.equal((await createShop({ env: {} }).checkout(checkoutRequest())).status, 503);
});
test("catalog returns only active one-time EUR inclusive prices and groups real variants", async () => {
  const f = fixture(); f.prices.price_L.type = "recurring";
  const data = await (await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.deepEqual(data.items.map(p => p.id), ["price_M"]);
  assert.equal(data.items[0].productId, "testStyle"); assert.equal(data.shipping.amount, 500);
  assert.equal(data.testMode, true);
});
test("inactive product, exclusive taxes and transformed quantities cannot be sold", async () => {
  for (const mutation of [p => p.product.active = false, p => p.tax_behavior = "exclusive", p => p.currency = "usd", p => p.transform_quantity = { divide_by: 2 }]) {
    const f = fixture(); mutation(f.prices.price_M);
    assert.equal((await f.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(f.calls.creates.length, 0);
  }
});
test("unknown price IDs are rejected before Stripe checkout", async () => {
  const f = fixture(); const response = await f.shop.checkout(checkoutRequest([{ priceId: "price_ATTACK", quantity: 1 }]));
  assert.equal(response.status, 409); assert.equal(f.calls.creates.length, 0);
});
test("quantities are integers, bounded, and duplicate rows cannot bypass limits", async () => {
  const f = fixture();
  for (const items of [[], [{ priceId: "price_M", quantity: -1 }], [{ priceId: "price_M", quantity: 1.5 }],
    [{ priceId: "price_M", quantity: "1" }], [{ priceId: "price_M", quantity: 6 }],
    [{ priceId: "price_M", quantity: 3 }, { priceId: "price_M", quantity: 3 }]]) {
    assert.equal((await f.shop.checkout(checkoutRequest(items))).status, 400);
  }
  assert.equal(f.calls.creates.length, 0);
  assert.throws(() => normalizeCart({ items: Array.from({ length: 5 }, (_, i) => ({ priceId: `price_${i}`, quantity: 5 })) },
    Array.from({ length: 5 }, (_, i) => ({ id: `price_${i}`, maxQuantity: 5 }))), /20 articles/);
});
test("client prices, redirects and local member identities are never trusted", async () => {
  const f = fixture(); const response = await f.shop.checkout(checkoutRequest([{ priceId: "price_M", quantity: 1, amount: 1 }],
    { amount: 1, success_url: "https://evil.example", memberId: "admin", email: "attacker@example.test" }));
  assert.equal(response.status, 200);
  const p = f.calls.creates[0].params;
  assert.deepEqual(p.line_items, [{ price: "price_M", quantity: 1 }]);
  assert.ok(p.success_url.startsWith(ORIGIN)); assert.equal(p.customer_email, undefined);
  assert.deepEqual(p.metadata, { integration: "3b-shop-v1" });
  assert.equal(p.payment_method_types, undefined);
  assert.match(p.integration_identifier, /^3b-international-[a-z]{8}$/);
  assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  assert.match(response.headers.get("set-cookie"), /Secure/);
});
test("external origins and malformed JSON are rejected", async () => {
  const f = fixture();
  assert.equal((await f.shop.checkout(checkoutRequest(undefined, {}, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await f.shop.checkout(new Request(`${ORIGIN}/api/checkout`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: "{" }))).status, 400);
  assert.equal(f.calls.creates.length, 0);
});
test("large requests and unsupported methods are refused", async () => {
  const f = fixture();
  assert.equal((await f.shop.checkout(checkoutRequest(undefined, { extra: "x".repeat(17000) }))).status, 413);
  const response = await f.shop.checkout(new Request(`${ORIGIN}/api/checkout`));
  assert.equal(response.status, 405); assert.equal(response.headers.get("allow"), "POST");
});
test("no checkout opens when durable order storage is unavailable", async () => {
  const f = fixture({ fetcher: async () => new Response(null, { status: 503 }) });
  assert.equal((await f.shop.checkout(checkoutRequest())).status, 503);
  assert.equal(f.calls.creates.length, 0);
});
test("retrying the same cart uses the same Stripe idempotency key", async () => {
  const f = fixture();
  await f.shop.checkout(checkoutRequest()); await f.shop.checkout(checkoutRequest());
  assert.equal(f.calls.creates[0].options.idempotencyKey, f.calls.creates[1].options.idempotencyKey);
  assert.deepEqual(f.calls.creates[0].params, f.calls.creates[1].params);
  await f.shop.checkout(checkoutRequest([{ priceId: "price_M", quantity: 2 }]));
  assert.notEqual(f.calls.creates[0].options.idempotencyKey, f.calls.creates[2].options.idempotencyKey);
});
test("a success URL or session ID alone never grants access to confirmation", async () => {
  const f = fixture();
  assert.equal((await f.shop.status(new Request(`${ORIGIN}/api/order-status?session_id=cs_test_fixture&success=true`))).status, 403);
  assert.equal(f.calls.retrieved, 0); assert.equal(f.calls.writes.length, 0);
});
test("a completed but unpaid session is not recorded as a paid order", async () => {
  const f = fixture(); const request = await authorizedStatus(f); f.session.payment_status = "unpaid";
  const data = await (await f.shop.status(request)).json();
  assert.equal(data.paid, false); assert.equal(f.calls.writes.length, 0);
});
test("paid confirmation stores delivery data privately and returns no customer details", async () => {
  const f = fixture(); const request = await authorizedStatus(f);
  const response = await f.shop.status(request); const data = await response.json();
  assert.equal(data.paid, true); assert.equal(data.amount, 10500);
  assert.equal(JSON.stringify(data).includes("test@example.test"), false);
  assert.equal(data.shipping_details, undefined);
  assert.equal(f.calls.writes[0].record.shipping_details.address.country, "FR");
  assert.equal(f.calls.writes[0].record.items[0].size, "M");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("tampered webhook payload fails signature verification", async () => {
  const f = fixture(); assert.equal((await f.shop.webhook(webhookRequest(f, undefined, true))).status, 400);
  assert.equal(f.calls.writes.length, 0); assert.equal(f.calls.retrieved, 0);
});
test("webhook works without visiting the success page and retries preserve fulfillment", async () => {
  const f = fixture();
  assert.equal((await f.shop.webhook(webhookRequest(f))).status, 200);
  f.records.get(f.session.id).fulfillment_status = "shipped";
  assert.equal((await f.shop.webhook(webhookRequest(f))).status, 200);
  assert.equal(f.records.size, 1); assert.equal(f.records.get(f.session.id).fulfillment_status, "shipped");
  assert.match(f.calls.writes[1].headers.Prefer, /resolution=ignore-duplicates/);
});
test("webhook does not fulfill unpaid or unrelated checkouts", async () => {
  const f = fixture(); f.session.payment_status = "unpaid";
  assert.equal((await f.shop.webhook(webhookRequest(f))).status, 200); assert.equal(f.calls.writes.length, 0);
  f.session.payment_status = "paid"; f.session.metadata.integration = "another-store";
  assert.equal((await f.shop.webhook(webhookRequest(f))).status, 200); assert.equal(f.calls.writes.length, 0);
});
test("asynchronous success is processed and database failures ask Stripe to retry", async () => {
  const f = fixture();
  assert.equal((await f.shop.webhook(webhookRequest(f, "checkout.session.async_payment_succeeded"))).status, 200);
  assert.equal(f.records.size, 1);
  const failing = fixture({ fetcher: async () => new Response(null, { status: 500 }) });
  assert.equal((await failing.shop.webhook(webhookRequest(failing))).status, 503);
});
test("cart restoration tolerates corrupt data and preserves later additions after payment", () => {
  assert.deepEqual(sanitizeCart({ amount: 1 }), []);
  assert.deepEqual(sanitizeCart([{ priceId: "price_M", quantity: 900 }, { priceId: "price_M", quantity: 5 }]), [{ priceId: "price_M", quantity: 5 }]);
  assert.deepEqual(subtractPurchased([{ priceId: "price_M", quantity: 3 }, { priceId: "price_L", quantity: 1 }], [{ priceId: "price_M", quantity: 2 }]),
    [{ priceId: "price_M", quantity: 1 }, { priceId: "price_L", quantity: 1 }]);
});

function dashboardFixture() {
  const f = fixture({ env: { ...env, STRIPE_CATALOG_MODE: "metadata", STRIPE_PRICE_IDS: "" } });
  for (const product of Object.values(f.products)) {
    product.metadata = { ...product.metadata, ...product.default_price.metadata, shop_visible: "true" };
    product.default_price.metadata = {};
  }
  return f;
}
test("an empty Stripe catalogue remains empty and cannot create a payment", async () => {
  const f = dashboardFixture();
  for (const product of Object.values(f.products)) delete product.metadata.shop_visible;
  const data = await (await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.deepEqual(data.items, []); assert.equal(data.enabled, false); assert.equal(data.shipping, null);
  assert.equal((await f.shop.checkout(checkoutRequest())).status, 409);
  assert.equal(f.calls.creates.length, 0);
});
test("dashboard catalogue exposes only explicitly published valid default prices", async () => {
  const f = dashboardFixture(); f.products.prod_L.metadata.shop_visible = "false";
  const data = await (await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.deepEqual(data.items.map(p => p.id), ["price_M"]);
  assert.equal(data.items[0].size, "M"); assert.equal(data.items[0].color, "Noir");
  assert.equal(data.enabled, true);
  for (const mutate of [p => p.active = false, p => p.default_price.active = false,
    p => p.default_price.type = "recurring", p => p.default_price.tax_behavior = "exclusive",
    p => p.default_price.currency = "usd", p => p.default_price = null,
    p => p.metadata.shop_visible = "TRUE"]) {
    const invalid = dashboardFixture(); mutate(invalid.products.prod_M);
    assert.equal((await invalid.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(invalid.calls.creates.length, 0);
  }
});
test("a new garment appears and can be checked out without updating the deployment or price allowlist", async () => {
  const f = dashboardFixture();
  await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`));
  const product = structuredClone(f.products.prod_M);
  product.id = "prod_New"; product.name = "Nouvelle pièce de test XL noir";
  product.metadata.size = "XL"; product.default_price.id = "price_New";
  product.default_price.product = product.id; product.default_price.unit_amount = 12500;
  f.products.prod_New = product;
  const data = await (await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.equal(data.items.find(item => item.id === "price_New").amount, 12500);
  assert.equal((await f.shop.checkout(checkoutRequest([{ priceId: "price_New", quantity: 1 }]))).status, 200);
  assert.deepEqual(f.calls.creates[0].params.line_items, [{ price: "price_New", quantity: 1 }]);
});
test("unpublishing a product or replacing its default price rejects the previously displayed price", async () => {
  for (const mutate of [p => p.metadata.shop_visible = "false", p => p.default_price.id = "price_Replacement"]) {
    const f = dashboardFixture(); await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`));
    mutate(f.products.prod_M);
    assert.equal((await f.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(f.calls.creates.length, 0);
  }
});
test("dashboard catalogue reads subsequent product pages and refuses an incomplete catalogue", async () => {
  const f = dashboardFixture(); const calls = [];
  f.stripe.products.list = async params => {
    calls.push(params);
    return params.starting_after ? { data: [f.products.prod_L], has_more: false }
      : { data: [f.products.prod_M], has_more: true };
  };
  const data = await (await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).json();
  assert.equal(data.items.length, 2); assert.equal(calls[1].starting_after, "prod_M");
  assert.deepEqual(calls[0].expand, ["data.default_price"]);
  let page = 0;
  f.stripe.products.list = async () => ({ data: [{ id: `prod_Page${++page}`, metadata: {} }], has_more: true });
  assert.equal((await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`))).status, 503);
  assert.equal(page, 5);
});
test("orders keep size and colour when they are configured on the Stripe product", async () => {
  const f = dashboardFixture(); let expansion;
  f.stripe.checkout.sessions.listLineItems = async (id, params) => {
    expansion = params.expand;
    return { has_more: false, data: [{ price: { ...f.products.prod_M.default_price, product: f.products.prod_M },
      description: "Vêtement de test M noir", quantity: 1, amount_total: 10000, currency: "eur" }] };
  };
  assert.equal((await f.shop.webhook(webhookRequest(f))).status, 200);
  assert.deepEqual(expansion, ["data.price.product"]);
  assert.equal(f.calls.writes[0].record.items[0].size, "M");
  assert.equal(f.calls.writes[0].record.items[0].color, "Noir");
});
