import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, LockKeyhole, Sparkles, X } from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import { NEXUS_DOORS, nexusProgress, commitNexusTravel } from "../lib/passport-nexus.js";
import "../styles/passport-nexus.css";
import "../styles/passport-nexus-validation.css";

const GLYPHS = "3B01011001HERITAGEBLACKBLANCBEUR∞";
const TUNNEL_GLYPHS = Array.from({ length: 28 }, (_, index) => ({
  char: GLYPHS[index % GLYPHS.length], angle: (index * 137.5) % 360,
  depth: 12 + (index * 17) % 82, delay: `${-((index * 0.17) % 2.7)}s`,
}));

export default function PassportNexus({ open, ...props }) {
  const account = useLoyalty();
  if (!open) return null;
  // Remount on account changes: a guest's keys must never leak into a member's UI.
  return <NexusSession key={account.user?.id || "guest"} uid={account.user?.id}
    accountLoading={account.loading} {...props} />;
}

function NexusSession({ uid, accountLoading, onClose, goTo, reducedMotion = false }) {
  const [phase, setPhase] = useState(reducedMotion ? "nexus" : "scan");
  const [world, setWorld] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Lecture de la progression du monde…");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const dialog = useRef(null), alive = useRef(false), busyRef = useRef(false);
  const operation = useRef(0), storeRef = useRef(null), leaving = useRef(false);
  const callbacks = useRef({ onClose, goTo });
  callbacks.current = { onClose, goTo };
  const progress = nexusProgress(world);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    alive.current = true;
    document.body.style.overflow = "hidden";
    element.showModal();
    element.querySelector(".passport-portal-close")?.focus({ preventScroll: true });
    return () => {
      alive.current = false;
      operation.current += 1;
      element.close();
      document.body.style.overflow = previousOverflow;
      if (!leaving.current && previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setPhase(value => value === "scan" || value === "tunnel" ? "nexus" : value);
      return undefined;
    }
    if (phase !== "scan" && phase !== "tunnel") return undefined;
    const timer = window.setTimeout(() => setPhase(phase === "scan" ? "tunnel" : "nexus"), phase === "scan" ? 620 : 2130);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    const element = dialog.current, focused = document.activeElement;
    if ((phase === "nexus" || phase === "origin") && (!focused || focused === document.body || !element.contains(focused))) {
      const heading = element.querySelector("h2");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }, [phase]);

  useEffect(() => {
    if (accountLoading) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const store = await import("../world/save.js");
        if (cancelled || !alive.current) return;
        storeRef.current = store;
        const result = await store.loadWorld(uid);
        if (cancelled || !alive.current) return;
        setWorld(result.data);
        setMessage(result.message);
      } catch (cause) {
        if (!cancelled && alive.current) setError(cause?.message || "La progression n’a pas pu être chargée.");
      } finally {
        if (!cancelled && alive.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, accountLoading, reload]);

  function close() {
    alive.current = false;
    operation.current += 1;
    callbacks.current.onClose?.();
  }

  function resumeWorld() {
    leaving.current = true;
    // The old, unconsumed, account-independent hint is no longer a destination.
    try { window.localStorage.removeItem("3b:nexus-country"); } catch { /* storage can be disabled */ }
    close();
    if (callbacks.current.goTo) callbacks.current.goTo("world3b");
    else window.location.hash = "monde-3b";
  }

  async function enterCountry(door) {
    if (busyRef.current || loading || accountLoading || !storeRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage(`Ouverture de la porte ${door.country}…`);
    const currentOperation = ++operation.current;
    const isActive = () => alive.current && operation.current === currentOperation;
    try {
      const result = await commitNexusTravel({ uid, region: door.region, store: storeRef.current, isActive });
      if (!result || !isActive()) return;
      setWorld(result.data);
      resumeWorld();
    } catch (cause) {
      if (isActive()) {
        setError(cause?.message || "Le passage n’a pas pu être confirmé.");
        setMessage("Ta progression n’est pas réinitialisée. Tu peux reprendre le monde ou réessayer.");
      }
    } finally {
      busyRef.current = false;
      if (isActive()) setBusy(false);
    }
  }

  function showOrigin() {
    // This is a narrative sanctuary, not a reward or a bypass of the final boss.
    if (!loading && !busyRef.current && progress.originUnlocked) setPhase("origin");
  }

  const content = (
    <dialog ref={dialog} className="passport-portal passport-portal-dialog" data-phase={phase}
      data-reduced-motion={reducedMotion} aria-label="Nexus du Passeport 3B"
      onCancel={event => { event.preventDefault(); close(); }}>
      <button type="button" className="passport-portal-close" onClick={close} aria-label="Fermer le Nexus 3B">
        <X size={22} aria-hidden="true" />
      </button>
      {(phase === "scan" || phase === "tunnel") && <button type="button" className="passport-portal-skip" onClick={() => setPhase("nexus")}>Passer le tunnel</button>}

      {phase === "scan" && <section className="passport-portal-scan" aria-live="polite">
        <div className="passport-scan-core" aria-hidden="true"><span>3B</span></div>
        <p className="eyebrow">OUVERTURE DU PASSEPORT</p>
        <h2>Ouverture du Cercle</h2>
        <p>Passage vers ton univers 3B…</p>
      </section>}

      {phase === "tunnel" && <section className="passport-tunnel" aria-label="Traversée du tunnel digital">
        <div className="passport-tunnel-vignette" aria-hidden="true" />
        <div className="passport-tunnel-rings" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--ring": index, "--ring-delay": `${index * -0.12}s` }} />)}
        </div>
        <div className="passport-tunnel-glyphs" aria-hidden="true">
          {TUNNEL_GLYPHS.map((glyph, index) => <b key={index} style={{ "--angle": `${glyph.angle}deg`, "--depth": `${glyph.depth}%`, "--glyph-delay": glyph.delay }}>{glyph.char}</b>)}
        </div>
        <div className="passport-tunnel-axis" aria-hidden="true"><span>3B</span></div>
        <div className="passport-tunnel-copy"><p>BLACK • BLANC • BEUR</p><strong>PASSAGE VERS LE NEXUS</strong></div>
      </section>}

      {phase === "nexus" && <section className="passport-nexus">
        <header className="passport-nexus-header">
          <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> PASSEPORT VIVANT</p>
          <h2>NEXUS 3B</h2>
          <p>Huit portes. Huit valeurs. Un Cercle à reconstruire.</p>
        </header>
        <div className="passport-nexus-feedback" aria-live="polite">
          <p>{loading ? "Lecture de la progression du monde…" : message}</p>
          {error && <p className="passport-nexus-error" role="alert">{error}</p>}
          {error && !busy && <button type="button" className="passport-world-cta" onClick={() => setReload(value => value + 1)}>Actualiser la progression</button>}
        </div>
        <div className="passport-nexus-layout" aria-busy={busy || loading}>
          <div className="passport-nexus-core" aria-label={loading ? "Lecture des clés" : `${progress.count} clés des gardiens sur 8`}>
            <div className="passport-broken-circle" aria-hidden="true">
              {NEXUS_DOORS.map((door, index) => <i key={door.code} data-collected={progress.keys.includes(door.region)} style={{ "--segment": index }} />)}
              <span>3B</span>
            </div>
            <p>{progress.originUnlocked ? "CERCLE RECONSTITUÉ" : "CERCLE BRISÉ"}</p>
            <strong className="passport-key-count">{loading ? "— / 8" : `${progress.count} / 8`} clés</strong>
            <small>Les clés correspondent aux sceaux des gardiens obtenus dans le Monde 3B. Une visite seule ne donne pas de clé.</small>
            <button type="button" className="passport-world-cta" disabled={busy || accountLoading} onClick={resumeWorld}>
              <Compass size={17} aria-hidden="true" /> Reprendre le Monde 3B
            </button>
          </div>
          <div className="passport-door-grid" aria-label="Les huit portes du Nexus">
            {NEXUS_DOORS.map(door => <button key={door.code} type="button" className="passport-nexus-door"
              data-nexus-country={door.region} disabled={loading || busy || accountLoading || !world}
              onClick={() => enterCountry(door)} aria-label={`Ouvrir la porte ${door.country} — ${door.value}`}>
              <span className="passport-door-number">{door.number}</span>
              <span className="passport-door-code">{door.code}</span>
              <strong>{door.country}</strong><small>{door.value}</small>
              <span className="passport-door-status">{loading ? "Lecture…" : progress.keys.includes(door.region) ? "Clé obtenue" : "Clé à retrouver"}</span>
              <i aria-hidden="true" />
            </button>)}
          </div>
        </div>
        <button type="button" className="passport-origin-door" disabled={loading || busy || !progress.originUnlocked}
          onClick={showOrigin} aria-label={progress.originUnlocked ? "Ouvrir la porte 3B Origine" : `Porte 3B Origine verrouillée — ${progress.count} clés sur 8`}>
          {progress.originUnlocked ? <Sparkles size={18} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}
          <span><strong>3B — ORIGINE</strong><small>{loading ? "Lecture des clés…" : progress.originUnlocked ? "Les huit clés sont réunies · entrer" : `Verrouillée · ${progress.count} / 8 clés`}</small></span><b>09</b>
        </button>
      </section>}

      {phase === "origin" && progress.originUnlocked && <section className="passport-nexus passport-origin-chamber">
        <header className="passport-nexus-header"><p className="eyebrow">LA NEUVIÈME PORTE</p><h2>3B — ORIGINE</h2><p>Huit valeurs réunies. Un héritage partagé.</p></header>
        <div className="passport-origin-mark" aria-hidden="true">3B</div>
        <p className="passport-origin-signature">BLACK • BLANC • BEUR</p>
        <blockquote>« Ce n’est pas une marque, c’est un héritage. »</blockquote>
        <p>Justice, loyauté, passion, noblesse, espoir, courage, foi et sagesse : chaque porte a apporté sa part au Cercle.</p>
        <p className="passport-origin-note">Sanctuaire narratif du passeport. L’aventure et ses combats continuent dans le Monde 3B ; ouvrir cette porte ne remplace pas la finale.</p>
        <div className="passport-origin-actions">
          <button type="button" className="passport-world-cta" onClick={() => setPhase("nexus")}>Revenir aux huit portes</button>
          <button type="button" className="passport-world-cta" onClick={resumeWorld}><Compass size={17} aria-hidden="true" /> Reprendre le Monde 3B</button>
        </div>
      </section>}
    </dialog>
  );
  // Native modal + body portal: focus stays inside, background becomes inert,
  // and card transforms/overflow cannot crop the full-screen tunnel.
  return createPortal(content, document.body);
}
