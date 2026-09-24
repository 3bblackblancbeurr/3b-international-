import Stripe from "stripe";
import { createHash, randomBytes } from "node:crypto";

const INTEGRATION = "pwa-quickkit-pro-v1";
const TEST_PRICE_ID = "price_1UJHLHC3wYXh2i6ld1d3tXua";
const ACTIVE = new Set(["active", "trialing"]);

export class QuickKitCommerceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extra,
  } });
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch { return ""; }
}

function periodEnd(subscription) {
  const seconds = subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

function customerId(value) {
  return typeof value === "string" ? value : value?.id || "";
}

function subscriptionId(value) {
  return typeof value === "string" ? value : value?.id || "";
}

async function readBody(request, maxBytes = 16384) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new QuickKitCommerceError(413, "Requête trop volumineuse.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new QuickKitCommerceError(413, "Requête trop volumineuse.");
  return text;
}

function configFrom(env) {
  const publicUrl = safeHttpsUrl(env.PWA_QUICKKIT_PUBLIC_URL || "https://3b-international.vercel.app/pwa-quickkit/");
  const page = publicUrl ? new URL(publicUrl) : null;
  const origin = page?.origin || "";
  const testEnabled = env.PWA_QUICKKIT_ENABLE_TEST_CHECKOUT === "1";
  const priceId = env.PWA_QUICKKIT_PRO_PRICE_ID || (testEnabled ? TEST_PRICE_ID : "");
  const checkoutEnabled = env.PWA_QUICKKIT_CHECKOUT_ENABLED === "true"
    && !!origin
    && /^price_[A-Za-z0-9]+$/.test(priceId)
    && !!env.STRIPE_SECRET_KEY
    && !!env.SUPABASE_URL
    && !!env.SUPABASE_SERVICE_ROLE_KEY;
  return { publicUrl, origin, priceId, checkoutEnabled };
}

function dbBase(env) {
  const href = safeHttpsUrl(env.SUPABASE_URL);
  if (!href || !env.SUPABASE_SERVICE_ROLE_KEY) throw new QuickKitCommerceError(503, "Stockage Pro indisponible.");
  return href;
}

async function dbRequest(env, fetcher, table, { method = "GET", params = {}, body, prefer } = {}) {
  const url = new URL(`/rest/v1/${table}`, dbBase(env));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const response = await fetcher(url, {
    method,
    signal: AbortSignal.timeout(10000),
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new QuickKitCommerceError(503, "Stockage Pro temporairement indisponible.");
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

function validSessionId(id) {
  return /^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id || "");
}

export function createPwaQuickKitCommerce({ env = process.env, stripe: suppliedStripe, fetcher = fetch } = {}) {
  const config = configFrom(env);
  let stripeClient = suppliedStripe;

  function stripe() {
    if (!stripeClient) {
      if (!env.STRIPE_SECRET_KEY) throw new QuickKitCommerceError(503, "Paiement Pro non configuré.");
      stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 1 });
    }
    return stripeClient;
  }

  function requireOrigin(request) {
    if (!config.origin || request.headers.get("origin") !== config.origin) {
      throw new QuickKitCommerceError(403, "Origine de la demande invalide.");
    }
  }

  async function parseJson(request) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new QuickKitCommerceError(415, "Format de demande invalide.");
    }
    try { return JSON.parse(await readBody(request)); }
    catch (error) {
      if (error instanceof QuickKitCommerceError) throw error;
      throw new QuickKitCommerceError(400, "Demande invalide.");
    }
  }

  async function validatedPrice() {
    const price = await stripe().prices.retrieve(config.priceId, { expand: ["product"] });
    const product = price.product;
    const valid = price.active
      && price.currency === "eur"
      && price.unit_amount === 990
      && price.type === "recurring"
      && price.recurring?.interval === "month"
      && price.recurring?.interval_count === 1
      && product && typeof product === "object"
      && !product.deleted
      && product.active
      && product.metadata?.project === "pwa-quickkit";
    if (!valid) throw new QuickKitCommerceError(503, "Le plan Pro n’est pas correctement configuré.");
    return price;
  }

  async function entitlementBySubscription(id) {
    const rows = await dbRequest(env, fetcher, "pwa_quickkit_entitlements", {
      params: {
        select: "id,stripe_subscription_id,access_token_hash,status",
        stripe_subscription_id: `eq.${id}`,
        limit: 1,
      },
    });
    return rows?.[0] || null;
  }

  async function customerEmail(customer, fallback = "") {
    if (fallback) return String(fallback).trim().toLowerCase();
    const id = customerId(customer);
    if (!id) return "";
    const record = await stripe().customers.retrieve(id);
    if (record?.deleted) return "";
    return String(record?.email || "").trim().toLowerCase();
  }

  async function syncSubscription(subscription, emailHint = "") {
    if (!subscription?.id || subscription.metadata?.integration !== INTEGRATION) return false;
    const email = await customerEmail(subscription.customer, emailHint);
    if (!email || email.length > 320) throw new QuickKitCommerceError(503, "Adresse client manquante.");

    const existing = await entitlementBySubscription(subscription.id);
    const now = new Date().toISOString();
    const payload = {
      stripe_customer_id: customerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      customer_email: email,
      status: subscription.status,
      current_period_end: periodEnd(subscription),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      livemode: Boolean(subscription.livemode),
      updated_at: now,
      ...(existing ? {} : { access_token_hash: tokenHash(newToken()) }),
    };

    if (existing) {
      await dbRequest(env, fetcher, "pwa_quickkit_entitlements", {
        method: "PATCH",
        params: { stripe_subscription_id: `eq.${subscription.id}` },
        body: payload,
        prefer: "return=minimal",
      });
    } else {
      await dbRequest(env, fetcher, "pwa_quickkit_entitlements", {
        method: "POST",
        params: { on_conflict: "stripe_subscription_id" },
        body: payload,
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }
    return true;
  }

  async function eventAlreadyProcessed(id) {
    const rows = await dbRequest(env, fetcher, "pwa_quickkit_webhook_events", {
      params: { select: "event_id", event_id: `eq.${id}`, limit: 1 },
    });
    return Boolean(rows?.length);
  }

  async function recordEvent(event) {
    await dbRequest(env, fetcher, "pwa_quickkit_webhook_events", {
      method: "POST",
      params: { on_conflict: "event_id" },
      body: { event_id: event.id, event_type: event.type, livemode: Boolean(event.livemode) },
      prefer: "resolution=ignore-duplicates,return=minimal",
    });
  }

  function wrap(method, fn) {
    return async request => {
      if (request.method !== method) return json({ error: "Méthode non autorisée." }, 405, { Allow: method });
      try { return await fn(request); }
      catch (error) {
        const status = error instanceof QuickKitCommerceError ? error.status : 503;
        const message = error instanceof QuickKitCommerceError ? error.message : "Service Pro momentanément indisponible.";
        return json({ error: message }, status);
      }
    };
  }

  return {
    checkout: wrap("POST", async request => {
      requireOrigin(request);
      if (!config.checkoutEnabled) throw new QuickKitCommerceError(503, "Le paiement Pro n’est pas encore activé.");
      const body = await parseJson(request);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.attemptId || "")) {
        throw new QuickKitCommerceError(400, "Identifiant de demande invalide.");
      }
      await validatedPrice();
      const session = await stripe().checkout.sessions.create({
        mode: "subscription",
        locale: "fr",
        line_items: [{ price: config.priceId, quantity: 1 }],
        success_url: `${config.publicUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.publicUrl}?checkout=cancelled`,
        allow_promotion_codes: true,
        metadata: { integration: INTEGRATION },
        subscription_data: { metadata: { integration: INTEGRATION } },
      }, { idempotencyKey: `pwaq:${body.attemptId}` });

      const checkoutUrl = new URL(session.url);
      if (checkoutUrl.origin !== "https://checkout.stripe.com") {
        throw new QuickKitCommerceError(503, "Le paiement n’a pas pu être ouvert.");
      }
      return json({ url: session.url });
    }),

    activate: wrap("POST", async request => {
      requireOrigin(request);
      const body = await parseJson(request);
      const id = body?.sessionId || "";
      if (!validSessionId(id)) throw new QuickKitCommerceError(400, "Session de paiement invalide.");
      const session = await stripe().checkout.sessions.retrieve(id, { expand: ["subscription"] });
      if (session.metadata?.integration !== INTEGRATION || session.mode !== "subscription" || session.status !== "complete") {
        throw new QuickKitCommerceError(403, "Session Pro non reconnue.");
      }
      if (!["paid", "no_payment_required"].includes(session.payment_status)) {
        throw new QuickKitCommerceError(402, "Paiement non confirmé.");
      }
      const subscription = typeof session.subscription === "object"
        ? session.subscription
        : await stripe().subscriptions.retrieve(subscriptionId(session.subscription));
      if (!ACTIVE.has(subscription?.status) || subscription.metadata?.integration !== INTEGRATION) {
        throw new QuickKitCommerceError(403, "Abonnement Pro inactif.");
      }
      const email = await customerEmail(subscription.customer, session.customer_details?.email || session.customer_email || "");
      await syncSubscription(subscription, email);

      const token = newToken();
      await dbRequest(env, fetcher, "pwa_quickkit_entitlements", {
        method: "PATCH",
        params: { stripe_subscription_id: `eq.${subscription.id}` },
        body: { access_token_hash: tokenHash(token), updated_at: new Date().toISOString() },
        prefer: "return=minimal",
      });
      return json({
        active: true,
        token,
        status: subscription.status,
        currentPeriodEnd: periodEnd(subscription),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      });
    }),

    status: wrap("GET", async request => {
      const auth = request.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
      if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return json({ active: false });
      const hash = tokenHash(token);
      const rows = await dbRequest(env, fetcher, "pwa_quickkit_entitlements", {
        params: {
          select: "status,current_period_end,cancel_at_period_end",
          access_token_hash: `eq.${hash}`,
          limit: 1,
        },
      });
      const row = rows?.[0];
      const notExpired = !row?.current_period_end || new Date(row.current_period_end).getTime() > Date.now();
      return json({
        active: Boolean(row && ACTIVE.has(row.status) && notExpired),
        status: row?.status || null,
        currentPeriodEnd: row?.current_period_end || null,
        cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
      });
    }),

    webhook: wrap("POST", async request => {
      if (!env.PWA_QUICKKIT_STRIPE_WEBHOOK_SECRET) {
        throw new QuickKitCommerceError(503, "Webhook Pro non configuré.");
      }
      const raw = await readBody(request, 262144);
      let event;
      try {
        event = stripe().webhooks.constructEvent(
          raw,
          request.headers.get("stripe-signature"),
          env.PWA_QUICKKIT_STRIPE_WEBHOOK_SECRET
        );
      } catch {
        throw new QuickKitCommerceError(400, "Signature invalide.");
      }

      if (await eventAlreadyProcessed(event.id)) return json({ received: true, duplicate: true });

      if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
        await syncSubscription(event.data.object);
      } else if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        if (session.metadata?.integration === INTEGRATION && session.subscription) {
          const subscription = await stripe().subscriptions.retrieve(subscriptionId(session.subscription));
          await syncSubscription(subscription, session.customer_details?.email || session.customer_email || "");
        }
      }

      await recordEvent(event);
      return json({ received: true });
    }),
  };
}
