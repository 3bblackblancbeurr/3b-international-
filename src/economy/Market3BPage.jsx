import React, { useEffect, useMemo, useState } from "react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import { marketRequest } from "./client.js";
import "./market3b.css";

const RARITY_LABEL = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  mythic: "Mythique",
  unique: "Unique",
};

function coin(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function defaultSlot(item) {
  const type = item?.definition?.item_type;
  if (type === "passport_cosmetic") return "passport";
  if (["outfit", "skin", "effect", "vehicle", "animation", "accessory", "badge"].includes(type)) return type;
  return "effect";
}

function ItemIdentity({ item }) {
  const d = item?.definition || {};
  return (
    <div className="market3b-item-identity">
      <div className={`market3b-rarity rarity-${d.rarity || "common"}`}>
        {RARITY_LABEL[d.rarity] || d.rarity || "Objet 3B"}
      </div>
      <h3>{d.name || item?.item_code || "Objet 3B"}</h3>
      <p>{d.description || "Objet cosmétique permanent de l’univers 3B."}</p>
      <div className="market3b-serial">#{String(item?.serial_no || 0).padStart(4, "0")}</div>
    </div>
  );
}

export default function Market3BPage({ goTo }) {
  const account = useLoyalty();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [prices, setPrices] = useState({});
  const [handle, setHandle] = useState("");
  const [target, setTarget] = useState(null);
  const [offerItem, setOfferItem] = useState("");
  const [requestItem, setRequestItem] = useState("");

  async function refresh() {
    if (!account.user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await marketRequest("snapshot", {}, account.user.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [account.user?.id]);

  async function run(key, action, body = {}) {
    setBusy(key);
    setError("");
    try {
      const next = await marketRequest(action, body, account.user?.id);
      setData(next);
      if (account.refresh) await account.refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy("");
    }
  }

  async function searchMember(event) {
    event.preventDefault();
    setBusy("member-search");
    setError("");
    setTarget(null);
    setRequestItem("");
    try {
      setTarget(await marketRequest("member_items", { handle }, account.user?.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  const ownedTradeable = useMemo(
    () => (data?.items || []).filter(item => item.state === "owned" && item.definition?.tradeable),
    [data]
  );
  const currentPlan = data?.subscription?.current?.plan_code || "free";
  const currentPlanName = currentPlan === "premium3b" ? "Premium 3B" : currentPlan === "pass3b" ? "Pass 3B" : "Gratuit";

  if (!account.user) {
    return (
      <section className="page-section market3b-page">
        <header className="market3b-hero">
          <button className="ghost-button" type="button" onClick={() => goTo("home")}>← Retour</button>
          <p className="eyebrow">Collection permanente</p>
          <h1>Collection & Marché 3B</h1>
          <p>Connecte ton Passeport 3B pour posséder, équiper, échanger et revendre tes objets numériques.</p>
          <button className="primary-button" type="button" onClick={() => goTo("member")}>Connexion / inscription</button>
        </header>
      </section>
    );
  }

  return (
    <section className="page-section market3b-page">
      <header className="market3b-hero">
        <button className="ghost-button" type="button" onClick={() => goTo("home")}>← Retour</button>
        <div>
          <p className="eyebrow">Aucune saison · aucun reset</p>
          <h1>Collection & Marché 3B</h1>
          <p>Chaque exemplaire possède son numéro. Un objet acquis reste dans l’écosystème : tu peux le garder, l’équiper, l’échanger ou le revendre en Coins 3B.</p>
        </div>
      </header>

      <div className="market3b-rule-banner">
        <strong>Règle 3B :</strong> les Coins se gagnent dans l’application. Ils ne donnent pas de puissance de combat et ne sont pas retirables en euros.
      </div>

      {error && <div className="market3b-error" role="alert">{error}</div>}
      {loading && <div className="market3b-loading" role="status">Synchronisation de ta collection…</div>}

      {data && <>
        <div className="market3b-stats">
          <article><span>Coins 3B</span><strong>{coin(data.profile?.points)}</strong></article>
          <article><span>XP</span><strong>{coin(data.profile?.xp)}</strong></article>
          <article><span>Objets</span><strong>{data.items.length}</strong></article>
          <article><span>Accès</span><strong>{currentPlanName}</strong></article>
        </div>

        <section className="market3b-section">
          <div className="market3b-section-head">
            <div><p className="eyebrow">Récompenses</p><h2>Objets à gagner</h2></div>
            <p>Pas de coffre payant : les paliers sont connus à l’avance.</p>
          </div>
          <div className="market3b-grid market3b-rewards">
            {data.rewards.map(rule => {
              const unlocked = Number(data.profile.xp) >= Number(rule.xp_required);
              return <article className="market3b-card" key={rule.code}>
                <ItemIdentity item={{ item_code: rule.item_code, serial_no: 0, definition: rule.definition }} />
                <div className="market3b-card-footer">
                  <span>{coin(rule.xp_required)} XP</span>
                  <button type="button" className="secondary-button" disabled={!unlocked || rule.claimed || !!busy}
                    onClick={() => run(`claim-${rule.code}`, "claim", { rule: rule.code })}>
                    {rule.claimed ? "Déjà récupéré" : unlocked ? (busy === `claim-${rule.code}` ? "Récupération…" : "Récupérer") : "À débloquer"}
                  </button>
                </div>
              </article>;
            })}
          </div>
        </section>

        <section className="market3b-section">
          <div className="market3b-section-head">
            <div><p className="eyebrow">Inventaire</p><h2>Ma collection</h2></div>
            <p>Les numéros de série et l’historique de propriété restent attachés à chaque exemplaire.</p>
          </div>
          {data.items.length === 0 ? <p className="market3b-empty">Ta collection est vide. Débloque ton premier palier XP.</p> :
          <div className="market3b-grid">
            {data.items.map(item => <article className="market3b-card" key={item.id}>
              <ItemIdentity item={item} />
              <div className="market3b-tags">
                <span>{item.state === "owned" ? "Disponible" : item.state === "listed" ? "En vente" : item.state === "trade_locked" ? "Dans un échange" : "Archivé"}</span>
                {item.equipped_slot && <span>Équipé · {item.equipped_slot}</span>}
              </div>
              <div className="market3b-actions">
                {item.state === "owned" && <button type="button" className="secondary-button" disabled={!!busy}
                  onClick={() => run(`equip-${item.id}`, "equip", { item: item.id, slot: item.equipped_slot ? null : defaultSlot(item) })}>
                  {item.equipped_slot ? "Retirer" : "Équiper"}
                </button>}
                {item.state === "owned" && item.definition?.marketable && <div className="market3b-sell-row">
                  <input inputMode="numeric" min="1" max="10000000" placeholder="Prix Coins"
                    value={prices[item.id] || ""} onChange={e => setPrices(v => ({ ...v, [item.id]: e.target.value.replace(/\D/g, "").slice(0, 8) }))} />
                  <button type="button" className="primary-button" disabled={!Number(prices[item.id]) || !!busy}
                    onClick={() => run(`list-${item.id}`, "list", { item: item.id, price: Number(prices[item.id]) })}>
                    Mettre en vente
                  </button>
                </div>}
              </div>
            </article>)}
          </div>}
        </section>

        <section className="market3b-section">
          <div className="market3b-section-head">
            <div><p className="eyebrow">Revente</p><h2>Marché 3B</h2></div>
            <p>Prix fixés par les joueurs, paiement uniquement en Coins 3B gagnés dans l’écosystème.</p>
          </div>
          {data.listings.length === 0 ? <p className="market3b-empty">Aucune annonce active pour le moment.</p> :
          <div className="market3b-grid">
            {data.listings.map(listing => <article className="market3b-card" key={listing.id}>
              <ItemIdentity item={listing.item} />
              <p className="market3b-seller">Vendeur : @{listing.seller}</p>
              <div className="market3b-price">{coin(listing.priceCoins)} Coins 3B</div>
              {listing.isMine ?
                <button type="button" className="secondary-button" disabled={!!busy}
                  onClick={() => run(`cancel-${listing.id}`, "cancel_listing", { listing: listing.id })}>Retirer l’annonce</button> :
                <button type="button" className="primary-button" disabled={!!busy || Number(data.profile.points) < Number(listing.priceCoins)}
                  onClick={() => run(`buy-${listing.id}`, "buy", { listing: listing.id })}>
                  {Number(data.profile.points) < Number(listing.priceCoins) ? "Coins insuffisants" : "Acheter"}
                </button>}
            </article>)}
          </div>}
        </section>

        <section className="market3b-section">
          <div className="market3b-section-head">
            <div><p className="eyebrow">Échanges directs</p><h2>Objet contre objet</h2></div>
            <p>Le serveur verrouille les deux objets pendant l’offre pour empêcher la double vente.</p>
          </div>
          <form className="market3b-member-search" onSubmit={searchMember}>
            <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="Identifiant 3B du membre" maxLength={24} />
            <button type="submit" className="secondary-button" disabled={!handle.trim() || !!busy}>{busy === "member-search" ? "Recherche…" : "Voir sa collection"}</button>
          </form>
          {target && <div className="market3b-trade-builder">
            <div><strong>Ton objet</strong>
              <select value={offerItem} onChange={e => setOfferItem(e.target.value)}>
                <option value="">Choisir…</option>
                {ownedTradeable.map(item => <option value={item.id} key={item.id}>{item.definition?.name || item.item_code} #{item.serial_no}</option>)}
              </select>
            </div>
            <div><strong>Objet de @{target.member.handle}</strong>
              <select value={requestItem} onChange={e => setRequestItem(e.target.value)}>
                <option value="">Choisir…</option>
                {target.items.map(item => <option value={item.id} key={item.id}>{item.definition?.name || item.item_code} #{item.serial_no}</option>)}
              </select>
            </div>
            <button type="button" className="primary-button" disabled={!offerItem || !requestItem || !!busy}
              onClick={async () => {
                const ok = await run("trade-create", "trade_create", { handle: target.member.handle, offer: [offerItem], request: [requestItem] });
                if (ok) { setTarget(null); setOfferItem(""); setRequestItem(""); }
              }}>Proposer l’échange</button>
          </div>}

          <div className="market3b-trades">
            {(data.trades || []).map(trade => <article key={trade.id} className="market3b-trade-card">
              <div><strong>{trade.direction === "received" ? `Proposition de @${trade.proposer}` : `Proposition à @${trade.recipient}`}</strong><span>{trade.status}</span></div>
              <div className="market3b-trade-items">
                {trade.items.map(entry => <span key={`${trade.id}-${entry.item.id}`}>{entry.side === "offer" ? "Offre" : "Demande"} · {entry.item.definition?.name || entry.item.item_code} #{entry.item.serial_no}</span>)}
              </div>
              {trade.status === "pending" && <div className="market3b-actions">
                {trade.direction === "received" ? <>
                  <button className="primary-button" type="button" disabled={!!busy} onClick={() => run(`accept-${trade.id}`, "trade_accept", { trade: trade.id })}>Accepter</button>
                  <button className="secondary-button" type="button" disabled={!!busy} onClick={() => run(`decline-${trade.id}`, "trade_decline", { trade: trade.id })}>Refuser</button>
                </> : <button className="secondary-button" type="button" disabled={!!busy} onClick={() => run(`trade-cancel-${trade.id}`, "trade_cancel", { trade: trade.id })}>Annuler</button>}
              </div>}
            </article>)}
          </div>
        </section>
      </>}
    </section>
  );
}
