import InstallCards from '../install/InstallCards.jsx';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from './index.jsx';
import { DEFAULT_OPTIONS, loadJsonStorage, STORAGE_OPTIONS_KEY } from '../lib/member.js';
import { experiencePolicy, markIntroSeen, MOTION, surfaceTilt } from './experience-policy.js';

const ExperienceContext = createContext(null);
const ACTIONS = 'button:not(:disabled), a[href], [role="button"]';

function deviceState() {
  return { reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    hidden: document.hidden, saveData: navigator.connection?.saveData === true, memory: navigator.deviceMemory || 8 };
}

export function LuxuryProvider({ children }) {
  const [options, configure] = useState(() => loadJsonStorage(STORAGE_OPTIONS_KEY, DEFAULT_OPTIONS));
  const [device, setDevice] = useState(deviceState);
  const [scene, setScene] = useState(null);
  const audio = useRef(null), activated = useRef(false), lastCue = useRef(0), serial = useRef(0);
  const policy = useMemo(() => experiencePolicy(options, device), [options, device]);
  const current = useRef(policy); current.current = policy;

  const cue = useCallback((kind = 'press') => {
    const p = current.current;
    if (document.hidden || !activated.current) return;
    const now = performance.now();
    if (now - lastCue.current < 90) return;
    lastCue.current = now;
    if (p.haptics) { try { navigator.vibrate?.(kind === 'milestone' ? [10, 35, 16] : 7); } catch { /* Unsupported device. */ } }
    if (!p.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const ctx = audio.current || (audio.current = new Audio());
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), time = ctx.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'milestone' ? 660 : kind === 'portal' ? 220 : 440, time);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'milestone' ? 990 : 330, time + .12);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(.026, time + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .16);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(time); oscillator.stop(time + .18);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Feedback must never prevent navigation. */ }
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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.luxury = 'v2';
    root.dataset.experienceMotion = policy.animate ? 'full' : 'reduced';
    root.dataset.experienceQuality = policy.economical ? 'economical' : 'full';
    if (!policy.animate) setScene(value => value?.kind === 'milestone' ? value : null);
    if ((!policy.sound || device.hidden) && audio.current) audio.current.suspend().catch(() => {});
    return () => { delete root.dataset.luxury; delete root.dataset.experienceMotion; delete root.dataset.experienceQuality; };
  }, [policy, device.hidden]);

  useEffect(() => {
    const click = event => {
      if (!event.isTrusted) return;
      const target = event.target?.closest?.(ACTIONS);
      if (!target || target.getAttribute('aria-disabled') === 'true' || target.closest('[data-feedback="off"], .world-play')) return;
      activated.current = true;
      cue('press');
    };
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('click', click, true); audio.current?.close().catch(() => {}); audio.current = null; };
  }, [cue]);

  useEffect(() => {
    if (!scene) return;
    const timer = setTimeout(() => setScene(null), scene.kind === 'milestone' ? MOTION.milestone : scene.kind === 'portal' ? MOTION.portal : MOTION.route);
    return () => clearTimeout(timer);
  }, [scene]);

  const value = useMemo(() => ({ policy, configure, present, cue }), [policy, present, cue]);
  return <ExperienceContext.Provider value={value}>
    {children}
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
    if (previous.current !== page && page !== 'intro') present(['world3b', 'secret'].includes(page) ? 'portal' : 'route');
    previous.current = page;
  }, [page, present]);
}

export function ExperienceControls({ options, toggleOption, page }) {
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
  return <details className="luxury-controls" ref={disclosure} onKeyDown={event => { if (event.key === 'Escape') { disclosure.current.open = false; disclosure.current.querySelector('summary')?.focus(); } }}>
    <summary aria-label="Réglages de l’expérience"><SlidersHorizontal size={18}/><span>Ambiance</span></summary>
    <div className="luxury-controls-panel">
      <strong>À ton rythme.</strong><p>Une même identité. Ton confort.</p>
      {[['interfaceSound', 'Sons de l’interface'], ['haptics', 'Vibrations au toucher'], ['cinematicIntros', 'Introduction cinématique'], ['reducedMotion', 'Réduire les mouvements']].map(([key, label]) =>
        <Button key={key} variant="ghost" onClick={() => toggleOption(key)} aria-pressed={options[key]}>{label}<span>{options[key] ? 'Oui' : 'Non'}</span></Button>)}
      <Button variant="ghost" onClick={toggleSensor} aria-pressed={options.sensorReflections}>Reflets au mouvement<span>{options.sensorReflections ? "Oui" : "Non"}</span></Button>
      {sensorNotice && <p role="status">{sensorNotice}</p>}
    </div>
  </details>;
}

export function LuxuryBoot({ onDone, installation }) {
  const { policy } = useLuxury();
  const done = useRef(onDone); done.current = onDone;
  const finished = useRef(false);
  const finish = useCallback(() => { if (finished.current) return; finished.current = true; try { markIntroSeen(window.localStorage); } catch { /* Restricted storage. */ } done.current(); }, []);
  return <section className="intro3b-card intro3b-start-card" data-motion={policy.animate ? 'full' : 'reduced'} aria-labelledby="intro3b-title">
    <div className="luxury-boot-beam" aria-hidden="true"/>
    <div className="luxury-boot-particles" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--particle': index }}/>)}</div>
    <p className="eyebrow">3B INTERNATIONAL</p>
    <p className="eyebrow brand-glow-badge">BLACK • BLANC • BEUR</p>
    <h1 id="intro3b-title">De zéro à l’international</h1>
    <p className="intro3b-lead">Entrez dans la Cité des Huit Héritages.</p>
    <p className="intro3b-legacy">Ce n’est pas une marque. C’est un héritage.</p>
    <Button variant="champagne" className="primary-button intro3b-enter" onClick={finish}>COMMENCER</Button>
    <InstallCards installation={installation}/>
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
