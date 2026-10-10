import InstallCards from '../install/InstallCards.jsx';
import CinematicLaunch, { BRAND_ICON } from './CinematicLaunch.jsx';
import EntryAtmosphere from './EntryAtmosphere.jsx';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from './index.jsx';
import { DEFAULT_OPTIONS, loadJsonStorage, STORAGE_OPTIONS_KEY } from '../lib/member.js';
import { experiencePolicy, markIntroSeen, MOTION, surfaceTilt } from './experience-policy.js';
import { createInterfaceSound, interfaceSoundIntent, companionActionCue, canonicalInterfaceCue, SOUND_ACTION_SELECTOR, COMPANION_SPEAKING_EVENT, COMPANION_ACTION_EVENT, INTERFACE_SOUND_EVENT } from '../audio/interface-sound.js';
import { enterIntroImmersive, exitIntroImmersive } from '../native/immersive.js';
import CompanionPresenceControl from '../companion/CompanionPresenceControl.jsx';

const ExperienceContext = createContext(null);

function deviceState() {
  return { reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hidden: document.hidden, saveData: navigator.connection?.saveData === true, memory: navigator.deviceMemory || 8 };
}

export function LuxuryProvider({ children }) {
  const [options, configure] = useState(() => loadJsonStorage(STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS));
  const [device, setDevice] = useState(deviceState);
  const [scene, setScene] = useState(null);
  const audio = useRef(null), activated = useRef(false), lastCue = useRef(0), serial = useRef(0), speaking = useRef(false);
  const policy = useMemo(() => experiencePolicy(options, device), [options, device]);
  const [launching, setLaunching] = useState(() => !experiencePolicy(options, device).reduced);
  const [revealing, setRevealing] = useState(false);
  const current = useRef(policy); current.current = policy;

  const cue = useCallback((kind = 'press', details = {}) => {
    const p = current.current;
    if (details.event?.isTrusted === true) activated.current = true;
    if (document.hidden || !activated.current) return false;
    const now = performance.now();
    if (p.haptics && !details.quiet && now - lastCue.current >= 90) {
      lastCue.current = now;
      try { navigator.vibrate?.(kind === 'milestone' || kind === 'success' ? [10, 35, 16] : 7); } catch { /* Unsupported device. */ }
    }
    const engine = audio.current || (audio.current = createInterfaceSound());
    // Only the real sound-toggle gesture may apply the next preference before
    // React has rendered it. Other callers always respect the stored option.
    engine.setEnabled(details.event?.isTrusted === true && typeof details.enabled === 'boolean' ? details.enabled : p.sound);
    engine.setSpeaking(speaking.current);
    if (details.event?.isTrusted === true) engine.unlock(details.event);
    return engine.play(kind, details);
  }, []);

  const present = useCallback((kind, title = '') => {
    if (document.hidden) return;
    const p = current.current;
    if (kind !== 'route') cue(kind);
    if (!p.animate && kind !== 'milestone') return;
    setScene({ kind, title, id: ++serial.current });
  }, [cue]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setDevice(deviceState());
    preference.addEventListener('change', update);
    navigator.connection?.addEventListener?.('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference.removeEventListener('change', update);
      navigator.connection?.removeEventListener?.('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.luxury = 'v2';
    root.dataset.experienceMotion = policy.animate ? 'full' : 'reduced';
    root.dataset.experienceQuality = policy.economical ? 'economical' : 'full';
    if (!policy.animate) setScene(value => value?.kind === 'milestone' ? value : null);
    audio.current?.setEnabled(policy.sound);
    audio.current?.visibility(device.hidden);
    return () => { delete root.dataset.luxury; delete root.dataset.experienceMotion; delete root.dataset.experienceQuality; };
  }, [policy, device.hidden]);

  useEffect(() => {
    const click = event => {
      if (!event.isTrusted) return;
      const target = event.target?.closest?.(SOUND_ACTION_SELECTOR);
      const intent = interfaceSoundIntent(target, event, window.innerWidth);
      if (intent) cue(intent.kind, { ...intent, event });
    };
    const speech = event => { speaking.current = event.detail?.speaking === true; audio.current?.setSpeaking(speaking.current); };
    const action = event => { const kind = companionActionCue(event.detail?.action); if (kind) cue(kind, { pan: event.detail?.pan || 0, quiet: true }); };
    const requestedSound = event => { const kind = canonicalInterfaceCue(event.detail?.kind); if (kind) cue(kind, { pan: event.detail?.pan || 0, event: event.detail?.event, quiet: true }); };
    const visibility = () => audio.current?.visibility(document.hidden);
    document.addEventListener('click', click, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener(COMPANION_SPEAKING_EVENT, speech);
    window.addEventListener(COMPANION_ACTION_EVENT, action);
    window.addEventListener(INTERFACE_SOUND_EVENT, requestedSound);
    return () => {
      document.removeEventListener('click', click, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener(COMPANION_SPEAKING_EVENT, speech);
      window.removeEventListener(COMPANION_ACTION_EVENT, action);
      window.removeEventListener(INTERFACE_SOUND_EVENT, requestedSound);
      audio.current?.close(); audio.current = null;
    };
  }, [cue]);

  useEffect(() => {
    if (!scene) return;
    const timer = setTimeout(() => setScene(null), scene.kind === 'milestone' ? MOTION.milestone : scene.kind === 'portal' ? MOTION.portal : MOTION.route);
    return () => clearTimeout(timer);
  }, [scene]);

  const value = useMemo(() => ({ policy, configure, present, cue }), [policy, present, cue]);
  return <ExperienceContext.Provider value={value}>
    <div className="threeb-app-content" data-launch-hidden={launching && !revealing || undefined} inert={launching} aria-hidden={launching || undefined}>{children}</div>
    {launching && <CinematicLaunch policy={policy} enabled onReveal={() => setRevealing(true)} onDone={() => setLaunching(false)}/>}
    {scene && <div key={scene.id} className={`luxury-transition luxury-transition--${scene.kind}`} aria-hidden={scene.kind !== 'milestone' ? true : undefined}>
      <span className="luxury-transition-ring" />
      {scene.kind === 'milestone' && <aside className="luxury-milestone" role="status"><span className="eyebrow">HÉRITAGE 3B</span><strong>{scene.title}</strong><Button variant="ghost" onClick={() => setScene(null)} aria-label="Fermer la célébration"><X size={18}/></Button></aside>}
    </div>}
  </ExperienceContext.Provider>;
}

export const useLuxury = () => useContext(ExperienceContext);

export function useLuxuryRuntime(options, page) {
  const { configure, present } = useLuxury();
  const previous = useRef(page);
  useEffect(() => { configure(options); }, [options, configure]);
  useEffect(() => {
    if (page === 'intro') enterIntroImmersive();
    else exitIntroImmersive();
    return () => { if (page === 'intro') exitIntroImmersive(); };
  }, [page]);
  useEffect(() => {
    if (previous.current !== page && page !== 'intro') present(['world3b', 'secret'].includes(page) ? 'portal' : 'route');
    previous.current = page;
  }, [page, present]);
}

export function ExperienceControls({ options, toggleOption, page, inline = false }) {
  const disclosure = useRef(null);
  const [sensorNotice, setSensorNotice] = useState("");
  const toggleSensor = async () => {
    setSensorNotice("");
    if (options.sensorReflections) { toggleOption("sensorReflections"); return; }
    try {
      if (!window.DeviceOrientationEvent) throw Error("Capteur indisponible sur cet appareil.");
      if (typeof DeviceOrientationEvent.requestPermission === "function" && await DeviceOrientationEvent.requestPermission() !== "granted") throw Error("Permission refusée. Les reflets au pointeur restent disponibles.");
      toggleOption("sensorReflections");
    } catch (error) { setSensorNotice(error.message || "Capteur indisponible."); }
  };
  useEffect(() => { if (disclosure.current) disclosure.current.open = false; }, [page]);
  const Container = inline ? "section" : "details";
  return <Container className={inline ? "luxury-controls luxury-controls-inline" : "luxury-controls"} ref={disclosure} onKeyDown={event => { if (event.key === 'Escape') { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); } }}>
    {!inline && <summary aria-label="Paramètres de l’application" data-companion-settings-trigger><SlidersHorizontal size={18}/><span>Paramètres</span></summary>}
    <div className="luxury-controls-panel">
      <strong>À ton rythme.</strong><p>Une même identité. Ton confort.</p>
      <CompanionPresenceControl/>
      {[['interfaceSound', 'Sons de l’interface'], ['haptics', 'Vibrations au toucher'], ['reducedMotion', 'Réduire les mouvements']].map(([key, label]) =>
        <Button key={key} variant="ghost" data-sound-toggle={key === 'interfaceSound' ? key : undefined} onClick={() => toggleOption(key)} aria-pressed={options[key]}>{label}<span>{options[key] ? 'Oui' : 'Non'}</span></Button>)}
      {options.interfaceSound && <Button variant="ghost" data-sound="entry">Écouter la signature 3B<span aria-hidden="true">♫</span></Button>}
      <p>Des sons discrets pour tes actions. La voix se choisit dans les réglages de ton compagnon.</p>
      <Button variant="ghost" onClick={toggleSensor} aria-pressed={options.sensorReflections}>Reflets au mouvement<span>{options.sensorReflections ? "Oui" : "Non"}</span></Button>
      {sensorNotice && <p role="status">{sensorNotice}</p>}
    </div>
  </Container>;
}

export function LuxuryBoot({ onDone, installation }) {
  const { policy } = useLuxury();
  const done = useRef(onDone); done.current = onDone;
  const finished = useRef(false);
  const finish = useCallback(() => { if (finished.current) return; finished.current = true; try { markIntroSeen(window.localStorage); } catch { /* Restricted storage. */ } done.current(); }, []);
  return <section className="intro3b-card intro3b-start-card" data-motion={policy.animate ? 'full' : 'reduced'} aria-labelledby="intro3b-title">
    <EntryAtmosphere policy={policy}/>
    <img className="intro3b-brand-icon" src={BRAND_ICON} alt="" width="512" height="512"/>
    <p className="eyebrow">3B INTERNATIONAL</p>
    <h1 id="intro3b-title">De zéro à l’international</h1>
    <p className="intro3b-lead">Ton univers. Ton histoire.</p>
    <Button variant="champagne" className="primary-button intro3b-enter" onClick={finish}>COMMENCER</Button>
    {!installation?.installed && <details className="intro3b-install"><summary>Installer l’application</summary><InstallCards installation={installation}/></details>}
  </section>;
}

export function useSurfaceMotion(ref, enabled = true) {
  const { policy } = useLuxury();
  useEffect(() => {
    const element = ref.current;
    let frame = 0, baseline = null;
    const reset = () => { cancelAnimationFrame(frame); ['--surface-rx', '--surface-ry', '--surface-light-x', '--surface-light-y'].forEach(key => element?.style.removeProperty(key)); };
    if (!policy.animate || !enabled || !element) { reset(); return; }
    const update = (x, y) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const tilt = surfaceTilt(x, y);
        element.style.setProperty('--surface-rx', `${tilt.x}deg`);
        element.style.setProperty('--surface-ry', `${tilt.y}deg`);
        element.style.setProperty('--surface-light-x', `${tilt.lightX}%`);
        element.style.setProperty('--surface-light-y', `${tilt.lightY}%`);
      });
    };
    const move = event => {
      if (event.pointerType === 'touch') return;
      const rect = element.getBoundingClientRect();
      update((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    };
    const sensor = event => {
      if (document.hidden || !Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
      baseline ??= { beta: event.beta, gamma: event.gamma };
      update(.5 + (event.gamma - baseline.gamma) / 70, .5 + (event.beta - baseline.beta) / 70);
    };
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', reset);
    if (policy.sensor) window.addEventListener('deviceorientation', sensor, { passive: true });
    return () => {
      cancelAnimationFrame(frame); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', reset);
      window.removeEventListener('deviceorientation', sensor); reset();
    };
  }, [policy.animate, policy.sensor, enabled, ref]);
}
