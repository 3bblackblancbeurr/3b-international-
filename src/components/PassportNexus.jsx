import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUpRight, ChevronRight, LockKeyhole, Pause, Play, ScanLine, SkipForward } from 'lucide-react';
import { NEXUS_WORLDS, resolveNexusWorld, rememberNexusCountry } from './nexus-worlds.js';
import { queueNexusVisit } from './nexus-handoff.js';
import '../styles/passport-nexus.css';
import './passport-nexus-premium.css';

export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const [phase, setPhase] = useState('scan');
  const [selected, setSelected] = useState(null);
  const [paused, setPaused] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const dialog = useRef(null), host = useRef(null), scene = useRef(null), timers = useRef([]), nav = useRef(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const calm = reducedMotion || systemReduced;
  const renderState = useRef({}); renderState.current = { phase, selected, reducedMotion: calm, paused, quality };
  const world = resolveNexusWorld(selected), origin = selected === 'ORIGIN';

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(mq.matches); update();
    mq.addEventListener('change', update); return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const element = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!element.open) element.showModal();
    element.querySelector('[data-nx-close]')?.focus({ preventScroll: true });
    return () => {
      timers.current.forEach(clearTimeout); timers.current = [];
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    setSelected(null); setPaused(false); setPhase(calm ? 'nexus' : 'scan');
    timers.current.forEach(clearTimeout); timers.current = [];
    if (!calm) {
      timers.current.push(setTimeout(() => setPhase('tunnel'), 650));
      timers.current.push(setTimeout(() => setPhase('nexus'), 3300));
    }
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [open, calm]);
  useEffect(() => {
    if (!open) return undefined;
    let live = true, engine = null;
    setReady(false); setUnavailable(false);
    const fallbackTimer = setTimeout(() => { if (live && !engine) setUnavailable(true); }, 12000);
    import('./nexus-scene.js').then(({ createNexusScene }) => {
      if (!live || !host.current) return;
      engine = createNexusScene(host.current, {
        onSelect: code => { if (live && resolveNexusWorld(code)) setSelected(code); },
        onReady: () => { if (live) { setReady(true); setUnavailable(false); } },
        onFailure: () => { if (live) { setUnavailable(true); setReady(false); } },
        onQuality: value => { if (live) setQuality(value); },
      });
      scene.current = engine; engine.update(renderState.current); clearTimeout(fallbackTimer);
    }).catch(() => { if (live) setUnavailable(true); });
    return () => { live = false; clearTimeout(fallbackTimer); engine?.dispose(); scene.current = null; };
  }, [open]);
  useEffect(() => { scene.current?.update(renderState.current); }, [phase, selected, calm, paused, quality]);

  function skip() { timers.current.forEach(clearTimeout); timers.current = []; setPhase('nexus'); }
  function close() { closeRef.current?.(); }
  function enter() {
    if (!world) return;
    // A one-shot intent only; the authoritative world engine validates travel.
    try { rememberNexusCountry(window.localStorage, world.code); } catch { /* Private browsing. */ }
    try { queueNexusVisit(window.sessionStorage, world.code); } catch { /* Last world position remains available. */ }
    close();
    if (goTo) goTo('world3b'); else window.location.hash = 'monde-3b';
  }
  function navigateCountries(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...nav.current.querySelectorAll('button')], current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 7 : (current + (event.key === 'ArrowRight' ? 1 : 7)) % 8;
    setSelected(NEXUS_WORLDS[next].code); buttons[next].focus({ preventScroll: true });
  }
  if (!open) return null;
  return createPortal(
    <dialog ref={dialog} className={`nx-shell${calm ? ' nx-reduced' : ''}`} data-phase={phase} data-paused={paused} data-nexus-ready={ready || unavailable} aria-label="Nexus du Passeport 3B" onCancel={event => { event.preventDefault(); close(); }}>
      <div ref={host} className="nx-stage" aria-hidden="true" />
      {unavailable && <div className="nx-fallback" aria-hidden="true">
        {NEXUS_WORLDS.map(item => <div key={item.code} className="nx-fallback-door" style={{ '--gate-color': item.color }}><span>{item.number}</span></div>)}
      </div>}
      <div className="nx-shade" />
      <header className="nx-topbar">
        <button type="button" className="nx-back" onClick={close} data-nx-close aria-label="Fermer le Nexus 3B"><ArrowLeft size={16} aria-hidden="true" /><span>Passeport</span></button>
        <div className="nx-wordmark" aria-hidden="true"><b>3B</b><i /><span>BLACK · BLANC · BEUR</span></div>
        <div className="nx-controls">
          {phase === 'nexus' && <button type="button" className="nx-control" disabled={calm} onClick={() => setPaused(value => !value)} aria-pressed={paused || calm} aria-label={paused ? 'Reprendre les animations' : 'Mettre les animations en pause'}>{paused || calm ? <Play size={15} /> : <Pause size={15} />}<span className="nx-control-label">{calm ? 'Calme' : paused ? 'Reprendre' : 'Pause'}</span></button>}
          <button type="button" className="nx-control" onClick={() => setQuality(value => value === 'auto' ? 'light' : 'auto')} aria-pressed={quality === 'light'} aria-label="Activer ou désactiver le rendu allégé"><ScanLine size={15} aria-hidden="true" /><span>{quality === 'light' ? 'Allégé' : 'Auto'}</span></button>
        </div>
      </header>
      <div className="nx-status" role="status">{unavailable ? 'Affichage de secours · navigation disponible' : !ready ? 'Préparation du sanctuaire…' : calm ? 'Mouvements réduits' : ''}</div>
      {phase !== 'nexus' ? <section className="nx-transition" data-phase={phase} aria-live="polite">
        {phase === 'scan' && <div className="nx-scan-seal" aria-hidden="true">3B</div>}
        <span className="nx-eyebrow">{phase === 'scan' ? 'PASSEPORT VIVANT' : 'TRAVERSÉE MATRIX'}</span>
        <h2>{phase === 'scan' ? 'L’héritage te reconnaît.' : 'Au-delà du visible.'}</h2>
        <p>{phase === 'scan' ? 'Ton passeport devient un passage.' : 'Huit mondes. Une origine.'}</p>
        <button type="button" className="nx-skip" onClick={skip}>Accéder au Nexus<SkipForward size={14} aria-hidden="true" /></button>
      </section> : <>
        <div className="nx-heading" data-hidden={!!selected} aria-hidden={!!selected}>
          <span className="nx-eyebrow">LE CERCLE BRISÉ / LE SANCTUAIRE</span>
          <h2>NEXUS <em>3B</em></h2>
          <p>Huit portes. Huit valeurs.<br />Choisis le monde qui fera vivre ton héritage.</p>
        </div>
        {!selected && <div className="nx-view-label" aria-hidden="true"><span>LES FRAGMENTS NOUS RÉUNISSENT</span><strong>Le Cercle Brisé</strong></div>}
        {(world || origin) && <section key={selected} className="nx-detail" aria-label={world ? `Porte ${world.country}` : 'Porte secrète ORIGINE'} style={{ '--gate-color': world?.color || '#d0ba8e' }}>
          <div className="nx-detail-top"><span className="nx-eyebrow">{world ? `PORTE ${world.number} / 08` : 'PORTE SECRÈTE / 09'}</span><button type="button" className="nx-overview" onClick={() => setSelected(null)}><ArrowLeft size={12} aria-hidden="true" />Vue d’ensemble</button></div>
          <h3>{world?.country || 'ORIGINE'}</h3>
          <p className="nx-value">{world?.value || 'Ce qui nous unit'}</p>
          <strong className="nx-architecture">{world?.architecture || 'Le passage scellé'}</strong>
          <p className="nx-description">{world?.description || 'Derrière cette porte repose la mémoire du Cercle. Les huit clés sont la condition de son ouverture. Aucun raccourci ne remplace le voyage.'}</p>
          <p className="nx-guardian">{world ? <>Gardien · <strong>{world.guardian}</strong></> : <>Accès secret · <strong>encore verrouillé</strong></>}</p>
          <button type="button" className="nx-enter" disabled={!world} onClick={enter}>{world ? 'Franchir la porte' : 'Réunir les huit clés'}{world ? <ArrowUpRight size={17} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />}</button>
        </section>}
        <footer className="nx-footer">
          <div className="nx-nav-heading"><span>CHOISIR UNE PORTE</span><b>08 PAYS · 01 HÉRITAGE</b></div>
          <nav ref={nav} className="nx-countries" aria-label="Les huit portes du Nexus" onKeyDown={navigateCountries}>
            {NEXUS_WORLDS.map(item => <button type="button" key={item.code} className="nx-country" style={{ '--gate-color': item.color }} aria-label={`${item.country} — ${item.value}`} aria-pressed={selected === item.code} onClick={() => setSelected(item.code)}><span aria-hidden="true">{item.number}</span><strong>{item.country}</strong><small>{item.value}</small></button>)}
          </nav>
          <div className="nx-footer-bottom"><p className="nx-motto">Ce n’est pas une marque,<br />c’est un héritage.</p><button type="button" className="nx-origin" onClick={() => setSelected(value => value === 'ORIGIN' ? null : 'ORIGIN')} aria-pressed={origin} aria-label="Découvrir la porte secrète ORIGINE, verrouillée"><LockKeyhole size={15} aria-hidden="true" /><span>3B — ORIGINE</span><small>ACCÈS SCELLÉ</small><ChevronRight size={13} aria-hidden="true" /></button></div>
        </footer>
      </>}
    </dialog>, document.body,
  );
}
