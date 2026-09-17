import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, CheckCircle2, Globe2, LockKeyhole, Sparkles, Target, X } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import City3BPortal from './City3BPortal.jsx';
import '../styles/nexus-city-gateway.css';
import '../styles/passport-nexus-entry.css';

const BUILDINGS = [34,52,42,76,58,92,64,48,70,40,56];

export default function NexusCityGateway({ open, onClose, reducedMotion = false }) {
  const account = useLoyalty();
  const [cityOpen, setCityOpen] = useState(false);
  const [unlockState, setUnlockState] = useState('checking');
  const [syncNote, setSyncNote] = useState('');
  const uid = account.user?.id;
  const isLoggedIn = !!uid;

  useEffect(() => {
    if (!open) return undefined;
    setCityOpen(false);
    if (account.loading) {
      setUnlockState('checking');
      return undefined;
    }
    if (!uid) {
      setUnlockState('locked');
      setSyncNote('Connecte ton Passeport 3B pour enregistrer le déblocage.');
      return undefined;
    }

    let live = true;
    setUnlockState('checking');
    (async () => {
      try {
        const { readLocal, loadWorld } = await import('../world/save.js');
        const local = readLocal(uid)?.data;
        if (live && local?.beacons?.length) setUnlockState('unlocked');
        const result = await loadWorld(uid);
        if (!live) return;
        setUnlockState(result.data?.beacons?.length ? 'unlocked' : 'locked');
        setSyncNote(result.message || 'Progression du Monde du 3B vérifiée.');
      } catch (error) {
        if (!live) return;
        setUnlockState('locked');
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

  const leaveTo = (hash) => {
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
      leaveTo('#monde-3b');
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
        ? 'CRÉER MA VILLE 3B'
        : 'DÉBLOQUER DANS LE MONDE DU 3B';

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
          <section className="nexus-city-visual" aria-label="Cercle Brisé animé autour de la ville 3B">
            <div className="nexus-starfield" aria-hidden="true" />
            <div className="nexus-energy-beam" aria-hidden="true" />
            <div className="nexus-broken-ring" aria-hidden="true"><i /><i /><i /></div>
            <div className="nexus-city-hologram" aria-hidden="true">
              <div className="nexus-city-buildings">
                {BUILDINGS.map((height, index) => <i key={index} style={{ '--h': `${height}%`, '--delay': `${index * -.18}s` }} />)}
              </div>
              <b>3B</b>
              <span className="nexus-city-island" />
            </div>
            <div className="nexus-visual-copy">
              <span>CERCLE BRISÉ · ROTATION ACTIVE</span>
              <strong>Une porte. Ta ville.</strong>
              <small>Le Nexus ne contient plus les huit portes : elles appartiennent au Monde du 3B.</small>
            </div>
          </section>

          <aside className="nexus-city-panel">
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
                <strong>{unlocked ? 'MODE DÉBLOQUÉ' : isLoggedIn ? 'MISSION RAPIDE · 0/1' : 'PASSEPORT 3B REQUIS'}</strong>
                <p>{unlocked
                  ? 'Un Souvenir a été réveillé dans le Monde du 3B. L’accès à ta ville est activé.'
                  : isLoggedIn
                    ? 'Dans le Monde du 3B, entre dans n’importe quel pays et active un point « Éveiller le souvenir ». C’est tout.'
                    : 'Connecte-toi d’abord. Ton déblocage sera ensuite lié à la progression de ton compte.'}</p>
                <small>{unlocked ? 'Déblocage acquis' : 'Déblocage rapide'}{syncNote ? ` · ${syncNote}` : ''}</small>
              </div>
            </div>

            {!unlocked && isLoggedIn && !checking && (
              <button type="button" className="nexus-city-secondary" onClick={() => leaveTo('#monde-3b')}>Aller au Monde du 3B</button>
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
