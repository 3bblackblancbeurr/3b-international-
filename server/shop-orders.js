const DAY = 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class OrderError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" } });
}

function baseUrl(env) {
  try { const u = new URL(env.SUPABASE_URL); return u.protocol === "https:" ? u.origin : ""; }
  catch { return ""; }
}

function config(env) {
  const base = baseUrl(env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) throw new OrderError(503, "Le suivi des commandes est temporairement indisponible.");
  return { base, key };
}

async function serviceFetch(env, fetcher, pathname, { method="GET", body, prefer, headers={} } = {}) {
  const { base, key } = config(env);
  const response = await fetcher(new URL(pathname, base), {
    method, signal: AbortSignal.timeout(10000),
    headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", ...(prefer ? { Prefer:prefer } : {}), ...headers },
    ...(body === undefined ? {} : { body:JSON.stringify(body) }),
  });
  if (!response.ok) throw new OrderError(503, "Le suivi des commandes est temporairement indisponible.");
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function authUser(request, env, fetcher) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.length > 4096) throw new OrderError(401, "Reconnecte-toi à ton compte 3B.");
  const { base, key } = config(env);
  const response = await fetcher(new URL("/auth/v1/user", base), { signal:AbortSignal.timeout(10000), headers:{ apikey:key, Authorization:auth } });
  if (!response.ok) throw new OrderError(401, "Reconnecte-toi à ton compte 3B.");
  const user = await response.json().catch(() => null);
  if (!UUID.test(user?.id || "")) throw new OrderError(401, "Reconnecte-toi à ton compte 3B.");
  let sessionId;
  try { sessionId = JSON.parse(Buffer.from(auth.slice(7).split(".")[1], "base64url")).session_id; } catch { /* Invalid tokens have no active session. */ }
  if (!UUID.test(sessionId || "")) throw new OrderError(401, "Reconnecte-toi à ton compte 3B.");
  const active = await serviceFetch(env, fetcher, "/rest/v1/rpc/loyalty_session_valid", {
    method:"POST", body:{ p_user:user.id, p_session:sessionId },
  });
  if (active !== true) throw new OrderError(401, "Reconnecte-toi à ton compte 3B.");
  return user;
}

async function requireStaff(request, env, fetcher) {
  const user = await authUser(request, env, fetcher);
  const rows = await serviceFetch(env, fetcher, `/rest/v1/community_staff?select=user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  if (!Array.isArray(rows) || !rows.length) throw new OrderError(403, "Accès vendeur non autorisé.");
  return user;
}

function normalizedStatus(value) { return value === "new" ? "awaiting_seller" : value; }
function plusDays(value, days) { const t = new Date(value).getTime(); return Number.isFinite(t) ? new Date(t + days * DAY).toISOString() : null; }
function publicOrder(row, seller = false) {
  const fulfillmentStatus = normalizedStatus(row.fulfillment_status || "awaiting_seller");
  const result = {
    sessionId: row.stripe_session_id,
    reference: row.stripe_session_id?.slice(-10).toUpperCase() || "3B",
    amount: Number(row.amount_total || 0), currency: row.currency || "eur",
    fulfillmentStatus, createdAt: row.created_at,
    sellerDueAt: row.seller_due_at || plusDays(row.created_at, 5),
    acceptedAt: row.seller_accepted_at || null,
    shipDueAt: row.ship_due_at || (row.seller_accepted_at ? plusDays(row.seller_accepted_at, 2) : null),
    shippedAt: row.shipped_at || null,
    items: Array.isArray(row.items) ? row.items : [],
  };
  if (seller) Object.assign(result, { customerEmail:row.customer_email || null, customerName:row.customer_name || null, shipping:row.shipping_details || null, livemode:!!row.livemode });
  return result;
}

async function listSellerOrders(request, env, fetcher) {
  await requireStaff(request, env, fetcher);
  const select = "stripe_session_id,livemode,payment_status,fulfillment_status,amount_total,currency,customer_email,customer_name,shipping_details,items,created_at,seller_due_at,seller_accepted_at,ship_due_at,shipped_at,updated_at";
  const rows = await serviceFetch(env, fetcher, `/rest/v1/shop_orders?select=${encodeURIComponent(select)}&payment_status=eq.paid&order=created_at.desc&limit=100`);
  return json({ orders:(rows || []).map(row => publicOrder(row, true)) });
}

async function updateSellerOrder(request, env, fetcher) {
  const user = await requireStaff(request, env, fetcher);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new OrderError(415, "Format de demande invalide.");
  let body; try { body = await request.json(); } catch { throw new OrderError(400, "Demande invalide."); }
  const sessionId = body?.sessionId || "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) throw new OrderError(400, "Commande invalide.");
  if (!["accept","ship"].includes(body?.action)) throw new OrderError(400, "Action invalide.");
  const select = "stripe_session_id,fulfillment_status,created_at,seller_due_at,seller_accepted_at,ship_due_at,shipped_at,amount_total,currency,items";
  const rows = await serviceFetch(env, fetcher, `/rest/v1/shop_orders?select=${encodeURIComponent(select)}&stripe_session_id=eq.${encodeURIComponent(sessionId)}&payment_status=eq.paid&limit=1`);
  const order = rows?.[0]; if (!order) throw new OrderError(404, "Commande introuvable.");
  const current = normalizedStatus(order.fulfillment_status);
  const now = new Date(); let patch;
  if (body.action === "accept") {
    if (current !== "awaiting_seller") throw new OrderError(409, "Cette commande n’est plus en attente de prise en charge.");
    patch = { fulfillment_status:"processing", seller_user_id:user.id, seller_accepted_at:now.toISOString(), ship_due_at:new Date(now.getTime()+2*DAY).toISOString(), updated_at:now.toISOString(), seller_due_at:order.seller_due_at || plusDays(order.created_at,5) };
  } else {
    if (current !== "processing") throw new OrderError(409, "Cette commande doit d’abord être prise en charge.");
    patch = { fulfillment_status:"shipped", shipped_at:now.toISOString(), updated_at:now.toISOString() };
  }
  // Compare the stored status in the write itself so a stale request cannot undo a later transition.
  const updated = await serviceFetch(env, fetcher, `/rest/v1/shop_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&fulfillment_status=eq.${encodeURIComponent(order.fulfillment_status)}&payment_status=eq.paid&select=stripe_session_id`, { method:"PATCH", body:patch, prefer:"return=representation" });
  if (!Array.isArray(updated) || updated.length !== 1) throw new OrderError(409, "Cette commande a changé. Actualise le suivi avant de réessayer.");
  return json({ ok:true, fulfillmentStatus:patch.fulfillment_status });
}

async function listMyOrders(request, env, fetcher) {
  const user = await authUser(request, env, fetcher);
  const rewards = await serviceFetch(env, fetcher, `/rest/v1/member_purchase_rewards?select=session_id&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc&limit=30`);
  const ids = [...new Set((rewards || []).map(row => row.session_id).filter(id => /^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id)))];
  const select = "stripe_session_id,fulfillment_status,amount_total,currency,items,created_at,seller_due_at,seller_accepted_at,ship_due_at,shipped_at";
  // New purchases belong to the member before loyalty settlement finishes. Keep reward-backed access for legacy orders.
  const ownerFilter = ids.length
    ? `or=${encodeURIComponent(`(loyalty_user_id.eq.${user.id},stripe_session_id.in.(${ids.join(",")}))`)}`
    : `loyalty_user_id=eq.${encodeURIComponent(user.id)}`;
  const rows = await serviceFetch(env, fetcher, `/rest/v1/shop_orders?select=${encodeURIComponent(select)}&${ownerFilter}&payment_status=eq.paid&order=created_at.desc&limit=30`);
  return json({ orders:(rows || []).map(row => publicOrder(row, false)) });
}

function wrap(fn) { return async request => { try { return await fn(request); } catch (error) { return json({ error:error instanceof OrderError ? error.message : "Le service commandes est momentanément indisponible." }, error instanceof OrderError ? error.status : 503); } }; }

export function createShopOrders({ env=process.env, fetcher=fetch } = {}) {
  return {
    mine: wrap(request => request.method === "GET" ? listMyOrders(request, env, fetcher) : Promise.reject(new OrderError(405,"Méthode non autorisée."))),
    admin: wrap(request => request.method === "GET" ? listSellerOrders(request, env, fetcher) : request.method === "POST" ? updateSellerOrder(request, env, fetcher) : Promise.reject(new OrderError(405,"Méthode non autorisée."))),
  };
}
