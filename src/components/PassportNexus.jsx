import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Compass, LockKeyhole, Pause, Play, RotateCcw, X } from 'lucide-react';
import { NEXUS_WORLDS, rememberNexusCountry, resolveNexusWorld } from './nexus-worlds.js';
import { useNexusJourney } from './useNexusJourney.js';
import '../styles/passport-nexus.css';
import '../styles/nexus-journey.css';
import { NexusCinemaHall, NexusTransitDecor } from './NexusCinema.jsx';
import { nexusDoorImage } from './nexus-cinema.js';
import '../styles/nexus-cinema.css';

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
  return <div className="nexus-fallback" aria-hidden="true" style={{ '--gate-color': world?.color || '#92c9ff' }}><div className="nexus-fallback-vault" /><div className="nexus-fallback-floor" /><div className="nexus-fallback-gates">{NEXUS_WORLDS.map(w => <div key={w.code} data-selected={w.code === selected} style={{ '--gate-color': w.color }}><GateGlyph code={w.code} /></div>)}</div><div className="nexus-fallback-seal"><span>3B</span></div></div>;
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
          onSelect: code => latest.current.onSelect(code), onReady: () => report('3d'),
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
  return <div className="nexus-stage" data-renderer={status} data-phase={phase}><SceneFallback selected={selected} /><div ref={host} className="nexus-canvas" /><div className="nexus-atmosphere" aria-hidden="true" /></div>;
}
export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const journey = useNexusJourney({ open, onClose, goTo });
  const dialog = useRef(null), closeButton = useRef(null), timers = useRef([]), closeRef = useRef(journey.close);
  closeRef.current = journey.close;
  const [phase, setPhase] = useState('scan'), [selected, setSelected] = useState(null);
  const [paused, setPaused] = useState(false), [quality, setQuality] = useState('auto');
  const [visualMode, setVisualMode] = useState('cinema');
  const [rendererStatus, setRendererStatus] = useState('loading'), [replay, setReplay] = useState(0);
  const active = resolveNexusWorld(selected), isOrigin = selected === 'ORIGIN';
  const selectedProgress = journey.progress.doors.find(door => door.code === selected);
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement, oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => { clearTimers(); dialog.current?.close(); document.body.style.overflow = oldOverflow; if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    clearTimers(); setSelected(null); setPaused(false); setPhase(reducedMotion ? 'nexus' : 'scan');
    return clearTimers;
  }, [open, reducedMotion, replay]);
  // Schedule the next phase only after the previous one was committed.
  useEffect(() => {
    if (!open || reducedMotion || paused || phase === 'nexus') return undefined;
    clearTimers();
    const timer = window.setTimeout(() => { setPhase(phase === 'scan' ? 'tunnel' : 'nexus'); if (phase === 'tunnel' && document.activeElement?.dataset.nexusSkip) closeButton.current?.focus({ preventScroll: true }); }, phase === 'scan' ? 1050 : 3650);
    timers.current = [timer]; return () => window.clearTimeout(timer);
  }, [open, reducedMotion, phase, replay, paused]);
  function skip() { clearTimers(); setPhase('nexus'); closeButton.current?.focus({ preventScroll: true }); }
  function selectDoor(code) { if (code === 'ORIGIN' || resolveNexusWorld(code)) setSelected(code); }
  async function enterWorld() {
    const success = await journey.travel(isOrigin ? 'ORIGINE' : active?.code || null);
    if (success && active) { try { rememberNexusCountry(window.localStorage, active.code); } catch { /* Optional legacy navigation hint. */ } }
  }
  function doorKeys(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % 8;
    else if (event.key === 'ArrowLeft') next = (index + 7) % 8;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 7;
    else return;
    event.preventDefault(); setSelected(NEXUS_WORLDS[next].code);
    const button = event.currentTarget.parentElement.querySelectorAll('button')[next];
    button?.focus({ preventScroll: true }); button?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  if (!open || typeof document === 'undefined') return null;
  const economy = quality === 'light' || (rendererStatus === 'adaptive' && quality === 'auto');
  const statusLabel = visualMode === 'cinema' ? (economy ? 'Décor cinéma · économie' : 'Décor cinéma · interactif') : rendererStatus === 'fallback' ? 'Vue légère · 3D indisponible' : rendererStatus === 'loading' ? 'Préparation du décor' : economy ? 'Rendu 3D · économie' : 'Rendu 3D en direct';
  const travelDisabled = journey.busy || journey.authLoading || (isOrigin ? !journey.originEnabled : active ? !journey.world || journey.unresolved : false);
  const originText = journey.progress.finished ? 'Le Cercle est réuni. L’Union est retrouvée ; ton héritage continue.' : journey.resumeOrigin ? 'Le dernier défi est en cours. Reprends ton passage sans perdre ta progression.' : journey.originEnabled ? 'Les huit sceaux sont réunis et les huit pays reconstruits. Le passage vers ORIGINE t’attend.' : 'Derrière cette porte, les huit héritages ne font plus qu’un. Réunis les huit sceaux et reconstruis les huit pays pour ouvrir le passage.';
  return createPortal(<dialog ref={dialog} className="nexus-experience" data-phase={phase} data-calm={reducedMotion || paused} data-selected={selected || 'overview'} data-progress-loaded={!!journey.world} data-nexus-version="cinema-reference-20260913" data-visual-mode={visualMode} data-economy={economy} aria-labelledby="nexus-title" onCancel={event => { event.preventDefault(); closeRef.current(); }}>
    <div className="nexus-cinematic-backdrop" aria-hidden="true" />
    {phase !== 'nexus' && <NexusTransitDecor />}
    <NexusStage phase={phase} selected={selected} paused={paused || (phase === 'nexus' && visualMode === 'cinema')} reducedMotion={reducedMotion} quality={quality} onSelect={selectDoor} onStatus={setRendererStatus} />
    <div className="nexus-shell">
      <header className="nexus-topbar"><div className="nexus-wordmark"><b>3B</b><span>PASSEPORT DIGITAL<small>BLACK · BLANC · BEUR</small></span></div><span className="nexus-chapter">LE CERCLE BRISÉ <i /> NEXUS</span><button ref={closeButton} type="button" className="nexus-icon-button" onClick={() => closeRef.current()} aria-label="Fermer le Nexus et revenir au passeport"><X size={21} /></button></header>
      {phase !== 'nexus' ? <section className="nexus-arrival" aria-live="polite"><div className="nexus-arrival-mark" aria-hidden="true"><i /><i /><span>3B</span></div><p className="nexus-kicker">{phase === 'scan' ? 'PASSEPORT VIVANT' : 'TRAVERSÉE DU CERCLE'}</p><h2 id="nexus-title">{phase === 'scan' ? 'L’héritage te reconnaît.' : 'Au-delà du passeport.'}</h2><p>{phase === 'scan' ? 'Ouverture du passage vers le Nexus.' : 'Huit mondes se rejoignent. Ton voyage commence.'}</p><div className="nexus-arrival-progress" aria-hidden="true"><i /></div><div className="nexus-intro-controls"><button type="button" className="nexus-skip" data-nexus-skip="true" onClick={skip}>Passer l’introduction <ArrowRight size={16} /></button><button type="button" className="nexus-icon-button" aria-label={paused ? 'Reprendre les animations' : 'Mettre les animations en pause'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></div></section> : <>
        <main className="nexus-main"><section className="nexus-narrative" aria-live="polite" aria-atomic="true">
          <p className="nexus-kicker">{active ? `PORTE ${active.number} / 08 · ${active.architecture}` : isOrigin ? 'PORTE 09 · LE DERNIER PASSAGE' : 'LE SANCTUAIRE DES HÉRITAGES'}</p>
          <h2 id="nexus-title">{active ? active.country : isOrigin ? 'ORIGINE' : <>Huit mondes.<br /><em>Un seul héritage.</em></>}</h2>
          {active && <p className="nexus-value" style={{ color: active.color }}>{active.value}</p>}
          <p className="nexus-description">{active ? active.description : isOrigin ? originText : 'Choisis une porte. Retrouve un gardien. Rassemble ce que l’Oubli a séparé.'}</p>
          {active && <><div className="nexus-guardian"><span>GARDIEN DE LA PORTE</span><strong>{active.guardian}</strong></div><p className="nexus-progress-state">{!journey.world ? 'Lecture de ta progression…' : selectedProgress?.restored ? 'Pays reconstruit · sceau retrouvé' : selectedProgress?.sealed ? 'Sceau retrouvé' : 'Un héritage à découvrir'}</p></>}
          {!active && <div className="nexus-progress-summary"><strong>{journey.world ? journey.progress.sealCount : '—'} / 8 sceaux</strong><span>{journey.world ? journey.progress.restoredCount : '—'} / 8 pays reconstruits</span></div>}
          {isOrigin && <div className="nexus-origin-seals" aria-label="Les huit sceaux de la porte ORIGINE">{journey.progress.doors.map(door => <span key={door.code} data-complete={door.sealed} title={`${door.country} · ${door.sealed ? 'Sceau retrouvé' : 'Sceau à retrouver'}`}>{door.sealed ? <Check size={12} /> : <LockKeyhole size={12} />}<small>{door.code}</small></span>)}</div>}
          {selected && <button type="button" className="nexus-back" onClick={() => setSelected(null)}><ArrowLeft size={15} /> Vue du sanctuaire</button>}
          {selected && <button type="button" className="nexus-resume" disabled={journey.busy || journey.authLoading} onClick={() => journey.travel(null)}><Compass size={14} />{journey.unresolved ? 'Reprendre ma rencontre en cours' : 'Reprendre mon aventure'}</button>}
        </section>{visualMode === 'cinema' && <NexusCinemaHall selected={selected} onSelect={selectDoor} doors={journey.progress.doors} originEnabled={journey.originEnabled} economy={economy} onFailure={() => setVisualMode('3d')} />}<div className="nexus-scene-caption" aria-hidden="true"><i /><span>{isOrigin ? 'LE SEUIL DE L’ORIGINE' : active ? active.architecture : 'LE CERCLE BRISÉ'}<small>{isOrigin ? 'Huit valeurs. Une seule origine.' : active ? `${active.country} · ${active.value}` : 'Ce n’est pas une marque, c’est un héritage.'}</small></span></div></main>
        <footer className="nexus-bottom"><div className="nexus-destination-row"><span>LES HUIT PORTES <small>Choisis ton horizon</small></span><button type="button" className="nexus-origin-link" aria-pressed={isOrigin} onClick={() => selectDoor('ORIGIN')}><LockKeyhole size={13} /> ORIGINE <span>09</span></button></div>
          <nav className="nexus-door-rail" aria-label="Les huit portes du Nexus">{NEXUS_WORLDS.map((world, index) => <button key={world.code} type="button" className="nexus-door-choice" style={{ '--gate-color': world.color }} aria-label={`${world.country}, ${world.value}, gardien ${world.guardian}`} aria-pressed={selected === world.code} onClick={() => selectDoor(world.code)} onKeyDown={event => doorKeys(event, index)}><img className="nexus-door-art" src={nexusDoorImage(world.code)} alt="" width="132" height="132" decoding="async" onError={event => { event.currentTarget.style.display = 'none'; }} /><span className="nexus-door-index">{world.number}</span><GateGlyph code={world.code} /><span className="nexus-door-label"><strong>{world.country}</strong><small>{world.value}</small></span><i /></button>)}</nav>
          {(journey.error || journey.busy) && <div className="nexus-feedback" role={journey.error ? 'alert' : 'status'}><p>{journey.error || 'Préparation du passage. Ta progression est conservée.'}</p>{journey.error && <button type="button" disabled={journey.busy} onClick={journey.retry}>Réessayer la lecture de la progression</button>}</div>}
          <div className="nexus-controls"><div className="nexus-render-controls"><button type="button" className="nexus-visual-toggle" onClick={() => setVisualMode(mode => mode === 'cinema' ? '3d' : 'cinema')}>{visualMode === 'cinema' ? 'Voir le sanctuaire en 3D' : 'Activer le décor cinéma'}</button><span className="nexus-render-status"><i />{statusLabel}</span><label className="nexus-quality"><span className="nexus-visually-hidden">Qualité graphique</span><select aria-label="Qualité graphique" value={quality} onChange={event => setQuality(event.target.value)}><option value="auto">Auto</option><option value="high">Détaillé</option><option value="light">Économie</option></select></label><button type="button" className="nexus-icon-button" disabled={reducedMotion} aria-label={paused ? 'Reprendre les animations' : 'Mettre les animations en pause'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? <Play size={16} /> : <Pause size={16} />}</button><button type="button" className="nexus-icon-button" aria-label="Revoir le tunnel Matrix" onClick={() => setReplay(value => value + 1)}><RotateCcw size={16} /></button></div>
            <button type="button" className="nexus-enter-world" disabled={travelDisabled} onClick={enterWorld}>{isOrigin && !journey.originEnabled ? <LockKeyhole size={17} /> : <Compass size={17} />}<span>{journey.busy ? 'Préparation du passage…' : isOrigin ? journey.progress.finished ? 'L’Union retrouvée' : journey.resumeOrigin ? 'Reprendre le défi ORIGINE' : journey.originEnabled ? 'Ouvrir ORIGINE' : 'ORIGINE · accès scellé' : active ? 'Franchir la porte' : journey.unresolved ? 'Reprendre ma rencontre' : 'Explorer le Monde 3B'}{active && <small>{journey.unresolved ? 'Termine ta rencontre avant de changer de pays' : `${active.country} · progression conservée`}</small>}</span>{!travelDisabled && <ArrowRight size={18} />}</button>
          </div>
        </footer>
      </>}
    </div>
  </dialog>, document.body);
}
