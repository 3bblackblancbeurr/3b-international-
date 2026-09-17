import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Phone,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "../loyalty/client.js";
import {
  countdownTo,
  formatParisDate,
  normalizePhoneDraft,
  phoneDigitCount,
  sortSlots,
} from "./secretUtils.js";
import "./secret.css";

const CAMPAIGN_SLUG = "telephone-secret-3b";
const DRAFT_KEY = "3b_secret_phone_draft_v1";

function readDraft() {
  try {
    return window.localStorage.getItem(DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

function saveDraft(value) {
  try {
    window.localStorage.setItem(DRAFT_KEY, value);
  } catch {
    // Le composeur continue de fonctionner même si le stockage local est bloqué.
  }
}

function twoDigits(value) {
  return String(value).padStart(2, "0");
}

function Countdown({ target, now }) {
  const parts = countdownTo(target, now);
  if (parts.done) return <span>Ouverture en cours…</span>;

  return (
    <span className="secret-countdown-digits" aria-label="Compte à rebours avant la prochaine transmission">
      {parts.days > 0 && <strong>{parts.days}j</strong>}
      <strong>{twoDigits(parts.hours)}h</strong>
      <strong>{twoDigits(parts.minutes)}m</strong>
      <strong>{twoDigits(parts.seconds)}s</strong>
    </span>
  );
}

export default function SecretPage() {
  const [campaign, setCampaign] = useState(null);
  const [slots, setSlots] = useState([]);
  const [clues, setClues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState(readDraft);

  const loadCampaign = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError("");

    try {
      const { data: campaignRow, error: campaignError } = await authClient
        .from("secret3b_campaigns")
        .select("id,slug,title,intro,status,prize_count")
        .eq("slug", CAMPAIGN_SLUG)
        .maybeSingle();

      if (campaignError) throw campaignError;

      if (!campaignRow) {
        setCampaign(null);
        setSlots([]);
        setClues([]);
        return;
      }

      const { data: slotRows, error: slotsError } = await authClient
        .from("secret3b_slots")
        .select("id,campaign_id,sequence_no,publish_at,label")
        .eq("campaign_id", campaignRow.id)
        .order("sequence_no", { ascending: true });

      if (slotsError) throw slotsError;

      const orderedSlots = sortSlots(slotRows || []);
      const ids = orderedSlots.map((slot) => slot.id);
      let clueRows = [];

      if (ids.length) {
        const { data, error: cluesError } = await authClient
          .from("secret3b_clues")
          .select("slot_id,kicker,title,body,number_tokens,footer")
          .in("slot_id", ids);

        if (cluesError) throw cluesError;
        clueRows = data || [];
      }

      setCampaign(campaignRow);
      setSlots(orderedSlots);
      setClues(clueRows);
    } catch (loadError) {
      console.error("Secret 3B feed unavailable", loadError);
      setError("Le canal Secret 3B est momentanément indisponible. Réessaie dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaign();
    const refresh = window.setInterval(() => loadCampaign({ quiet: true }), 60_000);
    return () => window.clearInterval(refresh);
  }, [loadCampaign]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const clueBySlot = useMemo(
    () => new Map(clues.map((clue) => [String(clue.slot_id), clue])),
    [clues]
  );

  const releasedCount = useMemo(
    () => slots.filter((slot) => clueBySlot.has(String(slot.id))).length,
    [slots, clueBySlot]
  );

  const nextSlot = useMemo(
    () => slots.find((slot) => !clueBySlot.has(String(slot.id))) || null,
    [slots, clueBySlot]
  );

  const allTransmissionsOpen = slots.length > 0 && releasedCount === slots.length;
  const digitCount = phoneDigitCount(draft);
  const callable = allTransmissionsOpen && digitCount >= 10 && digitCount <= 15;
  const dialValue = normalizePhoneDraft(draft);

  function onDraftChange(event) {
    const next = normalizePhoneDraft(event.target.value);
    setDraft(next);
    saveDraft(next);
  }

  function clearDraft() {
    setDraft("");
    saveDraft("");
  }

  return (
    <section className="secret3b-page" aria-labelledby="secret3b-title">
      <div className="secret3b-hero">
        <div className="secret3b-scanline" aria-hidden="true" />
        <div className="secret3b-hero-copy">
          <p className="eyebrow secret3b-eyebrow"><Radio size={15} /> CANAL INTERNE 3B</p>
          <h1 id="secret3b-title">{campaign?.title || "Secret 3B"}</h1>
          <p className="secret3b-intro">
            {campaign?.intro ||
              "Les transmissions seront publiées ici, exclusivement dans l’application 3B."}
          </p>
          <div className="secret3b-badges" aria-label="Règles du canal secret">
            <span><ShieldCheck size={15} /> Application uniquement</span>
            <span><Phone size={15} /> Numéro à reconstruire</span>
            <span><CheckCircle2 size={15} /> {campaign?.prize_count || 5} premiers gagnants</span>
          </div>
        </div>
        <div className="secret3b-lock" aria-hidden="true">
          <LockKeyhole size={46} />
          <span>3B</span>
        </div>
      </div>

      {loading && (
        <div className="secret3b-panel secret3b-loading" role="status">
          <Radio size={20} /> Connexion au canal secret…
        </div>
      )}

      {!loading && error && (
        <div className="secret3b-panel secret3b-error" role="alert">
          <p>{error}</p>
          <button type="button" className="quiet-button" onClick={() => loadCampaign()}>
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="secret3b-status-grid">
            <article className="secret3b-panel secret3b-progress-card">
              <p className="eyebrow">Progression</p>
              <strong>{releasedCount} / {slots.length || "—"}</strong>
              <span>transmissions ouvertes</span>
              <div className="secret3b-progress-track" aria-hidden="true">
                <span
                  style={{
                    width: slots.length ? `${Math.min(100, (releasedCount / slots.length) * 100)}%` : "0%",
                  }}
                />
              </div>
            </article>

            <article className="secret3b-panel secret3b-next-card">
              <p className="eyebrow"><Clock3 size={14} /> Prochaine ouverture</p>
              {nextSlot ? (
                <>
                  <strong>{nextSlot.label || `Transmission ${nextSlot.sequence_no}`}</strong>
                  <span>{formatParisDate(nextSlot.publish_at)}</span>
                  <Countdown target={nextSlot.publish_at} now={now} />
                </>
              ) : slots.length ? (
                <>
                  <strong>{allTransmissionsOpen ? "Toutes les transmissions sont ouvertes" : "Synchronisation…"}</strong>
                  <span>Le canal utilise l’heure serveur pour déverrouiller chaque énigme.</span>
                </>
              ) : (
                <>
                  <strong>Calendrier non armé</strong>
                  <span>Les dates apparaîtront ici quand elles seront programmées.</span>
                </>
              )}
            </article>
          </div>

          <div className="secret3b-transmissions" aria-label="Transmissions du Secret 3B">
            {slots.length === 0 && (
              <article className="secret3b-panel secret3b-empty">
                <LockKeyhole size={24} />
                <div>
                  <p className="eyebrow">SYSTÈME PRÊT</p>
                  <h2>Aucune énigme publiée pour l’instant</h2>
                  <p>
                    Le moteur est actif. Lorsqu’une date sera programmée, la transmission s’ouvrira automatiquement ici.
                  </p>
                </div>
              </article>
            )}

            {slots.map((slot) => {
              const clue = clueBySlot.get(String(slot.id));
              const isFuture = new Date(slot.publish_at).getTime() > now;

              if (!clue) {
                return (
                  <article className="secret3b-panel secret3b-transmission locked" key={slot.id}>
                    <div className="secret3b-transmission-index">{twoDigits(slot.sequence_no)}</div>
                    <div className="secret3b-transmission-body">
                      <p className="eyebrow"><LockKeyhole size={14} /> TRANSMISSION SCELLÉE</p>
                      <h2>{slot.label || `Transmission ${slot.sequence_no}`}</h2>
                      <p>{formatParisDate(slot.publish_at)}</p>
                      <span className="secret3b-seal">
                        {isFuture ? "Contenu protégé côté serveur" : "Ouverture en cours de synchronisation"}
                      </span>
                    </div>
                  </article>
                );
              }

              return (
                <article className="secret3b-panel secret3b-transmission open" key={slot.id}>
                  <div className="secret3b-transmission-index">{twoDigits(slot.sequence_no)}</div>
                  <div className="secret3b-transmission-body">
                    <p className="eyebrow"><Radio size={14} /> {clue.kicker || "SIGNAL 3B"}</p>
                    <h2>{clue.title}</h2>
                    <p className="secret3b-clue-text">{clue.body}</p>
                    {Array.isArray(clue.number_tokens) && clue.number_tokens.length > 0 && (
                      <div className="secret3b-number-tokens" aria-label="Nombres contenus dans l’énigme">
                        {clue.number_tokens.map((token, index) => (
                          <span key={`${slot.id}-${index}`}>{token}</span>
                        ))}
                      </div>
                    )}
                    {clue.footer && <p className="secret3b-footer">{clue.footer}</p>}
                  </div>
                </article>
              );
            })}
          </div>

          <article className="secret3b-panel secret3b-composer">
            <div>
              <p className="eyebrow">TON ASSEMBLAGE</p>
              <h2>Construis le numéro secret</h2>
              <p>
                Entre ici le numéro que tu déduis au fil des transmissions. Ce brouillon reste sur ton appareil et n’est pas envoyé au serveur.
              </p>
            </div>

            <div className="secret3b-composer-controls">
              <label htmlFor="secret3b-phone">Numéro assemblé</label>
              <div className="secret3b-input-row">
                <input
                  id="secret3b-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  spellCheck="false"
                  value={draft}
                  onChange={onDraftChange}
                  placeholder="Entre les chiffres trouvés"
                  aria-describedby="secret3b-phone-help"
                />
                <button type="button" className="quiet-button" onClick={clearDraft} disabled={!draft}>
                  Effacer
                </button>
              </div>
              <p id="secret3b-phone-help" className="secret3b-draft-meta">
                {digitCount ? `${digitCount} chiffre${digitCount > 1 ? "s" : ""} saisi${digitCount > 1 ? "s" : ""}.` : "Aucun chiffre saisi."}
              </p>

              {callable ? (
                <a className="secret3b-call-button" href={`tel:${dialValue}`}>
                  <Phone size={19} /> Appeler le numéro assemblé
                </a>
              ) : (
                <div className="secret3b-call-locked">
                  <LockKeyhole size={16} />
                  {allTransmissionsOpen
                    ? "Entre un numéro complet pour activer l’appel."
                    : "L’appel restera verrouillé jusqu’à la dernière transmission."}
                </div>
              )}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
