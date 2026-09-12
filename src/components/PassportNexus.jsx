import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Compass, LockKeyhole, Pause, Play, RotateCcw, X } from 'lucide-react';
import { NEXUS_WORLDS, rememberNexusCountry, resolveNexusWorld } from './nexus-worlds.js';
import '../styles/passport-nexus.css';

function GateGlyph({ code }) {
  const details = {
    FR: 'M30 8L16 48M30 8L44 48M21 32H39M18 42H42M23 26L37 38M37 26L23 38M26 17H34',
    DZ: 'M15 48Q22 39 30 10Q31 39 44 48M30 10V48M15 48H44',
    ES: 'M17 48V22L21 11L25 22V48M34 48V19L38 8L42 19V48M13 48H47',
    MA: 'M13 48V20H20V48M40 48V20H47V48M21 48V34Q17 23 30 18Q43 23 39 34V48M11 18H22M38 18H49',
    IT: 'M12 20Q30 10 48 20V45Q30 53 12 45ZM12 29Q30 38 48 29M12 38Q30 47 48 38M19 20V47M27 23V49M35 23V49M43 21V47',
    TN: 'M12 46H48M16 42V19M24 42V19M36 42V19M44 42V19M12 17H48M10 50H50M19 13L30 8L41 13',
    TR: 'M16 46V32Q30 6 44 32V46M16 32H44M11 46V19L13 12L15 19M45 46V19L47 12L49 19M30 16V9',
    EE: 'M14 48V28H23V48M12 28L18 15L25 28M25 48V19H35V48M23 19L30 7L37 19M38 48V29H47V48M36 29L42 17L49 29',
  };
  return <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={details[code] || details.FR} /></svg>;
}

function SceneFallback({ selected }) {
  const world = resolveNexusWorld(selected);
  return <div className="nexus-fallback" aria-hidden="true" style={{ '--gate-color': world?.color || '#92c9ff' }}>
    <div className="nexus-fallback-vault" />
    <div className="nexus-fallback-floor" />
    <div className="nexus-fallback-gates">{NEXUS_WORLDS.map(w => <div key={w.code} data-selected={w.code === selected} style={{ '--gate-color': w.color }}><GateGlyph code={w.code} /></div>)}</div>
    <div className="nexus-fallback-seal"><span>3B</span></div>
  </div>;
}

function NexusStage({ phase, selected, paused, reducedMotion, quality, onSelect, onStatus }) {
  const host = useRef(null), api = useRef(null), latest = useRef(null);
  latest.current = { phase, selected, paused, reducedMotion, quality, onSelect, onStatus };
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let live = true, instance = null, failed = false;
    function report(value) { if (live) { setStatus(value); latest.current.onStatus(value); } }
    import('./nexus-scene.js').then(({ createNexusScene }) => {
      if (!live || !host.current) return;
      try {
        instance = createNexusScene(host.current, {
          onSelect: code => latest.current.onSelect(code),
          onReady: () => report('3d'),
          onFailure: () => { failed = true; report('fallback'); },
          onQuality: () => { if (live) latest.current.onStatus('adaptive'); },
        });
        if (failed) { instance.dispose(); return; }
        api.current = instance; instance.update(latest.current);
      } catch { report('fallback'); host.current?.replaceChildren(); }
    }).catch(() => report('fallback'));
    return () => { live = false; instance?.dispose(); api.current = null; };
  }, []);
  useEffect(() => { api.current?.update({ phase, selected, paused, reducedMotion, quality }); }, [phase, selected, paused, reducedMotion, quality]);
  return <div className="nexus-stage" data-renderer={status} data-phase={phase}>
    <SceneFallback selected={selected} />
    <div ref={host} className="nexus-canvas" />
    <div className="nexus-atmosphere" aria-hidden="true" />
  </div>;
}

export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const dialog = useRef(null), closeButton = useRef(null), timers = useRef([]), closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [phase, setPhase] = useState('scan'), [selected, setSelected] = useState(null);
  const [paused, setPaused] = useState(false), [quality, setQuality] = useState('auto');
  const [rendererStatus, setRendererStatus] = useState('loading'), [replay, setReplay] = useState(0);
  const active = resolveNexusWorld(selected), isOrigin = selected === 'ORIGIN';
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement, oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      clearTimers(); dialog.current?.close(); document.body.style.overflow = oldOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    clearTimers(); setSelected(null); setPaused(false); setPhase(reducedMotion ? 'nexus' : 'scan');
    if (!reducedMotion) {
      timers.current = [
        window.setTimeout(() => setPhase('tunnel'), 1050),
        window.setTimeout(() => { setPhase('nexus'); if (document.activeElement?.dataset.nexusSkip) closeButton.current?.focus({ preventScroll: true }); }, 4700),
      ];
    }
    return clearTimers;
  }, [open, reducedMotion, replay]);

  function skip() { clearTimers(); setPhase('nexus'); closeButton.current?.focus({ preventScroll: true }); }
  function selectDoor(code) { if (code === 'ORIGIN' || resolveNexusWorld(code)) setSelected(code); }
  function enterWorld() {
    if (isOrigin) return;
    if (active) { try { rememberNexusCountry(window.localStorage, active.code); } catch { /* The world remains accessible in private mode. */ } }
    closeRef.current();
    if (goTo) goTo('world3b'); else window.location.hash = 'monde-3b';
  }
  function doorKeys(event, index) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault(); const next = (index + delta + NEXUS_WORLDS.length) % NEXUS_WORLDS.length;
    setSelected(NEXUS_WORLDS[next].code);
    const buttons = event.currentTarget.parentElement.querySelectorAll('button');
    buttons[next]?.focus({ preventScroll: true }); buttons[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  if (!open || typeof document === 'undefined') return null;
  const statusLabel = rendererStatus === 'fallback' ? 'Vue légère · 3D indisponible' : rendererStatus === 'loading' ? 'Préparation du décor' : rendererStatus === 'adaptive' || quality === 'light' ? 'Rendu 3D · économie' : 'Rendu 3D en direct';

  return createPortal(<dialog ref={dialog} className="nexus-experience" data-phase={phase} data-calm={reducedMotion || paused} data-selected={selected || 'overview'} aria-labelledby="nexus-title" onCancel={event => { event.preventDefault(); closeRef.current(); }}>
    <NexusStage phase={phase} selected={selected} paused={paused} reducedMotion={reducedMotion} quality={quality} onSelect={selectDoor} onStatus={setRendererStatus} />
    <div className="nexus-shell">
      <header className="nexus-topbar">
        <div className="nexus-wordmark"><b>3B</b><span>PASSEPORT DIGITAL<small>BLACK · BLANC · BEUR</small></span></div>
        <span className="nexus-chapter">LE CERCLE BRISÉ <i /> NEXUS</span>
        <button ref={closeButton} type="button" className="nexus-icon-button" onClick={() => closeRef.current()} aria-label="Fermer le Nexus et revenir au passeport"><X size={21} /></button>
      </header>

      {phase !== 'nexus' ? <section className="nexus-arrival" aria-live="polite">
        <div className="nexus-arrival-mark" aria-hidden="true"><i /><i /><span>3B</span></div>
        <p className="nexus-kicker">{phase === 'scan' ? 'PASSEPORT VIVANT' : 'TRAVERSÉE DU CERCLE'}</p>
        <h2 id="nexus-title">{phase === 'scan' ? 'L’héritage te reconnaît.' : 'Au-delà du passeport.'}</h2>
        <p>{phase === 'scan' ? 'Ouverture du passage vers le Nexus.' : 'Huit mondes se rejoignent. Ton voyage commence.'}</p>
        <div className="nexus-arrival-progress" aria-hidden="true"><i /></div>
        <button type="button" className="nexus-skip" data-nexus-skip="true" onClick={skip}>Passer l’introduction <ArrowRight size={16} /></button>
      </section> : <>
        <main className="nexus-main">
          <section className="nexus-narrative" aria-live="polite" aria-atomic="true">
            <p className="nexus-kicker">{active ? `PORTE ${active.number} / 08 · ${active.architecture}` : isOrigin ? 'PORTE 09 · LE DERNIER PASSAGE' : 'LE SANCTUAIRE DES HÉRITAGES'}</p>
            <h2 id="nexus-title">{active ? active.country : isOrigin ? 'ORIGINE' : <>Huit mondes.<br /><em>Un seul héritage.</em></>}</h2>
            {active && <p className="nexus-value" style={{ color: active.color }}>{active.value}</p>}
            <p className="nexus-description">{active ? active.description : isOrigin ? 'Derrière cette porte, les huit héritages ne font plus qu’un. Son accès reste scellé : réunis les huit clés du Cercle.' : 'Choisis une porte. Retrouve un gardien. Rassemble ce que l’Oubli a séparé.'}</p>
            {active && <div className="nexus-guardian"><span>GARDIEN DE LA PORTE</span><strong>{active.guardian}</strong></div>}
            {isOrigin && <div className="nexus-origin-seals" aria-label="Les huit sceaux de la porte ORIGINE">{NEXUS_WORLDS.map(w => <span key={w.code} title={`${w.country} · ${w.value}`}><LockKeyhole size={12} /><small>{w.code}</small></span>)}</div>}
            {selected && <button type="button" className="nexus-back" onClick={() => setSelected(null)}><ArrowLeft size={15} /> Vue du sanctuaire</button>}
          </section>
          <div className="nexus-scene-caption" aria-hidden="true"><i /><span>{isOrigin ? 'LE SEUIL DE L’ORIGINE' : active ? active.architecture : 'LE CERCLE BRISÉ'}<small>{isOrigin ? 'Huit clés. Une seule origine.' : active ? `${active.country} · ${active.value}` : 'Ce n’est pas une marque, c’est un héritage.'}</small></span></div>
        </main>

        <footer className="nexus-bottom">
          <div className="nexus-destination-row"><span>LES HUIT PORTES <small>Choisis ton horizon</small></span><button type="button" className="nexus-origin-link" aria-pressed={isOrigin} onClick={() => selectDoor('ORIGIN')}><LockKeyhole size={13} /> ORIGINE <span>09</span></button></div>
          <nav className="nexus-door-rail" aria-label="Les huit portes du Nexus">
            {NEXUS_WORLDS.map((world, index) => <button key={world.code} type="button" className="nexus-door-choice" style={{ '--gate-color': world.color }} aria-label={`${world.country}, ${world.value}, gardien ${world.guardian}`} aria-pressed={selected === world.code} onClick={() => selectDoor(world.code)} onKeyDown={event => doorKeys(event, index)}><span className="nexus-door-index">{world.number}</span><GateGlyph code={world.code} /><span className="nexus-door-label"><strong>{world.country}</strong><small>{world.value}</small></span><i /></button>)}
          </nav>
          <div className="nexus-controls">
            <div className="nexus-render-controls"><span className="nexus-render-status"><i />{statusLabel}</span><label className="nexus-quality"><span className="nexus-visually-hidden">Qualité graphique</span><select aria-label="Qualité graphique" value={quality} onChange={event => setQuality(event.target.value)}><option value="auto">Auto</option><option value="high">Détaillé</option><option value="light">Économie</option></select></label><button type="button" className="nexus-icon-button" disabled={reducedMotion} aria-label={paused ? 'Reprendre les animations' : 'Mettre les animations en pause'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? <Play size={16} /> : <Pause size={16} />}</button><button type="button" className="nexus-icon-button" aria-label="Revoir le tunnel Matrix" onClick={() => setReplay(value => value + 1)}><RotateCcw size={16} /></button></div>
            <button type="button" className="nexus-enter-world" disabled={isOrigin} onClick={enterWorld}>{isOrigin ? <LockKeyhole size={17} /> : <Compass size={17} />}<span>{isOrigin ? 'ORIGINE · accès scellé' : active ? 'Continuer vers le Monde 3B' : 'Explorer le Monde 3B'}{active && <small>{active.country} sélectionnée · selon ta progression</small>}</span>{!isOrigin && <ArrowRight size={18} />}</button>
          </div>
        </footer>
      </>}
    </div>
  </dialog>, document.body);
}
