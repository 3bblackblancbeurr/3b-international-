import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingBag, ShieldCheck, ArrowLeft, Trash2, CheckCircle2, Truck, BadgeCheck } from "lucide-react";
import { CART_KEY, PENDING_KEY, readStored, writeStored, sanitizeCart, subtractPurchased } from "./cart.js";
import "./shop.css";
import {useLoyalty} from "../loyalty/LoyaltyContext.jsx";
import {checkoutAuth} from "../loyalty/client.js";
import {discountFor} from "../../shared/loyalty.js";

const money = (amount, currency = "eur") => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount / 100);
const variantLabel = item => [item.color, item.logoCountry, item.size && item.size !== "Taille unique" ? item.size : ""].filter(Boolean).join(" · ");
const LINK_NAMES = { shipping: "Livraison", returns: "Retours", terms: "Conditions de vente", privacy: "Confidentialité", legal: "Mentions légales" };
const LOGO_COUNTRIES = ["Italie", "France", "Algérie", "Estonie", "Maroc", "Tunisie", "Espagne", "Turquie"];
const SHOP_MEDIA = [
  { src: "/shop/pull-3b-noir.webp", alt: "Pull 3B International noir, 80 euros livraison incluse, choix du logo par pays" },
  { src: "/shop/pull-3b-logos.webp", alt: "Les huit logos brodés thermocollants 3B : Italie, France, Algérie, Estonie, Maroc, Tunisie, Espagne et Turquie" },
  { src: "/shop/pull-3b-blanc.webp", alt: "Pull 3B International blanc, 80 euros livraison incluse, choix du logo par pays" },
];

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  let data;
  try { data = await response.json(); } catch { throw new Error("La boutique est temporairement indisponible. Réessaie dans un instant."); }
  if (!response.ok) throw new Error(data.error || "Le service est momentanément indisponible.");
  return data;
}

function ProductGallery() {
  const [active, setActive] = useState(0);
  return (
    <div className="shop-gallery">
      <div className="shop-gallery-main">
        <img src={SHOP_MEDIA[active].src} alt={SHOP_MEDIA[active].alt} loading={active ? "lazy" : "eager"} />
      </div>
      <div className="shop-gallery-thumbs" aria-label="Photos du Pull 3B International">
        {SHOP_MEDIA.map((media, index) => (
          <button key={media.src} type="button" className={active === index ? "is-active" : ""}
            onClick={() => setActive(index)} aria-label={`Afficher la photo ${index + 1}`} aria-pressed={active === index}>
            <img src={media.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CountryChoices() {
  return (
    <div className="shop-logo-choice">
      <p><strong>Logo brodé thermocollant à chaud au choix</strong></p>
      <div className="shop-country-grid" aria-label="Logos disponibles par pays">
        {LOGO_COUNTRIES.map(country => <span key={country}>{country}</span>)}
      </div>
    </div>
  );
}

function ProductCard({ variants, onAdd, disabled, shippingIncluded }) {
  const [selected, setSelected] = useState(variants[0].id);
  useEffect(() => {
    if (!variants.some(item => item.id === selected)) setSelected(variants[0].id);
  }, [variants, selected]);
  const product = variants.find(item => item.id === selected) || variants[0];
  return (
    <article className="shop-product shop-product-featured">
      <ProductGallery />
      <div className="shop-product-details">
        <p className="shop-product-kicker">Collection 3B International</p>
        <h2>{product.name}</h2>
        {product.description && <p>{product.description}</p>}
        <div className="shop-product-price">
          <strong>{money(product.amount)}</strong><span>TTC {shippingIncluded ? "· livraison incluse" : ""}</span>
        </div>
        {variants.length > 1 ? (
          <label>Couleur et logo
            <select value={product.id} onChange={event => setSelected(event.target.value)}>
              {variants.map(item => <option key={item.id} value={item.id}>{variantLabel(item)}</option>)}
            </select>
          </label>
        ) : <p className="shop-variant">{variantLabel(product)}</p>}
        <CountryChoices />
        <div className="shop-delivery-note"><Truck size={18} aria-hidden="true" /> France : expédition/livraison annoncée sous 2 à 3 jours après paiement confirmé.</div>
        <button type="button" className="shop-button" disabled={disabled}
          onClick={() => onAdd(product)} aria-label={`Ajouter ${product.name} ${variantLabel(product)} au panier`}>
          <ShoppingBag size={18} aria-hidden="true" /> Ajouter au panier
        </button>
      </div>
    </article>
  );
}

function PullPreview() {
  return (
    <article className="shop-product shop-product-featured shop-product-preview">
      <ProductGallery />
      <div className="shop-product-details">
        <p className="shop-product-kicker">Collection 3B International</p>
        <h2>Pull 3B International</h2>
        <p>Pull premium noir ou blanc avec relief 3B International. Choisis l’un des huit logos brodés thermocollants à chaud.</p>
        <div className="shop-product-price"><strong>80,00 €</strong><span>TTC · livraison France incluse</span></div>
        <CountryChoices />
        <div className="shop-delivery-note"><Truck size={18} aria-hidden="true" /> France : 2 à 3 jours après paiement confirmé.</div>
        <div className="shop-preview-status"><BadgeCheck size={18} aria-hidden="true" /> Présentation en ligne. Le bouton de paiement s’active uniquement quand Stripe et les paramètres vendeur sont complètement validés.</div>
        <button type="button" className="shop-button" disabled><ShoppingBag size={18} aria-hidden="true" /> Paiement bientôt disponible</button>
      </div>
    </article>
  );
}

export default function ShopPage({ goTo, reducedMotion = false }) {
  const account=useLoyalty();
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [cart, setCart] = useState(() => sanitizeCart(readStored(CART_KEY, [])));
  const [notice, setNotice] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const attempt = useRef(null);
  const [confirmation, setConfirmation] = useState(null);
  const [verification, setVerification] = useState(0);
  const [returnState, setReturnState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { action: params.get("checkout"), sessionId: params.get("session_id") };
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    requestJson("/api/catalog", { signal: controller.signal }).then(setCatalog).catch(error => {
      if (error.name !== "AbortError") setLoadError(error.message);
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => { writeStored(CART_KEY, cart); }, [cart]);

  useEffect(() => {
    if (returnState.action !== "success" || !returnState.sessionId) return;
    const controller = new AbortController();
    setConfirmation({ state: "loading" });
    requestJson(`/api/order-status?session_id=${encodeURIComponent(returnState.sessionId)}`, { signal: controller.signal })
      .then(data => {
        if (data.paid) {
          setConfirmation({ state: "paid", ...data });
          const pending = readStored(PENDING_KEY, null);
          if (pending?.sessionId === returnState.sessionId && !pending.cleared) {
            setCart(current => subtractPurchased(current, pending.items));
            writeStored(PENDING_KEY, { ...pending, cleared: true });
          }
        } else setConfirmation({ state: data.status === "expired" ? "expired" : "pending" });
      }).catch(error => {
        if (error.name !== "AbortError") setConfirmation({ state: "error", message: error.message });
      });
    return () => controller.abort();
  }, [returnState.action, returnState.sessionId, verification]);

  const products = useMemo(() => {
    const groups = new Map();
    for (const item of catalog?.items || []) {
      if (!groups.has(item.productId)) groups.set(item.productId, []);
      groups.get(item.productId).push(item);
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) => variantLabel(a).localeCompare(variantLabel(b), "fr"));
    }
    return [...groups.values()];
  }, [catalog]);
  const itemsById = useMemo(() => new Map((catalog?.items || []).map(item => [item.id, item])), [catalog]);
  const count = cart.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = cart.reduce((sum, row) => sum + (itemsById.get(row.priceId)?.amount || 0) * row.quantity, 0);
  const invalidCart = cart.some(row => !itemsById.has(row.priceId) || row.quantity > itemsById.get(row.priceId).maxQuantity);
  const resolvingPayment = returnState.action === "success" && confirmation?.state !== "paid";
  const shippingIncluded = !!catalog?.shipping && catalog.shipping.amount === 0;

  function changeCart(update) {
    if (submitting.current) return;
    attempt.current = null;
    setCheckoutError("");
    setCart(update);
  }
  function add(product) {
    const current = cart.find(row => row.priceId === product.id)?.quantity || 0;
    if (count >= 20 || current >= product.maxQuantity) {
      setNotice("La quantité maximale pour cette commande est atteinte."); return;
    }
    changeCart(rows => current ? rows.map(row => row.priceId === product.id ? { ...row, quantity: row.quantity + 1 } : row)
      : [...rows, { priceId: product.id, quantity: 1 }]);
    setNotice(`${product.name} · ${variantLabel(product)} ajouté au panier.`);
  }
  async function checkout() {
    if (submitting.current || !catalog?.enabled || invalidCart || !cart.length || resolvingPayment) return;
    submitting.current = true; setBusy(true); setCheckoutError("");
    const snapshot = cart.map(row => ({ ...row }));
    attempt.current ||= crypto.randomUUID();
    try {
      const data = await requestJson("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json", ...await checkoutAuth() },
        body: JSON.stringify({ items: snapshot, attemptId: attempt.current }),
      });
      const url = new URL(data.url);
      if (url.origin !== "https://checkout.stripe.com") throw new Error("Le paiement n’a pas pu être ouvert.");
      writeStored(PENDING_KEY, { sessionId: data.sessionId, items: snapshot, cleared: false });
      window.location.assign(url.href);
    } catch (error) {
      setCheckoutError(error.message);
      submitting.current = false; setBusy(false);
    }
  }
  function dismissReturn() {
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout"); url.searchParams.delete("session_id");
    window.history.replaceState(null, "", `${url.pathname}${url.search}#boutique`);
    setReturnState({ action: null, sessionId: null }); setConfirmation(null);
  }

  return (
    <section className="shop3b">
      <div className="shop-heading">
        <div>
          <button type="button" className="shop-back" onClick={() => goTo("home")}><ArrowLeft size={16} aria-hidden="true" /> Retour</button>
          <p className="eyebrow">3B International</p><h1>Boutique</h1>
          <p>Ce n’est pas une marque, c’est un héritage.</p>
        </div>
        <a className="shop-bag-link" href="#shop-panier" onClick={event => {
          event.preventDefault(); document.getElementById("shop-panier")?.scrollIntoView({ behavior:
            reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          document.getElementById("shop-panier")?.focus({ preventScroll: true });
        }}><ShoppingBag aria-hidden="true" size={20} /> Panier <span>{count}</span></a>
      </div>

      <div className="shop-loyalty-note">{account.profile?<>Carte de fidélité de @{account.profile.handle} · 10 points par euro d’articles payé.{discountFor(account.profile.points)>0&&<> Avantage actuel : −{discountFor(account.profile.points)} %, vérifié au paiement.</>}</>:<>Connecte-toi avant le paiement pour gagner des points et retrouver ta carte de fidélité vêtements et accessoires. <button onClick={()=>goTo("member")}>Mon compte 3B</button></>}</div>
      {catalog?.testMode && <p className="shop-banner">Mode test : aucun paiement réel.</p>}
      {returnState.action === "cancel" && <div className="shop-banner" role="status">
        <p>Tu as quitté la page de paiement. Ton panier est conservé.</p>
        <button type="button" className="shop-text-button" onClick={dismissReturn}>Revenir à la collection</button>
      </div>}
      {returnState.action === "success" && <div className="shop-confirmation" role="status" aria-live="polite">
        {confirmation?.state === "paid" ? <>
          <CheckCircle2 aria-hidden="true" /><h2>Merci pour ta commande.</h2>
          <p>Paiement confirmé : {money(confirmation.amount, confirmation.currency)}.</p>
          <p>Référence : <strong>{confirmation.reference}</strong></p>
          <button type="button" className="shop-text-button" onClick={dismissReturn}>Continuer mes découvertes</button>
        </> : confirmation?.state === "expired" ? <>
          <h2>Cette session de paiement a expiré.</h2>
          <p>Ton panier est conservé.</p>
          <button type="button" className="shop-text-button" onClick={dismissReturn}>Revenir au panier</button>
        </> : <>
          <h2>Vérification de ton paiement</h2>
          <p>{confirmation?.state === "error" ? confirmation.message : "La confirmation peut prendre quelques instants. Ne repaie pas pendant cette vérification."}</p>
          {confirmation?.state !== "loading" && <button type="button" className="shop-text-button" onClick={() => setVerification(n => n + 1)}>Vérifier à nouveau</button>}
        </>}
      </div>}

      <p className="shop-announcement" role="status" aria-live="polite">{notice}</p>
      {loadError && <div className="shop-banner" role="alert"><p>{loadError}</p>
        <button type="button" className="shop-text-button" onClick={() => setReload(n => n + 1)}>Réessayer</button></div>}

      <div className="shop-layout">
        <div>
          {!catalog && !loadError && <p role="status" className="shop-muted">Chargement du paiement sécurisé… Le produit reste visible ci-dessous.</p>}
          {products.length ? <div className="shop-products">
            {products.map(variants => <ProductCard key={variants[0].productId} variants={variants} onAdd={add}
              shippingIncluded={shippingIncluded} disabled={busy || resolvingPayment} />)}
          </div> : <PullPreview />}
        </div>

        <aside className="shop-cart" id="shop-panier" tabIndex={-1} aria-label="Ton panier">
          <div className="shop-cart-title"><h2>Ton panier</h2><span>{count} article{count > 1 ? "s" : ""}</span></div>
          {!cart.length ? <p className="shop-muted">Choisis une couleur et un logo pays pour commencer ta commande.</p> : <ul className="shop-cart-list">
            {cart.map(row => {
              const item = itemsById.get(row.priceId);
              return <li key={row.priceId}>
                <div><strong>{item?.name || "Article indisponible"}</strong><p>{item ? variantLabel(item) : "Retire cet article pour continuer."}</p></div>
                <div className="shop-cart-controls">
                  {item && <label>Quantité
                    <select value={row.quantity} disabled={busy || resolvingPayment} onChange={event => {
                      const quantity = Number(event.target.value);
                      if (count - row.quantity + quantity > 20) { setNotice("Le panier est limité à 20 articles."); return; }
                      changeCart(rows => rows.map(line => line.priceId === row.priceId ? { ...line, quantity } : line));
                    }}>{Array.from({ length: Math.max(item.maxQuantity, row.quantity) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
                  </label>}
                  <strong>{item ? money(item.amount * row.quantity) : "—"}</strong>
                  <button type="button" className="shop-remove" disabled={busy || resolvingPayment}
                    aria-label={`Retirer ${item?.name || "l’article indisponible"} ${item ? variantLabel(item) : ""}`}
                    onClick={() => changeCart(rows => rows.filter(line => line.priceId !== row.priceId))}><Trash2 size={18} aria-hidden="true" /></button>
                </div>
              </li>;
            })}
          </ul>}
          {cart.length > 0 && <dl className="shop-totals">
            <div><dt>Articles TTC</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Livraison</dt><dd>{catalog?.shipping ? (shippingIncluded ? "Incluse" : money(catalog.shipping.amount)) : "À confirmer"}</dd></div>
            {catalog?.shipping && !invalidCart && <div className="shop-total"><dt>Total TTC</dt><dd>{money(subtotal + catalog.shipping.amount)}</dd></div>}
          </dl>}
          {catalog?.shipping && <p className="shop-muted">Livraison : {catalog.shipping.countries.map(code => new Intl.DisplayNames(["fr"], { type: "region" }).of(code)).join(", ")}. Délai annoncé en France : 2 à 3 jours après paiement confirmé.</p>}
          {invalidCart && catalog && <p className="shop-error" role="alert">Un article est indisponible ou sa quantité a changé. Ajuste ton panier avant de payer.</p>}
          <button type="button" className="shop-button shop-pay" onClick={checkout}
            disabled={busy || resolvingPayment || !catalog?.enabled || !cart.length || invalidCart || !!loadError}>
            <ShieldCheck size={19} aria-hidden="true" /> {busy ? "Ouverture du paiement…" : "Passer au paiement"}
          </button>
          {catalog?.enabled ? <p className="shop-muted">Paiement sécurisé par Stripe. Le prix et la variante sont vérifiés côté serveur avant d’ouvrir Stripe.</p>
            : <p className="shop-muted">Le produit est présenté en ligne. Le paiement reste verrouillé tant que la configuration serveur et les informations vendeur ne sont pas complètes.</p>}
          {checkoutError && <div role="alert"><p className="shop-error">{checkoutError}</p>
            <button type="button" className="shop-text-button" onClick={() => setReload(n => n + 1)}>Actualiser la collection</button></div>}
        </aside>
      </div>
      <nav className="shop-footer" aria-label="Informations de vente">
        {Object.entries(catalog?.links || {}).filter(([, url]) => url).map(([key, url]) => <a key={key} href={url} target="_blank" rel="noopener noreferrer">{LINK_NAMES[key]}</a>)}
      </nav>
    </section>
  );
}
