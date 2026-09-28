import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Sparkles, X } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { city3bRequest } from '../city/city3b-client.js';
import NEXUS_CITY_BG from '../assets/nexus-premium-bg.js';
import City3BPortal from './City3BPortal.jsx';
import '../styles/nexus-city-gateway.css';
import '../styles/nexus-city-premium.css';
import '../styles/passport-nexus-entry.css';

function PremiumSceneLayers() {
  return (
    <>
      <div
        className="nexus-premium-photo"
        style={{
          backgroundImage: `linear-gradient(180deg,rgba(0,6,14,.08),rgba(0,8,15,.1) 54%,rgba(0,5,10,.44)),url(${NEXUS_CITY_BG})`,
        }}
        aria-hidden="true"
      />
      <div className="nexus-premium-vignette" aria-hidden="true" />
      <div className="nexus-city-lights" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="nexus-mist nexus-mist-a" aria-hidden="true" />
      <div className="nexus-mist nexus-mist-b" aria-hidden="true" />
      <div className="nexus-water-shimmer" aria-hidden="true" />
      <div className="nexus-sky-vehicle nexus-sky-vehicle-a" aria-hidden="true"><i /></div>
      <div className="nexus-sky-vehicle nexus-sky-vehicle-b" aria-hidden="true"><i /></div>
      <div className="nexus-boat nexus-boat-a" aria-hidden="true"><span className="nexus-boat-hull" /><span className="nexus-boat-cabin" /><span className="nexus-boat-light" /><span className="nexus-boat-wake" /></div>
      <div className="nexus-boat nexus-boat-b" aria-hidden="true"><span className="nexus-boat-hull" /><span className="nexus-boat-cabin" /><span className="nexus-boat-light" /><span className="nexus-boat-wake" /></div>
    </>
  );
}

export default function NexusCityGateway({ open, onClose, reducedMotion = false }) {
  const account = useLoyalty();
  const [cityOpen, setCityOpen] = useState(false);
  const [cityState, setCityState] = useState('checking');
  const [statusNote, setStatusNote] = useState('');
  const uid = account.user?.id;
  const hasPassport = !!uid && account.passport?.userId === uid && !!account.passport?.country;

  useEffect(() => {
    if (!open) return undefined;
    setCityOpen(false);
    if (account.loading) {
      setCityState('checking');
      return undefined;
    }
    if (!uid) {
      setCityState('account-required');
      setStatusNote('Connecte ton compte 3B pour retrouver ton Passeport.');
      return undefined;
    }
    if (!hasPassport) {
      setCityState('passport-required');
      setStatusNote('Active ton Passeport 3B avant de fonder ta ville.');
      return undefined;
    }

    let live = true;
    setCityState('checking');
    city3bRequest('access', {}, uid)
      .then(result => {
        if (!live) return;
        setCityState(result?.hasCity ? 'existing' : 'ready');
        setStatusNote(result?.hasCity
          ? 'Ta Ville 3B existe déjà · accès permanent.'
          : 'Passeport validé · tu peux commencer ta ville immédiatement.');
      })
      .catch(error => {
        if (!live) return;
        setCityState('ready');
        setStatusNote(error?.message
          ? `Passeport validé · ouverture directe disponible. ${error.message}`
          : 'Passeport validé · ouverture directe disponible.');
      });
    return () => { live = false; };
  }, [open, account.loading, uid, hasPassport]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key !== 'Escape') return;
      if (cityOpen) setCityOpen(false);
      else onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, cityOpen, onClose]);

  const leaveTo = hash => {
    onClose?.();
    window.setTimeout(() => { window.location.hash = hash; }, 0);
  };

  const primaryAction = () => {
    if (account.loading || cityState === 'checking') return;
    if (!uid) {
      leaveTo('#membre');
      return;
    }
    if (!hasPassport) {
      leaveTo('#passeport');
      return;
    }
    setCityOpen(true);
  };

  if (!open) return null;
  if (cityOpen) return <City3BPortal open onClose={() => setCityOpen(false)} reducedMotion={reducedMotion} />;

  const checking = account.loading || cityState === 'checking';
  const ready = hasPassport && !checking;
  const existing = cityState === 'existing';
  const buttonLabel = checking
    ? 'VÉRIFICATION…'
    : !uid
      ? 'OUVRIR MON ESPACE MEMBRE'
      : !hasPassport
        ? 'ACTIVER MON PASSEPORT 3B'
        : existing
          ? 'ENTRER DANS MA VILLE'
          : 'CRÉER MA VILLE';

  return createPortal(
    <section className="nexus-city-gateway" data-motion={reducedMotion ? 'reduced' : 'full'} role="dialog" aria-modal="true" aria-label="Nexus 3B · Créer ma ville">
      <div className="nexus-city-shell">
        <header className="nexus-city-header">
          <div>
            <p><Sparkles size={14} /> PASSEPORT 3B · ACCÈS DIRECT</p>
            <h2>NEXUS <em>3B</em></h2>
            <span className="nexus-city-subtitle">LE PORTAIL VERS TON CITY-BUILDER 3B</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le Nexus"><X size={24} /></button>
        </header>

        <div className="nexus-solo-layout">
          <section className="nexus-city-visual nexus-city-visual-premium" aria-label="Ville 3B">
            <PremiumSceneLayers />
            <div className="nexus-energy-beam" aria-hidden="true" />
            <div className="nexus-broken-ring" aria-hidden="true"><i /><i /><i /></div>
            <div className="nexus-premium-emblem" aria-hidden="true"><span className="nexus-premium-emblem-shine" /><b>3B</b><small>INTERNATIONAL</small></div>
            <div className="nexus-hero-caption nexus-hero-caption-left" aria-hidden="true"><span>CONSTRUIRE</span><span>GÉRER</span><span>DÉVELOPPER</span></div>
            <div className="nexus-hero-caption nexus-hero-caption-right" aria-hidden="true"><span>ROUTES</span><span>QUARTIERS</span><span>VILLE</span></div>
            <div className="nexus-visual-copy">
              <span>CRÉER MA VILLE · JEU INDÉPENDANT</span>
              <strong>Ton Passeport. Ta ville.</strong>
              <small>Construis et développe ta cité sans passer par le Monde du 3B.</small>
            </div>
          </section>

          <aside className="nexus-city-panel">
            <div className="nexus-panel-glow" aria-hidden="true" />
            <p className="nexus-city-kicker">CRÉER MA VILLE</p>
            <h3>Ton jeu de construction 3B</h3>
            <p>Carte, routes, bâtiments, quartiers, services et développement urbain : ta ville possède sa propre progression, séparée du Monde du 3B.</p>

            <button type="button" className="nexus-city-primary" disabled={checking} onClick={primaryAction}>
              {ready ? <Building2 size={19} /> : <LockKeyhole size={19} />}
              <span>{buttonLabel}</span>
              <ArrowRight size={19} />
            </button>

            <div className={`nexus-unlock-card ${ready ? 'is-unlocked' : ''}`}>
              <div className="nexus-unlock-icon">{ready ? <CheckCircle2 size={24} /> : <LockKeyhole size={24} />}</div>
              <div>
                <strong>{ready ? (existing ? 'MA VILLE 3B' : 'VILLE 3B DISPONIBLE') : !uid ? 'COMPTE 3B REQUIS' : 'PASSEPORT 3B REQUIS'}</strong>
                <p>{ready
                  ? existing
                    ? 'Ta ville est accessible directement. Sa progression dépend uniquement de ton city-builder.'
                    : 'Ton Passeport suffit. Aucun Souvenir, mission, Gardien ou royaume du Monde 3B n’est nécessaire.'
                  : !uid
                    ? 'Connecte-toi pour retrouver ton identité 3B.'
                    : 'Complète ton Passeport puis reviens ici : la ville sera immédiatement jouable.'}</p>
                <small>{statusNote}</small>
              </div>
            </div>

            <button type="button" className="nexus-city-secondary" onClick={onClose}>Retour au Passeport</button>
          </aside>
        </div>

        <footer className="nexus-city-footer">
          <span>1 PASSEPORT · 1 VILLE · PROGRESSION AUTONOME</span>
          <strong>Ce n’est pas une marque. C’est un héritage.</strong>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
