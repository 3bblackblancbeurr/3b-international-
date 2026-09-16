import { notifySellerPurchase, notifyClientStatus } from "./shop-notifications.js";

function config(env) {
  try {
    const url = new URL(env.SUPABASE_URL);
    const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
    return url.protocol === "https:" && key ? { base:url.origin, key } : null;
  } catch { return null; }
}

async function storedOrder(sessionId, env, fetcher) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId || "")) return null;
  const cfg = config(env); if (!cfg) return null;
  const select = "stripe_session_id,amount_total,currency,customer_email,customer_name,shipping_details,items,fulfillment_status,created_at,seller_due_at,seller_accepted_at,ship_due_at,shipped_at";
  const url = new URL("/rest/v1/shop_orders", cfg.base);
  url.searchParams.set("select", select);
  url.searchParams.set("stripe_session_id", `eq.${sessionId}`);
  url.searchParams.set("payment_status", "eq.paid");
  url.searchParams.set("limit", "1");
  const response = await fetcher(url, { signal:AbortSignal.timeout(10000), headers:{ apikey:cfg.key, Authorization:`Bearer ${cfg.key}` } });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  return {
    sessionId:row.stripe_session_id,
    amountTotal:Number(row.amount_total || 0), currency:row.currency || "eur",
    customerEmail:row.customer_email || null, customerName:row.customer_name || null,
    shipping:row.shipping_details || null, items:Array.isArray(row.items) ? row.items : [],
    fulfillmentStatus:row.fulfillment_status || "awaiting_seller", createdAt:row.created_at,
    sellerDueAt:row.seller_due_at || null, acceptedAt:row.seller_accepted_at || null,
    shipDueAt:row.ship_due_at || null, shippedAt:row.shipped_at || null,
  };
}

export async function notifySellerBySession(sessionId, { env=process.env, fetcher=fetch } = {}) {
  const order = await storedOrder(sessionId, env, fetcher);
  if (order) await notifySellerPurchase({ env, fetcher, order });
}

export async function notifyClientBySession(sessionId, event, { env=process.env, fetcher=fetch } = {}) {
  const order = await storedOrder(sessionId, env, fetcher);
  if (order) await notifyClientStatus({ env, fetcher, order, event });
}
