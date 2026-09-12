import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Compass, LockKeyhole, Sparkles, X } from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import { NEXUS_DOORS, nexusProgress, enterNexusWorld, startNexusSequence } from "../passport/nexus-flow.js";
import { mountNexusDialog } from "../passport/nexus-dialog.js";
import "../styles/passport-nexus.css";
import "../styles/passport-nexus-accessibility.css";

const GLYPHS = "3B01011001HERITAGEBLACKBLANCBEUR∞";
// Keep the world engine out of the initial passport rendering path.
const worldAPI = async () => {
  const [save, engine] = await Promise.all([import("../world/save.js"), import("../world/engine.js")]);
  return { ...save, applyWorldAction: engine.applyWorldAction };
};

export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const account = useLoyalty();
  const uid = account.user?.id || null;
  const [phase, setPhase] = useState("scan");
  const [world, setWorld] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const dialog = useRef(null), sequence = useRef(null), version = useRef(0), inFlight = useRef(false);
  const current = useRef({ open, uid, loading: account.loading, onClose, goTo });
  current.current = { open, uid, loading: account.loading, onClose, goTo };
  const calm = reducedMotion || systemReduced;
  const calmRef = useRef(calm); calmRef.current = calm;
  const tunnelGlyphs = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    char: GLYPHS[index % GLYPHS.length], angle: (index * 137.5) % 360,
    depth: 12 + (index * 17) % 82, delay: `${-((index * 0.17) % 2.7)}s`,
  })), []);

  function close() {
    version.current += 1; inFlight.current = false;
    sequence.current?.dispose();
    current.current.onClose?.();
  }

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    const update = () => setSystemReduced(media.matches);
    update(); media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useLayoutEffect(() => {
    if (!open || !dialog.current) return undefined;
    const release = mountNexusDialog(dialog.current, close);
    const mediaReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    sequence.current = startNexusSequence(setPhase, calmRef.current || mediaReduced);
    return () => {
      version.current += 1; inFlight.current = false;
      sequence.current?.dispose(); release();
    };
    // Callbacks are read through current: parent rerenders must not restart the tunnel.
  }, [open]);

  useEffect(() => { if (open && calm) sequence.current?.skip(); }, [open, calm]);
  useLayoutEffect(() => {
    if (open && phase === "nexus" && dialog.current && !dialog.current.contains(document.activeElement)) {
      dialog.current.querySelector("button")?.focus({ preventScroll: true });
    }
  }, [open, phase]);

  useEffect(() => {
    const ticket = ++version.current;
    inFlight.current = false; setBusy(false); setWorld(null); setError(""); setSaveMessage("");
    if (!open || account.loading) return undefined;
    let cancelled = false;
    worldAPI().then(api => api.loadWorld(uid)).then(result => {
      if (cancelled || ticket !== version.current) return;
      setWorld(result.data); setSaveMessage(result.message);
    }).catch(() => {
      if (!cancelled && ticket === version.current) setError("La progression n’a pas pu être chargée. Tu peux reprendre le Monde 3B puis réouvrir le passeport.");
    });
    return () => { cancelled = true; version.current += 1; };
  }, [open, uid, account.loading]);

  async function openWorld(destination) {
    if (inFlight.current || current.current.loading) return;
    const ticket = version.current, owner = current.current.uid;
    const valid = () => ticket === version.current && current.current.open &&
      !current.current.loading && owner === current.current.uid;
    inFlight.current = true; setBusy(true); setError("");
    try {
      if (destination != null) {
        const api = await worldAPI();
        if (!valid()) return;
        const result = await enterNexusWorld(api, owner, destination, valid);
        if (!result || !valid()) return;
      }
      if (!valid()) return;
      const navigate = current.current.goTo;
      close();
      if (navigate) navigate("world3b");
      else window.location.hash = "world3b";
    } catch (failure) {
      if (valid()) setError(failure instanceof Error ? failure.message : "Ce passage n’a pas pu être ouvert. Réessaie depuis le Monde 3B.");
    } finally {
      if (valid()) { inFlight.current = false; setBusy(false); }
    }
  }

  if (!open || typeof document === "undefined") return null;
  const progress = nexusProgress(world);
  const resumeOrigin = !!world?.adventure?.encounter?.final && !progress.finished;
  const originEnabled = !!world && (progress.originReady || resumeOrigin);
  const doors = world ? progress.doors : NEXUS_DOORS;

  return createPortal(
    <dialog ref={dialog} className="passport-portal" data-phase={phase} data-reduced-motion={calm}
      aria-label="Nexus du Passeport 3B" aria-modal="true" tabIndex={-1}>
      <button type="button" className="passport-portal-close" onClick={close} aria-label="Fermer le Nexus 3B"><X size={22} /></button>
      {phase !== "nexus" && <button type="button" className="passport-portal-skip" onClick={() => sequence.current?.skip()}>Passer le tunnel</button>}

      {phase === "scan" && <section className="passport-portal-scan" aria-live="polite">
        <div className="passport-scan-core" aria-hidden="true"><span>3B</span></div>
        <p className="eyebrow">IDENTITÉ 3B DÉTECTÉE</p><h2>Ouverture du Cercle</h2><p>Synchronisation du passeport digital…</p>
      </section>}

      {phase === "tunnel" && <section className="passport-tunnel" aria-label="Traversée du tunnel digital">
        <div className="passport-tunnel-vignette" aria-hidden="true" />
        <div className="passport-tunnel-rings" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--ring": index, "--ring-delay": `${index * -0.12}s` }} />)}</div>
        <div className="passport-tunnel-glyphs" aria-hidden="true">{tunnelGlyphs.map((glyph, index) => <b key={index} style={{ "--angle": `${glyph.angle}deg`, "--depth": `${glyph.depth}%`, "--glyph-delay": glyph.delay }}>{glyph.char}</b>)}</div>
        <div className="passport-tunnel-axis" aria-hidden="true"><span>3B</span></div>
        <div className="passport-tunnel-copy"><p>BLACK • BLANC • BEUR</p><strong>PASSAGE VERS LE NEXUS</strong></div>
      </section>}

      {phase === "nexus" && <section className="passport-nexus">
        <header className="passport-nexus-header"><p className="eyebrow"><Sparkles size={14} /> PASSEPORT VIVANT</p><h2>NEXUS 3B</h2><p>Huit portes. Huit valeurs. Un Cercle à reconstruire.</p></header>
        <p className="passport-nexus-progress" role="status">{world ? `${progress.sealCount} / 8 sceaux retrouvés · ${progress.restoredCount} / 8 pays reconstruits` : "Chargement de ta progression…"}</p>
        <div className="passport-nexus-layout">
          <div className="passport-nexus-core" aria-label="Cercle Brisé 3B">
            <div className="passport-broken-circle" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--segment": index }} />)}<span>3B</span></div>
            <p>CERCLE BRISÉ</p><small>Les sceaux et les reconstructions viennent de ta sauvegarde du Monde 3B.</small>
            <button type="button" className="passport-world-cta" disabled={busy || account.loading} onClick={() => openWorld()}><Compass size={17} /> {world?.adventure?.encounter ? "Reprendre ma rencontre" : "Explorer le Monde 3B"}</button>
          </div>
          <div className="passport-door-grid" aria-label="Les huit portes du Nexus">
            {doors.map(door => <button key={door.code} type="button" className="passport-nexus-door" data-sealed={!!door.sealed}
              disabled={!world || busy || account.loading} onClick={() => openWorld(door.code)}>
              <span className="passport-door-number">{door.number}</span><span className="passport-door-code">{door.code}</span><strong>{door.country}</strong><small>{door.value}</small>
              {world && <span className="passport-door-progress">{door.restored ? "Pays reconstruit" : door.sealed ? "Sceau retrouvé" : "Sceau à retrouver"}</span>}<i aria-hidden="true" />
            </button>)}
          </div>
        </div>
        <button type="button" className="passport-origin-door" disabled={!originEnabled || busy || account.loading} onClick={() => openWorld("ORIGINE")}>
          {originEnabled ? <Sparkles size={18} /> : <LockKeyhole size={18} />}
          <span><strong>3B — ORIGINE</strong><small>{progress.finished ? "L’Union est retrouvée" : resumeOrigin ? "Reprendre le défi de l’Union" : originEnabled ? "Ouvrir le défi de l’Union" : "Huit sceaux + huit pays reconstruits requis"}</small></span><b>09</b>
        </button>
        {busy && <p className="passport-nexus-message" role="status">Préparation du passage…</p>}
        {error && <p className="passport-nexus-message" role="alert">{error}</p>}
        {saveMessage && <p className="passport-nexus-message">{saveMessage}</p>}
      </section>}
    </dialog>, document.body,
  );
}
