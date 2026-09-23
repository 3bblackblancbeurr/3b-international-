import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { checkoutAuth } from "../loyalty/client.js";
import "./order-panels.css";

const money = (amount, currency = "eur") => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format((amount || 0) / 100);
const date = value => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const SELLER_SEEN_KEY = "3b_seller_seen_orders_v1";
const STATUS = {
  new: ["Paiement reçu — en attente de prise en charge", Clock3],
  awaiting_seller: ["Paiement reçu — en attente de prise en charge", Clock3],
  processing: ["Commande prise en charge — préparation en cours", PackageCheck],
  shipped: ["Commande expédiée", Truck],
  cancelled: ["Commande annulée", Clock3],
  refunded: ["Commande remboursée", CheckCircle2],
};

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { ...(options.headers || {}), ...await checkoutAuth() } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Service commandes indisponible."), { status:response.status });
  return data;
}

function itemLabel(item) {
  return [item.description || "Pull 3B", item.color, item.logo_country, item.size].filter(Boolean).join(" · ");
}

function StatusText({ order }) {
  const [label, Icon] = STATUS[order.fulfillmentStatus] || STATUS.awaiting_seller;
  return <div className="order-status-line"><Icon size={19} aria-hidden="true" /><div><strong>{label}</strong>
    {(order.fulfillmentStatus === "new" || order.fulfillmentStatus === "awaiting_seller") && <p>Prise en charge au plus tard le {date(order.sellerDueAt)}.</p>}
    {order.fulfillmentStatus === "processing" && <p>Envoi prévu au plus tard le {date(order.shipDueAt)}.</p>}
    {order.fulfillmentStatus === "shipped" && <p>Expédiée le {date(order.shippedAt)}.</p>}
  </div></div>;
}

export function MyOrdersPanel({ enabled }) {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("idle");
  useEffect(() => {
    if (!enabled) return;
    let alive = true; setState("loading");
    api("/api/my-orders").then(data => { if (alive) { setOrders(data.orders || []); setState("done"); } }).catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [enabled]);
  if (!enabled) return null;
  return <section className="order-panel" aria-labelledby="my-orders-title">
    <div className="order-panel-heading"><div><p className="eyebrow">Suivi</p><h2 id="my-orders-title">Mes commandes</h2></div></div>
    {state === "loading" && <p>Chargement des commandes…</p>}
    {state === "error" && <p>Le suivi des commandes est momentanément indisponible.</p>}
    {state === "done" && !orders.length && <p>Aucune commande payée à afficher pour le moment.</p>}
    <div className="order-list">{orders.map(order => <article key={order.sessionId}>
      <div className="order-card-head"><strong>Commande {order.reference}</strong><span>{money(order.amount, order.currency)}</span></div>
      <StatusText order={order} />
      <p className="order-date">Paiement : {date(order.createdAt)}</p>
      {order.items?.length > 0 && <ul>{order.items.map((item, i) => <li key={`${item.price_id || i}-${i}`}>{itemLabel(item)}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</li>)}</ul>}
    </article>)}</div>
  </section>;
}

function readSeenOrders() {
  try {
    const value = JSON.parse(localStorage.getItem(SELLER_SEEN_KEY) || "[]");
    return new Set(Array.isArray(value) ? value.filter(id => typeof id === "string") : []);
  } catch { return new Set(); }
}

function saveSeenOrders(set) {
  try { localStorage.setItem(SELLER_SEEN_KEY, JSON.stringify([...set].slice(-250))); } catch { /* Device storage is optional. */ }
}

export function SellerOrdersPanel({ enabled }) {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [deviceAlerts, setDeviceAlerts] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const seenRef = useRef(null);
  if (seenRef.current === null && typeof window !== "undefined") seenRef.current = readSeenOrders();

  function signalNewOrders(nextOrders) {
    const pending = nextOrders.filter(order => ["new", "awaiting_seller"].includes(order.fulfillmentStatus));
    setNewCount(pending.length);
    const seen = seenRef.current || new Set();
    const fresh = pending.filter(order => !seen.has(order.sessionId));
    for (const order of nextOrders) seen.add(order.sessionId);
    seenRef.current = seen; saveSeenOrders(seen);
    if (!fresh.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const first = fresh[0];
    const notification = new Notification(fresh.length === 1 ? "Nouvelle commande 3B" : `${fresh.length} nouvelles commandes 3B`, {
      body: fresh.length === 1 ? `${first.reference} · ${money(first.amount, first.currency)} · à prendre en charge` : "Ouvre l’espace vendeur pour les prendre en charge.",
      icon: "/favicon-3b.svg",
      tag: `3b-orders-${fresh.map(order => order.sessionId).join("-").slice(0, 80)}`,
    });
    notification.onclick = () => { window.focus(); window.location.hash = "boutique"; notification.close(); };
    navigator.vibrate?.([120, 70, 120]);
  }

  async function load(silent = false) {
    if (!enabled) return;
    if (!silent) setState("loading");
    try {
      const data = await api("/api/shop-admin-orders");
      const next = data.orders || [];
      setOrders(next); signalNewOrders(next); setState("done");
    } catch { if (!silent) setState("error"); }
  }

  useEffect(() => {
    if (!enabled) return;
    load();
    const timer = window.setInterval(() => load(true), 60000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  async function enableDeviceNotifications() {
    if (typeof Notification === "undefined") { setDeviceAlerts("unsupported"); return; }
    const permission = await Notification.requestPermission();
    setDeviceAlerts(permission);
    if (permission === "granted") {
      new Notification("Alertes commandes 3B activées", { body:"Tu seras alerté sur cet appareil tant que l’application peut recevoir les mises à jour.", icon:"/favicon-3b.svg", tag:"3b-alerts-enabled" });
    }
  }

  async function action(sessionId, next) {
    setBusy(sessionId + next);
    setActionError("");
    try {
      await api("/api/shop-admin-orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sessionId, action:next }) });
      await load(true);
    } catch (error) {
      setActionError(error.status ? error.message : "La connexion a été interrompue. Réessaie dans un instant.");
      if (error.status === 409) await load();
    } finally { setBusy(""); }
  }
  if (!enabled) return null;
  return <section className="order-panel seller-panel" aria-labelledby="seller-orders-title">
    <div className="order-panel-heading"><div><p className="eyebrow">Vendeur 3B</p><h2 id="seller-orders-title">Commandes à traiter {newCount > 0 && <span className="order-count-badge">{newCount}</span>}</h2></div><button type="button" onClick={() => { setActionError(""); load(); }}>Actualiser</button></div>
    <p className="seller-help">Après paiement, une commande reste en attente jusqu’à ta validation. Tu dois la prendre en charge sous 5 jours maximum. Après validation, l’envoi est prévu sous 2 jours.</p>
    <div className="seller-alert-settings">
      <Bell size={19} aria-hidden="true" />
      {deviceAlerts === "default" && <><span>Active les alertes sur cet appareil pour voir immédiatement une nouvelle commande quand l’application fonctionne.</span><button type="button" onClick={enableDeviceNotifications}>Activer les notifications</button></>}
      {deviceAlerts === "granted" && <span>Alertes de l’application activées sur cet appareil. L’e-mail et le SMS peuvent t’alerter même lorsque l’application est fermée.</span>}
      {deviceAlerts === "denied" && <span>Les notifications système sont bloquées sur cet appareil. L’e-mail et le SMS restent disponibles.</span>}
      {deviceAlerts === "unsupported" && <span>Ce navigateur ne prend pas en charge les notifications système. L’e-mail et le SMS restent disponibles.</span>}
    </div>
    {state === "loading" && <p>Chargement…</p>}
    {state === "error" && <p>Accès vendeur indisponible ou non autorisé.</p>}
    {actionError && <p role="alert">{actionError}</p>}
    {state === "done" && !orders.length && <p>Aucune commande payée à traiter.</p>}
    <div className="order-list">{orders.map(order => <article key={order.sessionId} className={["new", "awaiting_seller"].includes(order.fulfillmentStatus) ? "order-needs-action" : ""}>
      <div className="order-card-head"><strong>{order.reference}</strong><span>{money(order.amount, order.currency)}</span></div>
      <StatusText order={order} />
      <p><strong>Client :</strong> {order.customerName || "—"} · {order.customerEmail || "—"}</p>
      {order.shipping && <p><strong>Livraison :</strong> {[order.shipping.address?.line1, order.shipping.address?.postal_code, order.shipping.address?.city, order.shipping.address?.country].filter(Boolean).join(", ")}</p>}
      {order.items?.length > 0 && <ul>{order.items.map((item, i) => <li key={`${item.price_id || i}-${i}`}>{itemLabel(item)}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</li>)}</ul>}
      {(order.fulfillmentStatus === "new" || order.fulfillmentStatus === "awaiting_seller") && <button type="button" disabled={!!busy} onClick={() => action(order.sessionId, "accept")}>Je prends en charge</button>}
      {order.fulfillmentStatus === "processing" && <button type="button" disabled={!!busy} onClick={() => action(order.sessionId, "ship")}>Marquer comme expédiée</button>}
    </article>)}</div>
  </section>;
}
