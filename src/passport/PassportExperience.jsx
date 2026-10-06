import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, KeyRound, Palette, Pause, Play, QrCode, UserRound, X } from 'lucide-react';
import { Button } from '../design-system/index.jsx';
import { useLuxury } from '../design-system/LuxuryExperience.jsx';
import PassportVisual from '../components/PassportVisual.jsx';
import PassportAppearanceSettings from './PassportAppearance.jsx';
import PassportAtmosphere from './PassportAtmosphere.jsx';
import './passport-experience.css';

const PassportVerification = lazy(() => import('./PassportVerification.jsx'));
const SecretDirectorPanel = lazy(() => import('../secret/SecretDirectorPanel.jsx'));
const City3BPortal = lazy(() => import('../components/City3BPortal.jsx'));

const PANEL_TITLES = {
  present: 'Présenter mon Passeport',
  appearance: 'Personnaliser mon portrait',
  director: 'Outils du Directeur',
};

/** Optional tools may fail to load without taking the member's passport with them. */
class PassportToolBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="passport-tool-unavailable" role="alert">
      <p>Cet espace n’a pas pu s’ouvrir. Tu peux revenir à ton Passeport ou recharger l’application.</p>
      <Button variant="ghost" onClick={this.props.onClose}>Revenir au Passeport</Button>
      <Button variant="champagne" onClick={() => window.location.reload()}>Recharger</Button>
    </div>;
  }
}

function PassportToolDialog({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(<dialog ref={dialog} className="passport-tool-dialog" aria-label={title} aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="passport-tool-heading">
      <h2>{title}</h2>
      <Button variant="ghost" className="passport-tool-close" onClick={onClose} autoFocus aria-label="Fermer et revenir au Passeport"><X size={22} aria-hidden="true" /></Button>
    </header>
    <div className="passport-tool-content">
      <PassportToolBoundary onClose={onClose}>
        <Suspense fallback={<p className="passport-tool-loading" role="status">Ouverture…</p>}>{children}</Suspense>
      </PassportToolBoundary>
    </div>
  </dialog>, document.body);
}

export default function PassportExperience({ identity, syncing = false, goTo, options = {} }) {
  const { policy } = useLuxury();
  const host = useRef(null);
  const [panel, setPanel] = useState(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const hasOwner = Boolean(identity?.userId);
  const active = hasOwner && identity?.passportState === 'active';
  const founder = active && identity?.public_verified === true && identity?.public_badge_key === 'director_founder';
  // Permission changes hide a private panel during render, before any effect runs.
  const visiblePanel = panel === 'director' && !founder || panel === 'appearance' && !hasOwner ? null : panel;
  const mayAnimate = !policy.reduced && options.animations !== false && options.reducedMotion !== true;
  const running = mayAnimate && policy.animate && !paused && !visiblePanel && !cityOpen;
  const visualOptions = useMemo(() => ({ ...options, animations: running, reducedMotion: !running }), [options, running]);
  const closePanel = useCallback(() => setPanel(null), []);
  const closeCity = useCallback(() => setCityOpen(false), []);
  const navigate = page => { setPanel(null); setCityOpen(false); goTo(page); };

  return <section ref={host} className="passport-experience" aria-labelledby="passport-experience-title" data-motion={running ? 'living' : 'still'}>
    <PassportAtmosphere hostRef={host} running={running} economical={policy.economical} />
    <div className="passport-experience-content">
      <header className="passport-experience-heading">
        <h1 id="passport-experience-title">Passeport <span>3B</span></h1>
        {mayAnimate && <Button variant="ghost" className="passport-motion-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused}
          aria-label={paused ? 'Relancer les animations du Passeport' : 'Mettre les animations du Passeport en pause'}>
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}<span>{paused ? 'Animer' : 'Pause'}</span>
        </Button>}
      </header>

      <div className="passport-experience-card">
        <PassportVisual options={visualOptions} identity={identity} syncing={syncing} />
      </div>

      <nav className="passport-experience-actions" aria-label="Actions du Passeport">
        {active
          ? <Button variant="champagne" className="passport-present-action" aria-haspopup="dialog" onClick={() => setPanel('present')}><QrCode size={19} aria-hidden="true" />Présenter</Button>
          : <Button variant="champagne" className="passport-present-action" disabled={syncing} onClick={() => navigate('member')}><UserRound size={19} aria-hidden="true" />{syncing ? 'Synchronisation…' : 'Activer mon Passeport'}</Button>}
        {hasOwner
          ? <Button variant="ghost" className="passport-quiet-action" aria-haspopup="dialog" onClick={() => setPanel('appearance')}><Palette size={18} aria-hidden="true" />Personnaliser</Button>
          : <Button variant="ghost" className="passport-quiet-action" aria-haspopup="dialog" onClick={() => setPanel('present')}><QrCode size={18} aria-hidden="true" />Utiliser le Passeport</Button>}
        <Button variant="ghost" className="passport-quiet-action" onClick={() => navigate('member')}><UserRound size={18} aria-hidden="true" />Mon compte</Button>
      </nav>

      <div className="passport-experience-city">
        <Button variant="ghost" className="passport-city-entry" aria-label={active ? 'Ouvrir 3B MA VILLE' : 'Se connecter pour ouvrir 3B MA VILLE'} aria-haspopup={active ? 'dialog' : undefined} disabled={syncing}
          onClick={() => { if (!active) { navigate('member'); return; } setPanel(null); setCityOpen(true); }}>
          <span className="passport-city-wordmark" aria-hidden="true">3B</span>
          <span className="passport-city-label" aria-hidden="true">MA VILLE</span>
          <ArrowUpRight className="passport-city-arrow" size={18} aria-hidden="true" />
        </Button>
      </div>

      {founder && <div className="passport-experience-director"><Button variant="ghost" className="passport-quiet-action" aria-haspopup="dialog" onClick={() => setPanel('director')}><KeyRound size={16} aria-hidden="true" />Outils du Directeur</Button></div>}
    </div>

    {visiblePanel && <PassportToolDialog key={visiblePanel} title={PANEL_TITLES[visiblePanel]} onClose={closePanel}>
      {visiblePanel === 'present' && <PassportVerification key={identity?.userId || 'visitor'} identity={identity} syncing={syncing} goTo={navigate} />}
      {visiblePanel === 'appearance' && <PassportAppearanceSettings identity={identity} />}
      {visiblePanel === 'director' && founder && <SecretDirectorPanel />}
    </PassportToolDialog>}

    {cityOpen && <PassportToolBoundary onClose={closeCity}><Suspense fallback={<PassportToolDialog title="3B MA VILLE" onClose={closeCity}><p role="status">Ouverture de ta ville…</p></PassportToolDialog>}><City3BPortal open={cityOpen} onClose={closeCity} /></Suspense></PassportToolBoundary>}
  </section>;
}
