import { useEffect, useMemo, useState } from "react";
import { Compass, LockKeyhole, Sparkles, X } from "lucide-react";
import "../styles/passport-nexus.css";

const DOORS = [
  { code: "FR", country: "France", value: "Justice", number: "01" },
  { code: "DZ", country: "Algérie", value: "Loyauté", number: "02" },
  { code: "ES", country: "Espagne", value: "Passion", number: "03" },
  { code: "MA", country: "Maroc", value: "Noblesse", number: "04" },
  { code: "IT", country: "Italie", value: "Espoir", number: "05" },
  { code: "TN", country: "Tunisie", value: "Courage", number: "06" },
  { code: "TR", country: "Turquie", value: "Foi", number: "07" },
  { code: "EE", country: "Estonie", value: "Sagesse", number: "08" },
];

const GLYPHS = "3B01011001HERITAGEBLACKBLANCBEUR∞";

export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const [phase, setPhase] = useState("idle");
  const tunnelGlyphs = useMemo(
    () => Array.from({ length: 42 }, (_, index) => ({
      char: GLYPHS[index % GLYPHS.length],
      angle: (index * 137.5) % 360,
      depth: 12 + (index * 17) % 82,
      delay: `${-((index * 0.17) % 2.7)}s`,
    })),
    [],
  );

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      return undefined;
    }

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setPhase("scan");

    const tunnelDelay = reducedMotion ? 80 : 620;
    const nexusDelay = reducedMotion ? 180 : 2750;
    const tunnelTimer = window.setTimeout(() => setPhase("tunnel"), tunnelDelay);
    const nexusTimer = window.setTimeout(() => setPhase("nexus"), nexusDelay);

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(tunnelTimer);
      window.clearTimeout(nexusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, onClose, reducedMotion]);

  if (!open) return null;

  function openWorld(code) {
    if (code) {
      try { window.localStorage.setItem("3b:nexus-country", code); } catch { /* private mode */ }
    }
    onClose();
    if (goTo) {
      goTo("world3b");
    } else {
      window.location.hash = "monde-3b";
    }
  }

  return (
    <div className="passport-portal" data-phase={phase} role="dialog" aria-modal="true" aria-label="Nexus du Passeport 3B">
      <button type="button" className="passport-portal-close" onClick={onClose} aria-label="Fermer le Nexus 3B">
        <X size={22} />
      </button>

      {phase === "scan" && (
        <section className="passport-portal-scan" aria-live="polite">
          <div className="passport-scan-core" aria-hidden="true"><span>3B</span></div>
          <p className="eyebrow">IDENTITÉ 3B DÉTECTÉE</p>
          <h2>Ouverture du Cercle</h2>
          <p>Synchronisation du passeport digital…</p>
        </section>
      )}

      {phase === "tunnel" && (
        <section className="passport-tunnel" aria-label="Traversée du tunnel digital">
          <div className="passport-tunnel-vignette" aria-hidden="true" />
          <div className="passport-tunnel-rings" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <i key={index} style={{ "--ring": index, "--ring-delay": `${index * -0.12}s` }} />
            ))}
          </div>
          <div className="passport-tunnel-glyphs" aria-hidden="true">
            {tunnelGlyphs.map((glyph, index) => (
              <b key={index} style={{ "--angle": `${glyph.angle}deg`, "--depth": `${glyph.depth}%`, "--glyph-delay": glyph.delay }}>{glyph.char}</b>
            ))}
          </div>
          <div className="passport-tunnel-axis" aria-hidden="true"><span>3B</span></div>
          <div className="passport-tunnel-copy">
            <p>BLACK • BLANC • BEUR</p>
            <strong>PASSAGE VERS LE NEXUS</strong>
          </div>
        </section>
      )}

      {phase === "nexus" && (
        <section className="passport-nexus">
          <header className="passport-nexus-header">
            <p className="eyebrow"><Sparkles size={14} /> PASSEPORT VIVANT</p>
            <h2>NEXUS 3B</h2>
            <p>Huit portes. Huit valeurs. Un Cercle à reconstruire.</p>
          </header>

          <div className="passport-nexus-layout">
            <div className="passport-nexus-core" aria-label="Cercle Brisé 3B">
              <div className="passport-broken-circle" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ "--segment": index }} />)}
                <span>3B</span>
              </div>
              <p>CERCLE BRISÉ</p>
              <small>Les fragments se synchronisent avec ta progression.</small>
              <button type="button" className="passport-world-cta" onClick={() => openWorld()}>
                <Compass size={17} /> Explorer le Monde 3B
              </button>
            </div>

            <div className="passport-door-grid" aria-label="Les huit portes du Nexus">
              {DOORS.map((door) => (
                <button key={door.code} type="button" className="passport-nexus-door" onClick={() => openWorld(door.code)}>
                  <span className="passport-door-number">{door.number}</span>
                  <span className="passport-door-code">{door.code}</span>
                  <strong>{door.country}</strong>
                  <small>{door.value}</small>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="passport-origin-door" disabled aria-label="Porte 3B Origine verrouillée">
            <LockKeyhole size={18} />
            <span><strong>3B — ORIGINE</strong><small>Verrouillée · réunis les huit clés</small></span>
            <b>09</b>
          </button>
        </section>
      )}
    </div>
  );
}
