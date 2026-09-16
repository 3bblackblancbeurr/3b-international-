import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, PackageCheck, Truck } from "lucide-react";
import { checkoutAuth } from "../loyalty/client.js";
import "./order-panels.css";

const money = (amount, currency = "eur") => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format((amount || 0) / 100);
const date = value => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
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
  if (!response.ok) throw new Error(data.error || "Service commandes indisponible.");
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

export function SellerOrdersPanel({ enabled }) {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState("");
  async function load() {
    if (!enabled) return;
    setState("loading");
    try { const data = await api("/api/shop-admin-orders"); setOrders(data.orders || []); setState("done"); }
    catch { setState("error"); }
  }
  useEffect(() => { load(); }, [enabled]);
  async function action(sessionId, next) {
    setBusy(sessionId + next);
    try {
      await api("/api/shop-admin-orders", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ sessionId, action:next }) });
      await load();
    } finally { setBusy(""); }
  }
  if (!enabled) return null;
  return <section className="order-panel seller-panel" aria-labelledby="seller-orders-title">
    <div className="order-panel-heading"><div><p className="eyebrow">Vendeur 3B</p><h2 id="seller-orders-title">Commandes à traiter</h2></div><button type="button" onClick={load}>Actualiser</button></div>
    <p className="seller-help">Après paiement, une commande reste en attente jusqu’à ta validation. Tu dois la prendre en charge sous 5 jours maximum. Après validation, l’envoi est prévu sous 2 jours.</p>
    {state === "loading" && <p>Chargement…</p>}
    {state === "error" && <p>Accès vendeur indisponible ou non autorisé.</p>}
    {state === "done" && !orders.length && <p>Aucune commande payée à traiter.</p>}
    <div className="order-list">{orders.map(order => <article key={order.sessionId}>
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
