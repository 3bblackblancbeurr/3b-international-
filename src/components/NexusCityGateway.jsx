import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, CheckCircle2, Globe2, LockKeyhole, Sparkles, Target, X } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { city3bRequest } from '../city/city3b-client.js';
import { cityUnlockGuide, cityUnlockGuideStorage } from '../world/city-unlock-guide.js';
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
      <div className="nexus-city-lights" aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <div className="nexus-mist nexus-mist-a" aria-hidden="true" />
      <div className="nexus-mist nexus-mist-b" aria-hidden="true" />
      <div className="nexus-water-shimmer" aria-hidden="true" />

      <div className="nexus-sky-vehicle nexus-sky-vehicle-a" aria-hidden="true"><i /></div>
      <div className="nexus-sky-vehicle nexus-sky-vehicle-b" aria-hidden="true"><i /></div>

      <div className="nexus-boat nexus-boat-a" aria-hidden="true">
        <span className="nexus-boat-hull" />
        <span className="nexus-boat-cabin" />
        <span className="nexus-boat-light" />
        <span className="nexus-boat-wake" />
      </div>
      <div className="nexus-boat nexus-boat-b" aria-hidden="true">
        <span className="nexus-boat-hull" />
        <span className="nexus-boat-cabin" />
        <span className="nexus-boat-light" />
        <span className="nexus-boat-wake" />
      </div>
    </>
  );
}

export default function NexusCityGateway({ open, onClose, reducedMotion = false }) {
  const account = useLoyalty();
  const [cityOpen, setCityOpen] = useState(false);
  const [unlockState, setUnlockState] = useState('checking');
  const [syncNote, setSyncNote] = useState('');
  const [unlockGuide, setUnlockGuide] = useState(() => cityUnlockGuide(null));
  const [accessReason, setAccessReason] = useState(null);
  const uid = account.user?.id;
  const isLoggedIn = !!uid;

  useEffect(() => {
    if (!open) return undefined;
    setCityOpen(false);
    setAccessReason(null);
    if (account.loading) {
      setUnlockState('checking');
      return undefined;
    }
    if (!uid) {
      setUnlockState('locked');
      setUnlockGuide(cityUnlockGuide(null));
      setSyncNote('Connecte ton Passeport 3B pour enregistrer le déblocage.');
      return undefined;
    }

    let live = true;
    setUnlockState('checking');
    (async () => {
      try {
        const { readLocal, loadWorld } = await import('../world/save.js');
        const local = readLocal(uid)?.data;
        const localGuide = cityUnlockGuide(local);
        if (live) {
          setUnlockGuide(localGuide);
          if (localGuide.unlocked) {
            setUnlockState('unlocked');
            setAccessReason('souvenir');
          }
        }

        const [worldResult, cityResult] = await Promise.allSettled([
          loadWorld(uid),
          city3bRequest('access', {}, uid),
        ]);
        if (!live) return;

        const worldData = worldResult.status === 'fulfilled' ? worldResult.value.data : local;
        const guide = cityUnlockGuide(worldData);
        const hasCity = cityResult.status === 'fulfilled' && cityResult.value?.hasCity === true;
        setUnlockGuide(guide);

        if (hasCity) {
          setUnlockState('unlocked');
          setAccessReason('city');
          setSyncNote('Ville 3B existante détectée · accès conservé.');
          return;
        }
        if (guide.unlocked) {
          setUnlockState('unlocked');
          setAccessReason('souvenir');
          setSyncNote(worldResult.status === 'fulfilled'
            ? worldResult.value.message || 'Souvenir vérifié sur ton compte.'
            : 'Souvenir retrouvé dans ta copie locale.');
          return;
        }

        setUnlockState('locked');
        setAccessReason(null);
        const notes = [];
        if (worldResult.status === 'fulfilled' && worldResult.value.message) notes.push(worldResult.value.message);
        if (cityResult.status === 'rejected') notes.push('Vérification de la ville indisponible');
        setSyncNote(notes.join(' · ') || 'Progression du Monde du 3B vérifiée.');
      } catch (error) {
        if (!live) return;
        setUnlockState('locked');
        setAccessReason(null);
        setSyncNote(error?.message || 'La progression du Monde du 3B n’a pas pu être vérifiée.');
      }
    })();
    return () => { live = false; };
  }, [open, account.loading, uid]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
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

  const leaveTo = (hash, options = {}) => {
    if (options.cityGuide) cityUnlockGuideStorage(true);
    onClose?.();
    window.setTimeout(() => { window.location.hash = hash; }, 0);
  };

  const primaryAction = () => {
    if (account.loading || unlockState === 'checking') return;
    if (!isLoggedIn) {
      leaveTo('#membre');
      return;
    }
    if (unlockState !== 'unlocked') {
      leaveTo('#monde-3b', { cityGuide: true });
      return;
    }
    setCityOpen(true);
  };

  if (!open) return null;
  if (cityOpen) return <City3BPortal open onClose={() => setCityOpen(false)} reducedMotion={reducedMotion} />;

  const checking = account.loading || unlockState === 'checking';
  const unlocked = isLoggedIn && unlockState === 'unlocked';
  const buttonLabel = checking
    ? 'VÉRIFICATION…'
    : !isLoggedIn
      ? 'OUVRIR MON ESPACE MEMBRE'
      : unlocked
        ? accessReason === 'city' ? 'ENTRER DANS MA VILLE' : 'CRÉER MA VILLE'
        : 'CONTINUER LA MISSION';

  return createPortal(
    <section className="nexus-city-gateway" data-motion={reducedMotion ? 'reduced' : 'full'} role="dialog" aria-modal="true" aria-label="Nexus 3B · Créer ma ville">
      <div className="nexus-city-shell">
        <header className="nexus-city-header">
          <div>
            <p><Sparkles size={14} /> PASSEPORT 3B · PORTAIL ACTIF</p>
            <h2>NEXUS <em>3B</em></h2>
            <span className="nexus-city-subtitle">LE PORTAIL VERS TA VILLE 3B</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le Nexus"><X size={24} /></button>
        </header>

        <div className="nexus-solo-layout">
          <section className="nexus-city-visual nexus-city-visual-premium" aria-label="Cercle Brisé animé autour de la ville 3B">
            <PremiumSceneLayers />
            <div className="nexus-energy-beam" aria-hidden="true" />

            <div className="nexus-broken-ring" aria-hidden="true"><i /><i /><i /></div>

            <div className="nexus-premium-emblem" aria-hidden="true">
              <span className="nexus-premium-emblem-shine" />
              <b>3B</b>
              <small>INTERNATIONAL</small>
            </div>

            <div className="nexus-hero-caption nexus-hero-caption-left" aria-hidden="true">
              <span>VISION</span><span>UNITÉ</span><span>PROGRÈS</span>
            </div>
            <div className="nexus-hero-caption nexus-hero-caption-right" aria-hidden="true">
              <span>IDÉES</span><span>TERRITOIRES</span><span>AVENIR</span>
            </div>

            <div className="nexus-visual-copy">
              <span>CERCLE BRISÉ · ROTATION ACTIVE</span>
              <strong>Une porte. Ta ville.</strong>
              <small>Le Cercle Brisé ouvre l’accès à ta cité personnelle 3B.</small>
            </div>
          </section>

          <aside className="nexus-city-panel">
            <div className="nexus-panel-glow" aria-hidden="true" />
            <p className="nexus-city-kicker">PORTAIL VILLE 3B</p>
            <h3>Crée ta ville 3B</h3>
            <p>Le Nexus est uniquement la porte d’entrée vers ta cité : construis, développe tes quartiers, expose ta collection et fais évoluer ta ville.</p>

            <button type="button" className="nexus-city-primary" disabled={checking} onClick={primaryAction}>
              {unlocked ? <Building2 size={19} /> : !isLoggedIn ? <LockKeyhole size={19} /> : <Globe2 size={19} />}
              <span>{buttonLabel}</span>
              <ArrowRight size={19} />
            </button>

            <div className={`nexus-unlock-card ${unlocked ? 'is-unlocked' : ''}`}>
              <div className="nexus-unlock-icon">{unlocked ? <CheckCircle2 size={24} /> : <Target size={24} />}</div>
              <div>
                <strong>{unlocked
                  ? accessReason === 'city' ? 'MA VILLE 3B' : 'VILLE 3B DÉBLOQUÉE'
                  : isLoggedIn ? 'VILLE 3B — VERROUILLÉE' : 'PASSEPORT 3B REQUIS'}</strong>
                <p>{unlocked
                  ? accessReason === 'city'
                    ? 'Ta Ville 3B existe déjà. Son accès est permanent et aucune mission ou mise à jour ne peut la reverrouiller.'
                    : 'Ton premier Souvenir est enregistré. Tu peux maintenant créer ta Ville 3B.'
                  : isLoggedIn
                    ? `Obtiens ton premier Souvenir pour débloquer ta ville. ${unlockGuide.title}. ${unlockGuide.detail}`
                    : 'Connecte-toi d’abord. Ton déblocage sera ensuite lié à la progression de ton compte.'}</p>
                <small>{unlocked ? 'Accès permanent' : `MISSION VILLE · ÉTAPE ${unlockGuide.step}/${unlockGuide.total} · Progression guidée`}{syncNote ? ` · ${syncNote}` : ''}</small>
              </div>
            </div>

            {!unlocked && isLoggedIn && !checking && (
              <button type="button" className="nexus-city-secondary" onClick={() => leaveTo('#monde-3b', { cityGuide: true })}>Continuer la mission dans le Monde du 3B</button>
            )}
            <button type="button" className="nexus-city-secondary" onClick={onClose}>Retour au Passeport</button>
          </aside>
        </div>

        <footer className="nexus-city-footer">
          <span>1 NEXUS · 1 VILLE · 1 HÉRITAGE</span>
          <strong>Ce n’est pas une marque. C’est un héritage.</strong>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
