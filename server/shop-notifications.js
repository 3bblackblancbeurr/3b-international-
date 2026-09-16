function supabaseConfig(env) {
  try {
    const url = new URL(env.SUPABASE_URL);
    const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
    return url.protocol === "https:" && key ? { base:url.origin, key } : null;
  } catch { return null; }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function money(cents, currency = "eur") {
  try { return new Intl.NumberFormat("fr-FR", { style:"currency", currency:String(currency || "eur").toUpperCase() }).format(Number(cents || 0) / 100); }
  catch { return `${Number(cents || 0) / 100} €`; }
}

function reference(sessionId) { return String(sessionId || "").slice(-10).toUpperCase() || "3B"; }
function e164(value) { return /^\+[1-9]\d{7,14}$/.test(value || "") ? value : ""; }
function email(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "") ? value : ""; }

function appLink(env) {
  try { const u = new URL(env.APP_URL); return `${u.origin}/#boutique`; }
  catch { return "https://3b-international.vercel.app/#boutique"; }
}

function itemText(item) {
  return [item.description || "Pull 3B International", item.color, item.logo_country, item.size].filter(Boolean).join(" · ")
    + (Number(item.quantity || 1) > 1 ? ` × ${item.quantity}` : "");
}

function addressText(shipping) {
  const a = shipping?.address || {};
  return [a.line1, a.line2, a.postal_code, a.city, a.state, a.country].filter(Boolean).join(", ");
}

async function claim(env, fetcher, sessionId, event, channel) {
  const cfg = supabaseConfig(env); if (!cfg) return false;
  const url = new URL("/rest/v1/shop_notification_log", cfg.base);
  url.searchParams.set("on_conflict", "stripe_session_id,event,channel");
  const response = await fetcher(url, {
    method:"POST", signal:AbortSignal.timeout(10000),
    headers:{ apikey:cfg.key, Authorization:`Bearer ${cfg.key}`, "Content-Type":"application/json", Prefer:"resolution=ignore-duplicates,return=representation" },
    body:JSON.stringify({ stripe_session_id:sessionId, event, channel, state:"pending", attempts:1, updated_at:new Date().toISOString() }),
  });
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function finish(env, fetcher, sessionId, event, channel, state, providerId = null, error = null) {
  const cfg = supabaseConfig(env); if (!cfg) return;
  const url = new URL("/rest/v1/shop_notification_log", cfg.base);
  url.searchParams.set("stripe_session_id", `eq.${sessionId}`);
  url.searchParams.set("event", `eq.${event}`);
  url.searchParams.set("channel", `eq.${channel}`);
  await fetcher(url, {
    method:"PATCH", signal:AbortSignal.timeout(10000),
    headers:{ apikey:cfg.key, Authorization:`Bearer ${cfg.key}`, "Content-Type":"application/json", Prefer:"return=minimal" },
    body:JSON.stringify({ state, provider_id:providerId, last_error:error ? String(error).slice(0, 160) : null, updated_at:new Date().toISOString() }),
  }).catch(() => {});
}

async function sendResend(env, fetcher, { to, subject, html, text, idempotencyKey }) {
  const apiKey = env.RESEND_API_KEY || "";
  const from = env.RESEND_FROM || "";
  if (!apiKey || !email(to) || !from.includes("@")) return { skipped:true };
  const response = await fetcher("https://api.resend.com/emails", {
    method:"POST", signal:AbortSignal.timeout(10000),
    headers:{ Authorization:`Bearer ${apiKey}`, "Content-Type":"application/json", "Idempotency-Key":idempotencyKey },
    body:JSON.stringify({ from, to:[to], subject, html, text }),
  });
  if (!response.ok) throw new Error(`resend_${response.status}`);
  const data = await response.json().catch(() => ({}));
  return { id:data.id || null };
}

async function sendTwilio(env, fetcher, { to, body }) {
  const sid = env.TWILIO_ACCOUNT_SID || "";
  const token = env.TWILIO_AUTH_TOKEN || "";
  const from = e164(env.TWILIO_FROM || "");
  const service = /^MG[a-zA-Z0-9]{20,}$/.test(env.TWILIO_MESSAGING_SERVICE_SID || "") ? env.TWILIO_MESSAGING_SERVICE_SID : "";
  if (!/^AC[a-zA-Z0-9]{20,}$/.test(sid) || !token || !e164(to) || (!from && !service)) return { skipped:true };
  const form = new URLSearchParams({ To:to, Body:body });
  if (service) form.set("MessagingServiceSid", service); else form.set("From", from);
  const response = await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:"POST", signal:AbortSignal.timeout(10000),
    headers:{ Authorization:`Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type":"application/x-www-form-urlencoded" },
    body:form.toString(),
  });
  if (!response.ok) throw new Error(`twilio_${response.status}`);
  const data = await response.json().catch(() => ({}));
  return { id:data.sid || null };
}

async function runChannel(env, fetcher, sessionId, event, channel, sender) {
  if (!await claim(env, fetcher, sessionId, event, channel)) return;
  try {
    const result = await sender();
    if (result?.skipped) {
      await finish(env, fetcher, sessionId, event, channel, "failed", null, "not_configured");
      return;
    }
    await finish(env, fetcher, sessionId, event, channel, "sent", result?.id || null, null);
  } catch (error) {
    await finish(env, fetcher, sessionId, event, channel, "failed", null, error?.message || "provider_error");
  }
}

export async function notifySellerPurchase({ env = process.env, fetcher = fetch, order }) {
  const sessionId = order?.sessionId || "";
  if (!sessionId) return;
  const ref = reference(sessionId);
  const total = money(order.amountTotal, order.currency);
  const items = (order.items || []).map(itemText);
  const address = addressText(order.shipping);
  const link = appLink(env);
  const sellerEmail = email(env.SHOP_SELLER_EMAIL || "");
  const sellerPhone = e164(env.SHOP_SELLER_PHONE || "");

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Nouvelle commande 3B payée</h2><p><strong>Référence :</strong> ${escapeHtml(ref)}<br><strong>Montant :</strong> ${escapeHtml(total)}</p><p><strong>Client :</strong> ${escapeHtml(order.customerName || "—")} · ${escapeHtml(order.customerEmail || "—")}</p><p><strong>Articles :</strong><br>${items.map(x => `• ${escapeHtml(x)}`).join("<br>") || "—"}</p><p><strong>Adresse :</strong> ${escapeHtml(address || "—")}</p><p>La commande attend ta prise en charge. Délai maximum : 5 jours.</p><p><a href="${escapeHtml(link)}">Ouvrir l’espace vendeur 3B</a></p></div>`;
  const text = `Nouvelle commande 3B payée\nRéf: ${ref}\nMontant: ${total}\nClient: ${order.customerName || "—"} ${order.customerEmail || ""}\nArticles: ${items.join(" | ")}\nAdresse: ${address || "—"}\nÀ prendre en charge sous 5 jours.\n${link}`;
  const sms = `3B: nouvelle commande payée ${total}, réf ${ref}. ${items[0] || "Pull 3B"}. À prendre en charge sous 5 jours. ${link}`.slice(0, 600);

  const tasks = [];
  if (sellerEmail && env.RESEND_API_KEY && env.RESEND_FROM) tasks.push(runChannel(env, fetcher, sessionId, "payment_confirmed", "email", () => sendResend(env, fetcher, { to:sellerEmail, subject:`Nouvelle commande 3B payée — ${ref}`, html, text, idempotencyKey:`3b-paid-${sessionId}` })));
  if (sellerPhone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) tasks.push(runChannel(env, fetcher, sessionId, "payment_confirmed", "sms", () => sendTwilio(env, fetcher, { to:sellerPhone, body:sms })));
  await Promise.allSettled(tasks);
}

export async function notifyClientStatus({ env = process.env, fetcher = fetch, order, event }) {
  const sessionId = order?.sessionId || "";
  const to = email(order?.customerEmail || "");
  if (!sessionId || !to || !env.RESEND_API_KEY || !env.RESEND_FROM || !["seller_accepted","shipped"].includes(event)) return;
  const ref = reference(sessionId);
  const link = appLink(env);
  const accepted = event === "seller_accepted";
  const subject = accepted ? `3B — commande ${ref} prise en charge` : `3B — commande ${ref} expédiée`;
  const status = accepted ? "Ta commande a été prise en charge par 3B. L’expédition est prévue sous 2 jours." : "Ta commande a été marquée comme expédiée.";
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(status)}</p><p>Référence : <strong>${escapeHtml(ref)}</strong></p><p><a href="${escapeHtml(link)}">Voir le suivi dans 3B</a></p></div>`;
  await runChannel(env, fetcher, sessionId, event, "email", () => sendResend(env, fetcher, { to, subject, html, text:`${status}\nRéférence: ${ref}\n${link}`, idempotencyKey:`3b-${event}-${sessionId}` }));
}
