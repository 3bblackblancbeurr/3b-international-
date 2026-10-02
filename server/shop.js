import Stripe from "stripe";
import {createMemberCommerce,loyaltyCoupon} from "./member-commerce.js";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const INTEGRATION = "3b-shop-v1";
const CHECKOUT_INTEGRATION = "3b-international-rxqvnmka";
const MAX_LINES = 20;
const MAX_ITEMS = 20;
const DAY = 86400000;
const UNAVAILABLE = "La boutique prépare son ouverture. Le paiement sera bientôt disponible.";

export class ShopError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer", ...extra,
  } });
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function stripeKeyMode(value) {
  if (/^(?:sk|rk)_test_[A-Za-z0-9_]+$/.test(value || "")) return "test";
  if (/^(?:sk|rk)_live_[A-Za-z0-9_]+$/.test(value || "")) return "live";
  return "";
}

export function configFrom(env) {
  let origin = "";
  try {
    const url = new URL(env.APP_URL);
    if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      if (!url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) origin = url.origin;
    }
  } catch { /* Unconfigured stores stay closed. */ }
  const priceIds = [...new Set((env.STRIPE_PRICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean))];
  const catalogMode = env.STRIPE_CATALOG_MODE || "allowlist";
  const catalogConfigured = catalogMode === "metadata" || (catalogMode === "allowlist"
    && priceIds.length > 0 && priceIds.length <= 50 && priceIds.every(id => /^price_[A-Za-z0-9]+$/.test(id)));
  const countries = [...new Set((env.SHOP_SHIPPING_COUNTRIES || "FR").split(",").map(s => s.trim()).filter(Boolean))];
  const termsUrl = safeUrl(env.SHOP_TERMS_URL);
  const privacyUrl = safeUrl(env.SHOP_PRIVACY_URL);
  const shippingUrl = safeUrl(env.SHOP_SHIPPING_URL);
  const returnsUrl = safeUrl(env.SHOP_RETURNS_URL);
  const legalUrl = safeUrl(env.SHOP_LEGAL_URL);
  const shippingIncluded = env.SHOP_SHIPPING_INCLUDED === "true";
  const shippingRateId = env.STRIPE_SHIPPING_RATE_ID || "";
  const shippingConfigured = shippingIncluded || /^shr_[A-Za-z0-9]+$/.test(shippingRateId);
  const releaseApproved = env.SHOP_RELEASE_APPROVED === "true";
  const stripeMode = stripeKeyMode(env.STRIPE_SECRET_KEY);
  const liveApproved = env.SHOP_LIVE_APPROVED === "true";
  const stripeApproved = stripeMode === "test" || (stripeMode === "live" && liveApproved);
  const cookieSecret = typeof env.SHOP_CHECKOUT_COOKIE_SECRET === "string" && env.SHOP_CHECKOUT_COOKIE_SECRET.length >= 32
    ? env.SHOP_CHECKOUT_COOKIE_SECRET : "";
  const automaticTaxRequested = env.SHOP_AUTOMATIC_TAX === "true";
  const taxReady = !automaticTaxRequested || env.SHOP_TAX_REGISTRATION_CONFIRMED === "true";
  const enabled = env.SHOP_ENABLED === "true" && releaseApproved && stripeApproved && !!cookieSecret && !!origin
    && !!env.STRIPE_WEBHOOK_SECRET && !!safeUrl(env.SUPABASE_URL) && !!env.SUPABASE_SERVICE_ROLE_KEY
    && !!termsUrl && !!privacyUrl && !!shippingUrl && !!returnsUrl && !!legalUrl
    && shippingConfigured && catalogConfigured && taxReady
    && countries.length > 0 && countries.every(c => /^(FR|IT|EE|TR|DZ|TN|MA|ES)$/.test(c));
  return { origin, priceIds, catalogMode, countries, enabled, releaseApproved, liveApproved, stripeMode, stripeApproved,
    cookieSecret, termsUrl, privacyUrl, shippingUrl, returnsUrl, legalUrl, shippingRateId, shippingIncluded,
    automaticTax: automaticTaxRequested && taxReady };
}

function publicPrice(price, stripeMode) {
  const product = price.product;
  if (!price.active || price.type !== "one_time" || price.currency !== "eur"
    || typeof price.livemode !== "boolean" || price.livemode !== (stripeMode === "live")
    || !Number.isSafeInteger(price.unit_amount) || price.unit_amount <= 0
    || price.tax_behavior !== "inclusive" || price.billing_scheme !== "per_unit" || price.transform_quantity
    || !product || typeof product !== "object" || product.deleted || !product.active) return null;
  const metadata = { ...product.metadata, ...price.metadata };
  const max = Number(metadata.max_per_order || 5);
  return { id: price.id, productId: product.metadata?.shop_group || product.id, name: product.metadata?.shop_name || product.name,
    description: product.description || "", image: safeUrl(product.images?.[0]),
    size: metadata.size || "Taille unique", color: metadata.color || "",
    logoCountry: metadata.logo_country || "",
    amount: price.unit_amount, currency: "eur", livemode: price.livemode,
    maxQuantity: Number.isInteger(max) && max > 0 ? Math.min(max, 5) : 5 };
}

export function normalizeCart(body, catalog) {
  if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_LINES)
    throw new ShopError(400, "Ton panier est vide ou trop volumineux.");
  const quantities = new Map();
  for (const item of body.items) {
    if (!item || typeof item.priceId !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1)
      throw new ShopError(400, "Une quantité du panier est invalide.");
    quantities.set(item.priceId, (quantities.get(item.priceId) || 0) + item.quantity);
  }
  const known = new Map(catalog.map(item => [item.id, item]));
  let total = 0;
  const lines = [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([price, quantity]) => {
    const item = known.get(price);
    if (!item) throw new ShopError(409, "Un article n’est plus disponible. Actualise la collection.");
    if (quantity > item.maxQuantity) throw new ShopError(400, "La quantité maximale par article est dépassée.");
    total += quantity;
    return { price, quantity };
  });
  if (total > MAX_ITEMS) throw new ShopError(400, "Le panier est limité à 20 articles par commande.");
  return lines;
}

async function readBody(request, maxBytes) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new ShopError(413, "Requête trop volumineuse.");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new ShopError(413, "Requête trop volumineuse."); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function cookieName(id) { return `3b_checkout_${createHash("sha256").update(id).digest("hex").slice(0, 16)}`; }
function cookieValue(id, key) { return createHmac("sha256", key).update(`checkout:${id}`).digest("hex"); }
function validCookie(request, id, key) {
  const pairs = (request.headers.get("cookie") || "").split(";").map(s => s.trim().split("="));
  const actual = pairs.find(([name]) => name === cookieName(id))?.[1] || "";
  const expected = cookieValue(id, key);
  return /^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function createShop({ env = process.env, stripe: suppliedStripe, fetcher = fetch } = {}) {
  const config = configFrom(env);
  const loyalty = createMemberCommerce({env,fetcher});
  let client = suppliedStripe;
  function stripe() {
    if (!client) {
      if (!env.STRIPE_SECRET_KEY) throw new ShopError(503, UNAVAILABLE);
      client = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
    }
    return client;
  }

  function assertStripeMode(livemode) {
    if (!config.stripeApproved || typeof livemode !== "boolean" || livemode !== (config.stripeMode === "live")) {
      throw new ShopError(503, UNAVAILABLE);
    }
  }

  async function catalog() {
    if (!config.stripeApproved) return [];
    if (config.catalogMode === "metadata") {
      const items = [];
      let cursor;
      for (let page = 0; page < 5; page++) {
        const result = await stripe().products.list({ active: true, limit: 100,
          ...(cursor ? { starting_after: cursor } : {}) });
        for (const product of result.data) {
          if (product.metadata?.shop_visible !== "true") continue;
          const defaultPriceId = typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
          if (!/^price_[A-Za-z0-9]+$/.test(defaultPriceId || "")) continue;
          const price = await stripe().prices.retrieve(defaultPriceId);
          const priceProductId = typeof price?.product === "string" ? price.product : price?.product?.id;
          if (priceProductId !== product.id) continue;
          const item = publicPrice({ ...price, product }, config.stripeMode);
          if (item) items.push(item);
        }
        if (!result.has_more) return items;
        const next = result.data.at(-1)?.id;
        if (!next || next === cursor) throw new ShopError(503, UNAVAILABLE);
        cursor = next;
      }
      throw new ShopError(503, UNAVAILABLE);
    }
    if (config.catalogMode !== "allowlist") throw new ShopError(503, UNAVAILABLE);
    if (!config.priceIds.length) return [];
    if (config.priceIds.length > 50 || config.priceIds.some(id => !/^price_[A-Za-z0-9]+$/.test(id)))
      throw new ShopError(503, UNAVAILABLE);
    const prices = await Promise.all(config.priceIds.map(id => stripe().prices.retrieve(id, { expand: ["product"] })));
    return prices.map(price => publicPrice(price, config.stripeMode)).filter(Boolean);
  }

  async function shipping() {
    if (config.shippingIncluded) return { name: "Livraison France incluse", amount: 0, currency: "eur", countries: config.countries };
    if (!config.shippingRateId) return null;
    const rate = await stripe().shippingRates.retrieve(config.shippingRateId);
    if (!rate.active || typeof rate.livemode !== "boolean" || rate.livemode !== (config.stripeMode === "live")
      || rate.type !== "fixed_amount" || rate.fixed_amount?.currency !== "eur"
      || !Number.isSafeInteger(rate.fixed_amount.amount) || rate.fixed_amount.amount < 0
      || (config.automaticTax && rate.tax_behavior !== "inclusive")) throw new ShopError(503, UNAVAILABLE);
    return { name: rate.display_name, amount: rate.fixed_amount.amount, currency: "eur", countries: config.countries };
  }

  async function ordersRequest(method, body) {
    const base = safeUrl(env.SUPABASE_URL);
    if (!base || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ShopError(503, "La confirmation de commande est temporairement indisponible.");
    const url = new URL("/rest/v1/shop_orders", base);
    if (method === "GET") { url.searchParams.set("select", "stripe_session_id"); url.searchParams.set("limit", "0"); }
    else url.searchParams.set("on_conflict", "stripe_session_id");
    const response = await fetcher(url, { method, signal: AbortSignal.timeout(10000), headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal",
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new ShopError(503, "La confirmation prend un peu de temps. Ne repaie pas ; réessaie la vérification dans un instant.");
  }

  async function savePaidOrder(session) {
    if (session.metadata?.integration !== INTEGRATION || session.mode !== "payment"
      || session.status !== "complete" || session.payment_status !== "paid") return false;
    assertStripeMode(session.livemode);
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId || "") || session.currency !== "eur"
      || !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0) throw new ShopError(503, "Vérification de la commande en cours.");
    const lines = await stripe().checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] });
    if (lines.has_more) throw new ShopError(503, "Vérification de la commande en cours.");
    const now = new Date();
    const loyaltyUserId = /^[0-9a-f-]{36}$/i.test(session.metadata?.loyalty_user_id || "") ? session.metadata.loyalty_user_id : null;
    await ordersRequest("POST", {
      stripe_session_id: session.id, payment_intent_id: paymentIntentId,
      livemode: session.livemode, payment_status: "paid", fulfillment_status: "awaiting_seller",
      loyalty_user_id: loyaltyUserId, seller_due_at: new Date(now.getTime() + 5 * DAY).toISOString(), updated_at: now.toISOString(),
      amount_total: session.amount_total, currency: session.currency,
      customer_email: session.customer_details?.email || null,
      customer_name: session.customer_details?.name || null,
      shipping_details: session.collected_information?.shipping_details || session.shipping_details || null,
      items: lines.data.map(item => ({ price_id: item.price?.id, description: item.description,
        quantity: item.quantity, amount_total: item.amount_total, currency: item.currency,
        size: item.price?.metadata?.size || item.price?.product?.metadata?.size || null,
        color: item.price?.metadata?.color || item.price?.product?.metadata?.color || null,
        logo_country: item.price?.metadata?.logo_country || item.price?.product?.metadata?.logo_country || null })),
    });
    await loyalty.purchase(session,lines.data,stripe());
    return true;
  }

  async function syncRefund(charge) {
    const paymentIntentId = typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId || "")) return false;
    const intent = await stripe().paymentIntents.retrieve(paymentIntentId);
    if (intent?.metadata?.integration !== INTEGRATION) return false;
    assertStripeMode(charge?.livemode);
    assertStripeMode(intent?.livemode);
    if (charge.paid !== true || charge.currency !== "eur" || intent.currency !== "eur"
      || !Number.isSafeInteger(charge.amount) || charge.amount <= 0 || intent.amount !== charge.amount
      || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded <= 0 || charge.amount_refunded > charge.amount) {
      throw new ShopError(503, "Vérification du remboursement en cours.");
    }
    const base = safeUrl(env.SUPABASE_URL);
    if (!base || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ShopError(503, "Vérification du remboursement en cours.");
    const response = await fetcher(new URL("/rest/v1/rpc/shop_apply_refund", base), {
      method:"POST", signal:AbortSignal.timeout(10000),
      headers:{ apikey:env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type":"application/json" },
      body:JSON.stringify({ p_payment_intent:paymentIntentId, p_livemode:charge.livemode,
        p_amount_total:charge.amount, p_amount_refunded:charge.amount_refunded }),
    });
    if (!response.ok) throw new ShopError(503, "Vérification du remboursement en cours.");
    const result = await response.json().catch(() => null);
    if (!result?.found) throw new ShopError(503, "Vérification du remboursement en cours.");
    await loyalty.refund(charge);
    return true;
  }

  function wrap(method, fn) {
    return async request => {
      if (request.method !== method) return json({ error: "Méthode non autorisée." }, 405, { Allow: method });
      try { return await fn(request); }
      catch (error) {
        return json({ error: error instanceof ShopError ? error.message : "Le service est momentanément indisponible. Réessaie dans un instant." },
          error instanceof ShopError ? error.status : 503);
      }
    };
  }

  return {
    catalog: wrap("GET", async () => {
      const items = await catalog();
      const delivery = items.length ? await shipping() : null;
      return json({ items, shipping: delivery, enabled: config.enabled && items.length > 0 && !!delivery,
        testMode: items.length > 0 && items.every(item => !item.livemode),
        links: { terms: config.termsUrl, privacy: config.privacyUrl, shipping: config.shippingUrl,
          returns: config.returnsUrl, legal: config.legalUrl } });
    }),

    checkout: wrap("POST", async request => {
      if (!config.enabled) throw new ShopError(503, UNAVAILABLE);
      if (request.headers.get("origin") !== config.origin) throw new ShopError(403, "Origine de la demande invalide.");
      if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ShopError(415, "Format de demande invalide.");
      let body;
      try { body = JSON.parse(await readBody(request, 16384)); } catch (error) {
        if (error instanceof ShopError) throw error;
        throw new ShopError(400, "Demande invalide.");
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.attemptId || ""))
        throw new ShopError(400, "Identifiant de demande invalide.");
      let member;
      try { member=await loyalty.member(request); } catch { throw new ShopError(401,"Reconnecte-toi au compte 3B pour vérifier tes avantages avant le paiement."); }
      const lines = normalizeCart(body, await catalog());
      await shipping();
      await ordersRequest("GET");
      const shippingKey = config.shippingIncluded ? "included" : config.shippingRateId;
      const digest = createHash("sha256").update(JSON.stringify({ lines, origin: config.origin, shipping: shippingKey, member: member?.id || null, discount: member?.discount || 0 })).digest("hex");
      const coupon = member?.discount ? await loyaltyCoupon(stripe(),member.discount) : null;
      const loyaltyMetadata = member ? {loyalty_user_id:member.id,loyalty_discount:String(member.discount)} : {};
      const shippingOptions = config.shippingIncluded
        ? [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "eur" }, display_name: "Livraison France incluse" } }]
        : [{ shipping_rate: config.shippingRateId }];
      const session = await stripe().checkout.sessions.create({
        mode: "payment", locale: "fr", submit_type: "pay", integration_identifier: CHECKOUT_INTEGRATION,
        ...(coupon ? {discounts:[{coupon}]} : {}),
        line_items: lines, billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: config.countries },
        shipping_options: shippingOptions,
        automatic_tax: { enabled: config.automaticTax },
        consent_collection: { terms_of_service: "required" },
        metadata: { integration: INTEGRATION, ...loyaltyMetadata }, payment_intent_data: { metadata: { integration: INTEGRATION, ...loyaltyMetadata } },
        success_url: `${config.origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#boutique`,
        cancel_url: `${config.origin}/?checkout=cancel#boutique`,
      }, { idempotencyKey: `3b:${body.attemptId}:${digest}` });
      const checkoutUrl = new URL(session.url);
      if (checkoutUrl.origin !== "https://checkout.stripe.com") throw new ShopError(503, "Le paiement n’a pas pu être ouvert.");
      const secure = config.origin.startsWith("https:") ? "; Secure" : "";
      return json({ url: session.url, sessionId: session.id }, 200, {
        "Set-Cookie": `${cookieName(session.id)}=${cookieValue(session.id, config.cookieSecret)}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=86400${secure}`,
      });
    }),

    status: wrap("GET", async request => {
      const id = new URL(request.url).searchParams.get("session_id") || "";
      if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id) || !env.STRIPE_SECRET_KEY || !config.cookieSecret || !validCookie(request, id, config.cookieSecret))
        throw new ShopError(403, "Ouvre la confirmation dans le navigateur utilisé pour payer.");
      const session = await stripe().checkout.sessions.retrieve(id);
      if (session.metadata?.integration !== INTEGRATION) throw new ShopError(404, "Commande introuvable.");
      const paid = await savePaidOrder(session);
      return json({ paid, status: session.status, paymentStatus: session.payment_status,
        amount: session.amount_total, currency: session.currency, reference: session.id.slice(-10).toUpperCase() });
    }),

    webhook: wrap("POST", async request => {
      if (!env.STRIPE_WEBHOOK_SECRET) throw new ShopError(503, "Webhook non configuré.");
      const body = await readBody(request, 262144);
      let event;
      try { event = stripe().webhooks.constructEvent(body, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET); }
      catch { throw new ShopError(400, "Signature invalide."); }
      assertStripeMode(event.livemode);
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
        const incoming = event.data.object;
        if (incoming.metadata?.integration === INTEGRATION) {
          const session = await stripe().checkout.sessions.retrieve(incoming.id);
          await savePaidOrder(session);
        }
      }
      if(event.type === "charge.refunded") {
        const incoming=event.data.object;
        const charge=await stripe().charges.retrieve(incoming.id);
        await syncRefund(charge);
      }
      return json({ received: true });
    }),
  };
}
