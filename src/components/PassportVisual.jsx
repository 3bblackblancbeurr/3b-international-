import { useEffect, useId, useRef, useState } from "react";
import { CreditCard, List, Pause, Play, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import PassportNexus from "./PassportNexus.jsx";
import PublicIdentityBadge from "./PublicIdentityBadge.jsx";
import { PassportPortrait } from "../passport/PassportAppearance.jsx";

const STREAMS = Array.from({ length: 58 }, (_, column) => ({
  left: `${(column + 0.25) * 100 / 58}%`,
  delay: `${-(column * 1.73 % 12)}s`,
  duration: `${5.5 + column * 3.7 % 7}s`,
  opacity: 0.42 + (column % 5) * 0.12,
  digits: Array.from({ length: 38 }, (_, row) => (column * 13 + row * 7 + row * row) % 3 === 0 ? "1" : "0").join(""),
}));

const CIRCUITS = [
  "M505 535H725L779 481H828L866 443H966L1000 409H1030",
  "M507 523H714L761 476H810L860 426H950L993 383H1029",
  "M694 505H737L784 458H845L879 424H968L1006 386H1026",
  "M690 490H727L775 442H829L861 410H949L978 381H1021",
  "M668 477H720L757 440H804L841 403H887L914 376H1019",
  "M723 356H778L817 317H878L904 291H993L1024 260",
  "M503 250H540L571 219H615L642 246H744",
  "M850 546H1003L1031 518H1265L1287 496V416",
  "M605 108H850L874 132H1010L1038 104H1191",
];

const formatNumber = value => new Intl.NumberFormat("fr-FR").format(Number(value) || 0);

export default function PassportVisual({ options, identity, goTo, syncing = false }) {
  const id = useId().replaceAll(":", "");
  const visual = useRef(null);
  const [paused, setPaused] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 720px)").matches);
  const [viewChoice, setViewChoice] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const view = viewChoice || (phone ? "details" : "card");
  useEffect(() => {
    const screen = window.matchMedia("(max-width: 720px)");
    const update = () => setPhone(screen.matches);
    update();
    screen.addEventListener("change", update);
    return () => screen.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => { setPortalOpen(false); }, [identity?.userId]);
  useEffect(() => {
    let inViewport = true;
    const update = () => setVisible(inViewport && !document.hidden);
    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => { inViewport = entry.isIntersecting; update(); })
      : null;
    if (visual.current) observer?.observe(visual.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const motionAllowed = options.animations && !options.reducedMotion && !systemReducedMotion;
  const animated = motionAllowed && !paused && visible && !portalOpen;
  const active = !!identity?.userId;
  const status = syncing ? "SYNCHRONISATION" : active ? "IDENTITÉ VÉRIFIÉE" : "À ACTIVER";
  const openPassport = () => active ? setPortalOpen(true) : goTo?.("member");
  const selectView = nextView => { setViewChoice(nextView); setZoomed(false); };

  return <div ref={visual} className="passport-visual" data-view={view} data-animated={animated} data-matrix={options.matrix} data-active={active}>
    <div className="passport-view-switch" role="group" aria-label="Présentation du Passeport">
      <button type="button" aria-pressed={view === "card"} onClick={() => selectView("card")}><CreditCard size={18} aria-hidden="true"/>Carte</button>
      <button type="button" aria-pressed={view === "details"} onClick={() => selectView("details")}><List size={18} aria-hidden="true"/>Détails</button>
    </div>
    <p className="passport-view-caption">{view === "card" ? "Ton Passeport, dans son format original." : "Ton identité et ta progression, en un coup d’œil."}</p>

    {view === "card" && <div className="passport-horizontal-view">
    <div className="passport-card-tools">
      <span>Format original · signature 3B</span>
      <button type="button" className="passport-card-zoom" onClick={() => setZoomed(value => !value)} aria-pressed={zoomed} aria-controls={`${id}-card-viewport`}>
        {zoomed ? <ZoomOut size={17} aria-hidden="true"/> : <ZoomIn size={17} aria-hidden="true"/>}{zoomed ? "Ajuster" : "Agrandir"}
      </button>
    </div>
    <div id={`${id}-card-viewport`} className="passport-card-viewport" data-zoomed={zoomed} tabIndex={zoomed ? 0 : undefined} role={zoomed ? "region" : undefined} aria-label={zoomed ? "Carte agrandie, défilement horizontal" : undefined}>
    <div className="passport-card-stage passport-card-desktop">
      <div className="passport-card-base" aria-hidden="true">
        <span className="passport-card-halo passport-card-halo-blue" />
        <span className="passport-card-halo passport-card-halo-gold" />
        <span className="passport-card-line" />
      </div>

      <div className="passport-matrix-rain" aria-hidden="true">
        {STREAMS.map((stream, index) => <span key={index} className="passport-matrix-stream" style={{ left: stream.left, "--fall-delay": stream.delay, "--fall-duration": stream.duration, "--stream-opacity": stream.opacity }}>{stream.digits}<b>1</b></span>)}
      </div>
      <div className="passport-digital-grid" aria-hidden="true" />
      <div className="passport-blue-sweep" aria-hidden="true" />

      <svg className="passport-circuits" viewBox="465 75 848 502" aria-hidden="true" focusable="false">
        <defs><filter id={`${id}-electric`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.8" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {CIRCUITS.map((path, index) => <g key={path}>
            <path className="passport-circuit-track" d={path} />
            <path className="passport-circuit-pulse" d={path} pathLength="100" filter={`url(#${id}-electric)`} style={{ animationDelay: `${-index * 1.2}s`, animationDuration: `${5 + index % 4}s` }} />
          </g>)}
          <rect className="passport-circuit-perimeter" x="478" y="87" width="820" height="478" rx="34" pathLength="100" filter={`url(#${id}-electric)`} />
          <rect className="passport-chip-signal" x="517" y="102" width="75" height="60" rx="10" />
        </g>
      </svg>

      <section className="passport-identity-layer" aria-label={active ? `Passeport 3B de ${identity.name}` : "Passeport 3B non activé"}>
        <header className="passport-card-brand">
          <div className="passport-3b-mark">3B</div>
          <div><strong>INTERNATIONAL</strong><span>PASSEPORT DIGITAL</span></div>
          <small>{status}</small>
        </header>

        <div className="passport-holder-block">
          <span className="passport-data-label">TITULAIRE</span>
          <h2>{syncing ? "Chargement du profil…" : active ? identity.name : "TON IDENTITÉ 3B"}</h2>
          <p>{active && identity.handle ? `@${identity.handle}` : active ? "Membre 3B" : "Crée ton compte pour personnaliser ce passeport."}</p>
          {active && <PublicIdentityBadge profile={identity} compact className="passport-official-badge"/>}
        </div>

        <div className="passport-country-block">
          <span className="passport-country-flag" aria-hidden="true">{active ? identity.flag : "3B"}</span>
          <div>
            <span className="passport-data-label">PAYS D’ORIGINE</span>
            <strong>{active ? identity.country : "NON DÉFINI"}</strong>
            <small>{active ? `${identity.countryCode} · ${identity.value}` : "8 pays · 8 portes · 8 valeurs"}</small>
          </div>
        </div>

        <div className="passport-avatar-panel">
          <PassportPortrait identity={active ? identity : null} animated={animated}/>
          <span className="passport-avatar-country" aria-hidden="true">{active ? identity.countryCode : "ID"}</span>
        </div>

        <div className="passport-id-block">
          <span className="passport-data-label">IDENTIFIANT PASSEPORT</span>
          <code>{active ? identity.passportId : "3B-PASS-À-ACTIVER"}</code>
        </div>

        <div className="passport-progress-strip">
          <span><small>XP 3B</small><b>{active ? formatNumber(identity.xp) : "0"}</b></span>
          <span><small>FIDÉLITÉ</small><b>{active ? formatNumber(identity.points) : "0"}</b></span>
          <span><small>STATUT</small><b>{active ? "ACTIF" : "INVITÉ"}</b></span>
        </div>
      </section>

      <div className="passport-security-edge" aria-hidden="true" />
      <div className="passport-live-badge" aria-hidden="true"><Sparkles size={12} /> {active ? "PASSEPORT VIVANT" : "IDENTITÉ PERSONNELLE"}</div>
      <button type="button" className="passport-portal-trigger" onClick={openPassport} aria-label={active ? "Ouvrir ma Ville 3B" : "Créer mon identité 3B"}>
        <span className="passport-portal-orbit" aria-hidden="true"><i /><i /><i /></span>
        <b>3B</b>
        <small>{active ? "MA VILLE" : "ACTIVER"}</small>
      </button>
    </div>
    </div>
    <p className="passport-card-zoom-hint">{zoomed ? "Fais glisser la carte pour voir tous ses détails." : "Agrandis la carte pour lire ses détails, puis fais-la glisser."}</p>
    <button type="button" className="passport-phone-entry passport-card-entry" onClick={openPassport}><Sparkles size={16} aria-hidden="true"/>{active ? "Entrer dans ma Ville 3B" : "Activer mon Passeport"}</button>
    </div>}

    {view === "details" && <section className="passport-phone-card" aria-label={active ? `Détails du Passeport 3B de ${identity.name}` : "Détails du Passeport 3B non activé"}>
      <div className="passport-phone-matrix" aria-hidden="true"/>
      {options.matrix && <div className="passport-phone-rain" aria-hidden="true">
        {STREAMS.filter((_, index) => index % (phone ? 4 : 2) === 0).map((stream, index) => <span key={index} className="passport-matrix-stream" style={{ left: stream.left, "--fall-delay": stream.delay, "--fall-duration": stream.duration, "--stream-opacity": stream.opacity }}>{stream.digits}<b>1</b></span>)}
      </div>}
      <header className="passport-phone-brand">
        <div className="passport-phone-logo">3B</div>
        <div><strong>INTERNATIONAL</strong><span>PASSEPORT DIGITAL</span></div>
        <small>{syncing ? "SYNCHRO" : active ? "ACTIF" : "À ACTIVER"}</small>
      </header>
      <div className="passport-phone-identity">
        <div className="passport-phone-portrait"><PassportPortrait identity={active ? identity : null} animated={animated}/></div>
        <div className="passport-phone-person">
          <span className="passport-data-label">TITULAIRE</span>
          <h2>{syncing ? "Synchronisation…" : active ? identity.name : "TON IDENTITÉ 3B"}</h2>
          <p>{active && identity.handle ? `@${identity.handle}` : "Passeport personnel"}</p>
          {active && <PublicIdentityBadge profile={identity} className="passport-phone-official"/>}
        </div>
      </div>
      <div className="passport-phone-origin">
        <span className="passport-country-flag" aria-hidden="true">{active ? identity.flag : "3B"}</span>
        <div><small>PAYS D’ORIGINE</small><strong>{active ? identity.country : "NON DÉFINI"}</strong><span>{active ? `${identity.countryCode} · ${identity.value}` : "8 pays · 8 valeurs"}</span></div>
      </div>
      <div className="passport-phone-stats">
        <span><small>XP 3B</small><b>{active ? formatNumber(identity.xp) : "0"}</b></span>
        <span><small>FIDÉLITÉ</small><b>{active ? formatNumber(identity.points) : "0"}</b></span>
        <span><small>STATUT</small><b>{active ? "ACTIF" : "INVITÉ"}</b></span>
      </div>
      <div className="passport-phone-id"><small>IDENTIFIANT PASSEPORT</small><code>{active ? identity.passportId : "3B-PASS-À-ACTIVER"}</code></div>
      <button type="button" className="passport-phone-entry" onClick={openPassport}><Sparkles size={16}/>{active ? "Entrer dans ma Ville 3B" : "Activer mon Passeport"}</button>
    </section>}

    <div className="passport-animation-toolbar">
      <span><i className={animated ? "digital-status is-live" : "digital-status"} aria-hidden="true" />{syncing ? "Synchronisation de ton identité…" : animated ? "Carte digitale animée" : "Carte en mode calme"}</span>
      <button type="button" className="passport-animation-toggle" disabled={!motionAllowed} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        {animated ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        {motionAllowed ? (paused ? "Reprendre l’animation" : "Mettre en pause") : "Mouvements réduits"}
      </button>
    </div>

    <div className="passport-entry-hint">
      <Sparkles size={15} aria-hidden="true" />
      <span>{active ? <>Ce passeport appartient à <strong>{identity.name}</strong>. Son identité suit le compte dans tout l’écosystème 3B.</> : "Active ton compte pour générer ton passeport personnel."}</span>
    </div>

    {active && <PassportNexus key={identity.userId} open={portalOpen} onClose={() => setPortalOpen(false)} goTo={goTo} reducedMotion={!motionAllowed} />}
  </div>;
}
