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
  const [checking, setChecking] = useState(false);
  const [hasCity, setHasCity] = useState(false);
  const [note, setNote] = useState('');
  const uid = account.user?.id;
  const hasPassport = !!uid && account.passport?.userId === uid && !!account.passport?.country;

  useEffect(() => {
    if (!open) return undefined;
    setCityOpen(false);
    setHasCity(false);
    setNote('');
    if (account.loading || !uid || !hasPassport) return undefined;
    let live = true;
    setChecking(true);
    city3bRequest('access', {}, uid)
      .then(result => {
        if (!live) return;
        setHasCity(result?.hasCity === true);
        setNote(result?.hasCity ? 'Ta Ville 3B existe déjà · accès direct.' : 'Passeport valide · tu peux fonder ta ville maintenant.');
      })
      .catch(error => {
        if (!live) return;
        setNote(error?.message || 'Vérification de la ville momentanément indisponible.');
      })
      .finally(() => { if (live) setChecking(false); });
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
    if (account.loading || checking) return;
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

  const buttonLabel = account.loading || checking
    ? 'VÉRIFICATION…'
    : !uid
      ? 'OUVRIR MON ESPACE MEMBRE'
      : !hasPassport
        ? 'ACTIVER MON PASSEPORT 3B'
        : hasCity
          ? 'ENTRER DANS MA VILLE'
          : 'CRÉER MA VILLE';

  return createPortal(
    <section className="nexus-city-gateway" data-motion={reducedMotion ? 'reduced' : 'full'} role="dialog" aria-modal="true" aria-label="Passeport 3B · Créer ma ville">
      <div className="nexus-city-shell">
        <header className="nexus-city-header">
          <div>
            <p><Sparkles size={14} /> PASSEPORT 3B · PORTAIL VILLE</p>
            <h2>NEXUS <em>3B</em></h2>
            <span className="nexus-city-subtitle">ACCÈS DIRECT À CRÉER MA VILLE</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le portail"><X size={24} /></button>
        </header>

        <div className="nexus-solo-layout">
          <section className="nexus-city-visual nexus-city-visual-premium" aria-label="Ville 3B">
            <PremiumSceneLayers />
            <div className="nexus-energy-beam" aria-hidden="true" />
            <div className="nexus-broken-ring" aria-hidden="true"><i /><i /><i /></div>
            <div className="nexus-premium-emblem" aria-hidden="true"><span className="nexus-premium-emblem-shine" /><b>3B</b><small>INTERNATIONAL</small></div>
            <div className="nexus-hero-caption nexus-hero-caption-left" aria-hidden="true"><span>CONSTRUIRE</span><span>GÉRER</span><span>AGRANDIR</span></div>
            <div className="nexus-hero-caption nexus-hero-caption-right" aria-hidden="true"><span>ROUTES</span><span>QUARTIERS</span><span>VILLE</span></div>
            <div className="nexus-visual-copy"><span>CITY BUILDER 3B</span><strong>Ta ville. Tes choix.</strong><small>Construis et développe une ville indépendante du Monde du 3B.</small></div>
          </section>

          <aside className="nexus-city-panel">
            <div className="nexus-panel-glow" aria-hidden="true" />
            <p className="nexus-city-kicker">CRÉER MA VILLE</p>
            <h3>Ton city-builder 3B</h3>
            <p>Depuis ton Passeport, entre directement dans ta ville : routes, bâtiments, quartiers, services et progression urbaine.</p>

            <button type="button" className="nexus-city-primary" disabled={account.loading || checking} onClick={primaryAction}>
              {hasPassport ? <Building2 size={19} /> : <LockKeyhole size={19} />}
              <span>{buttonLabel}</span>
              <ArrowRight size={19} />
            </button>

            <div className={`nexus-unlock-card ${hasPassport ? 'is-unlocked' : ''}`}>
              <div className="nexus-unlock-icon">{hasPassport ? <CheckCircle2 size={24} /> : <LockKeyhole size={24} />}</div>
              <div>
                <strong>{hasPassport ? (hasCity ? 'MA VILLE 3B' : 'VILLE 3B DISPONIBLE') : 'PASSEPORT 3B REQUIS'}</strong>
                <p>{hasPassport
                  ? (hasCity
                    ? 'Ta ville est accessible directement. Sa progression dépend uniquement de ton gameplay de construction.'
                    : 'Ton Passeport est valide. Tu peux fonder ta ville sans mission, Souvenir ou progression dans le Monde du 3B.')
                  : 'Active d’abord ton Passeport 3B pour accéder au city-builder.'}</p>
                <small>{hasPassport ? 'ACCÈS DIRECT · PROGRESSION VILLE INDÉPENDANTE' : 'IDENTITÉ 3B REQUISE'}{note ? ` · ${note}` : ''}</small>
              </div>
            </div>

            <button type="button" className="nexus-city-secondary" onClick={onClose}>Retour au Passeport</button>
          </aside>
        </div>

        <footer className="nexus-city-footer">
          <span>1 PASSEPORT · 3 VILLES · PROGRESSION INDÉPENDANTE</span>
          <strong>Ce n’est pas une marque. C’est un héritage.</strong>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
