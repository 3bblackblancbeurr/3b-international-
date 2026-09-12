import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { nexusProgress, enterNexusWorld, startNexusSequence } from '../passport/nexus-flow.js';
import { mountNexusDialog } from '../passport/nexus-dialog.js';
import { mountNexusTunnel } from '../passport/nexus-tunnel.js';
import { CircleArtwork } from './NexusArtwork.jsx';
import NexusSanctuary from './NexusSanctuary.jsx';
import '../styles/passport-nexus.css';
import '../styles/passport-nexus-premium.css';

// Load the existing world engine only when this passport passage is opened.
const worldAPI = async () => {
  const [save, engine] = await Promise.all([import('../world/save.js'), import('../world/engine.js')]);
  return { ...save, applyWorldAction: engine.applyWorldAction };
};
function Tunnel({ calm }) {
  const canvas = useRef(null);
  useEffect(() => mountNexusTunnel(canvas.current, { reducedMotion: calm }), [calm]);
  return <section className="nx-tunnel" aria-label="Traversée du tunnel Matrix">
    <canvas ref={canvas} className="nx-tunnel-canvas" aria-hidden="true"/>
    <div className="nx-tunnel-emblem" aria-hidden="true">3B</div>
    <div className="nx-tunnel-copy"><p className="nx-overline">PASSEPORT DIGITAL · PASSAGE EN COURS</p><h2>L’héritage s’ouvre à toi.</h2><p>BLACK · BLANC · BEUR</p></div>
  </section>;
}

export default function PassportNexus({ open, onClose, goTo, reducedMotion = false }) {
  const id = `nx${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const account = useLoyalty();
  const uid = account.user?.id || null;
  const [phase, setPhase] = useState('scan');
  const [world, setWorld] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedCode, setSelectedCode] = useState('FR');
  const [loadTick, setLoadTick] = useState(0);
  const [systemReduced, setSystemReduced] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const dialog = useRef(null), sequence = useRef(null), version = useRef(0), inFlight = useRef(false), selectionTouched = useRef(false);
  const current = useRef({ open, uid, loading: account.loading, onClose, goTo });
  current.current = { open, uid, loading: account.loading, onClose, goTo };
  const calm = reducedMotion || systemReduced || motionPaused;
  const calmRef = useRef(calm); calmRef.current = calm;

  function close() {
    version.current += 1; inFlight.current = false;
    sequence.current?.dispose();
    current.current.onClose?.();
  }
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setSystemReduced(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useLayoutEffect(() => {
    if (!open || !dialog.current) return undefined;
    selectionTouched.current = false;
    const release = mountNexusDialog(dialog.current, close);
    const mediaReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    sequence.current = startNexusSequence(setPhase, calmRef.current || mediaReduced);
    return () => {
      version.current += 1; inFlight.current = false;
      sequence.current?.dispose(); release();
    };
    // Callback identities from the parent must never restart a running passage.
  }, [open]);
  useEffect(() => { if (open && calm) sequence.current?.skip(); }, [open, calm]);
  useLayoutEffect(() => {
    if (open && phase === 'nexus' && dialog.current && !dialog.current.contains(document.activeElement)) {
      dialog.current.querySelector('button')?.focus({ preventScroll: true });
    }
  }, [open, phase]);
  useEffect(() => {
    const ticket = ++version.current;
    inFlight.current = false; setBusy(false); setWorld(null); setError(''); setSaveMessage('');
    if (!open || account.loading) return undefined;
    let cancelled = false;
    worldAPI().then(api => api.loadWorld(uid)).then(result => {
      if (cancelled || ticket !== version.current) return;
      setWorld(result.data); setSaveMessage(result.message);
      if (!selectionTouched.current) {
        const currentDoor = nexusProgress(result.data).doors.find(door => door.region === result.data?.region);
        setSelectedCode(currentDoor?.code || 'FR');
      }
    }).catch(() => {
      if (!cancelled && ticket === version.current) setError('La progression n’a pas pu être chargée. Réessaie ou reprends ton aventure.');
    });
    return () => { cancelled = true; version.current += 1; };
  }, [open, uid, account.loading, loadTick]);

  async function openWorld(destination) {
    if (inFlight.current || current.current.loading) return;
    const ticket = version.current, owner = current.current.uid;
    const valid = () => ticket === version.current && current.current.open &&
      !current.current.loading && owner === current.current.uid;
    inFlight.current = true; setBusy(true); setError('');
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
      if (navigate) navigate('world3b');
      else window.location.hash = 'world3b';
    } catch (failure) {
      if (valid()) setError(failure instanceof Error ? failure.message : 'Ce passage n’a pas pu être ouvert. Réessaie depuis le Monde 3B.');
    } finally {
      if (valid()) { inFlight.current = false; setBusy(false); }
    }
  }
  function jump(section) {
    document.getElementById(`${id}-${section}`)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  }
  if (!open || typeof document === 'undefined') return null;
  const progress = nexusProgress(world);
  return createPortal(
    <dialog ref={dialog} className="passport-portal nx-portal" data-phase={phase} data-reduced-motion={calm} data-nexus-version="premium-20260912"
      aria-label="Nexus du Passeport 3B" aria-modal="true" tabIndex={-1}>
      <header className="nx-topbar">
        <div className="nx-brand"><strong>3B</strong><span>PASSEPORT DIGITAL<small>UN HÉRITAGE SANS FRONTIÈRES</small></span></div>
        {phase === 'nexus' && <nav aria-label="Navigation du Nexus"><button type="button" onClick={()=>jump('sanctuary')}>LE CERCLE</button><button type="button" onClick={()=>jump('doors')}>LES HUIT PORTES</button><button type="button" onClick={()=>jump('origin')}>ORIGINE</button></nav>}
        <div className="nx-top-actions">{phase === 'nexus' && <button type="button" className="nx-motion-toggle" disabled={reducedMotion||systemReduced} aria-pressed={calm} aria-label={reducedMotion||systemReduced?'Mouvements réduits activés':motionPaused?'Reprendre les animations':'Mettre les animations en pause'} onClick={()=>setMotionPaused(value=>!value)}>{calm?<Play size={15}/>:<Pause size={15}/>}</button>}<button type="button" className="nx-back" onClick={close} aria-label="Fermer le Nexus et revenir au passeport"><ArrowLeft size={15}/><span>Passeport</span></button></div>
      </header>
      {phase !== 'nexus' && <button type="button" className="nx-skip" onClick={()=>sequence.current?.skip()}>Passer le tunnel</button>}
      {phase === 'scan' && <section className="nx-scan" aria-live="polite"><CircleArtwork id={`${id}-scan`}/><p className="nx-overline">PASSEPORT 3B DÉTECTÉ</p><h2>Le Cercle te reconnaît.</h2><p>Ouverture de ton passage vers le Nexus.</p><div className="nx-scan-line" aria-hidden="true"/></section>}
      {phase === 'tunnel' && <Tunnel calm={calm}/>}
      {phase === 'nexus' && <NexusSanctuary id={id} world={world} progress={progress} selectedCode={selectedCode} onSelect={(code,preview)=>{selectionTouched.current=true;setSelectedCode(code);if(preview&&window.matchMedia?.('(max-width: 760px)')?.matches)jump('sanctuary');}} onTravel={openWorld} onRetry={()=>setLoadTick(value=>value+1)} busy={busy} loading={account.loading} error={error} saveMessage={saveMessage}/>}
    </dialog>, document.body,
  );
}
