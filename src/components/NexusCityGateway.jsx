import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, Sparkles, X } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import { NexusCinemaHall, NexusTransitDecor } from './NexusCinema.jsx';
import { NEXUS_WORLDS } from './nexus-worlds.js';
import City3BPortal from './City3BPortal.jsx';
import '../styles/nexus-city-gateway.css';

export default function NexusCityGateway({ open, onClose, reducedMotion = false, goTo }) {
  const account = useLoyalty();
  const [selected, setSelected] = useState('FR');
  const [stage, setStage] = useState('hall');
  const [cityOpen, setCityOpen] = useState(false);
  const isLoggedIn = !!account.user?.id;

  useEffect(() => {
    if (!open) return undefined;
    setSelected('FR');
    setCityOpen(false);
    setStage(reducedMotion ? 'hall' : 'transit');
    if (reducedMotion) return undefined;
    const timer = window.setTimeout(() => setStage('hall'), 1150);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

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

  const world = useMemo(
    () => NEXUS_WORLDS.find((item) => item.code === selected) || NEXUS_WORLDS[0],
    [selected],
  );

  const enterPersonalSpace = () => {
    if (account.loading) return;
    if (!isLoggedIn) {
      onClose?.();
      goTo?.('member');
      return;
    }
    setCityOpen(true);
  };

  if (!open) return null;

  if (cityOpen) {
    return <City3BPortal open onClose={() => setCityOpen(false)} reducedMotion={reducedMotion} />;
  }

  return createPortal(
    <section className="nexus-city-gateway" role="dialog" aria-modal="true" aria-label="Nexus 3B">
      {stage === 'transit' ? (
        <div className="nexus-city-transit">
          <NexusTransitDecor />
          <div className="nexus-city-transit-copy">
            <span>PROTOCOLE PASSEPORT</span>
            <strong>NEXUS 3B</strong>
            <small>Synchronisation du Cercle Brisé…</small>
          </div>
        </div>
      ) : (
        <div className="nexus-city-shell">
          <header className="nexus-city-header">
            <div>
              <p><Sparkles size={14} /> PASSEPORT 3B · PORTAIL ACTIF</p>
              <h2>NEXUS <em>3B</em></h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer le Nexus"><X size={22} /></button>
          </header>

          <div className="nexus-city-layout">
            <div className="nexus-city-hall">
              <NexusCinemaHall
                selected={selected}
                onSelect={setSelected}
                doors={[]}
                originEnabled={false}
                economy={false}
              />
            </div>

            <aside className="nexus-city-panel" style={{ '--nexus-selected': world.color }}>
              <p className="nexus-city-kicker">PORTE {world.number} · {world.value.toUpperCase()}</p>
              <h3>{world.country}</h3>
              <p>{world.description}</p>
              <dl>
                <div><dt>Gardien</dt><dd>{world.guardian}</dd></div>
                <div><dt>Valeur</dt><dd>{world.value}</dd></div>
              </dl>

              <div className="nexus-city-divider" />
              <p className="nexus-city-kicker">TON ESPACE PERSONNEL</p>
              <h4>{isLoggedIn ? 'Crée ta ville 3B' : 'Connecte ton Passeport 3B'}</h4>
              <p>{isLoggedIn
                ? 'Depuis le Nexus, ouvre ta cité permanente, construis tes bâtiments, développe tes huit quartiers et expose ta collection.'
                : 'Ta ville 3B est liée à ton compte. Ouvre ton espace membre pour te connecter ou créer ton compte, puis reviens dans le Passeport.'}</p>
              <button type="button" className="nexus-city-primary" disabled={account.loading} onClick={enterPersonalSpace}>
                <Building2 size={18} />
                <span>{account.loading ? 'VÉRIFICATION…' : isLoggedIn ? 'CRÉER MA VILLE 3B' : 'OUVRIR MON ESPACE MEMBRE'}</span>
                <ArrowRight size={18} />
              </button>
              <button type="button" className="nexus-city-secondary" onClick={onClose}>Retour au Passeport</button>
            </aside>
          </div>

          <footer className="nexus-city-footer">
            <span>8 PORTES · 8 VALEURS · 1 HÉRITAGE</span>
            <strong>Ce n’est pas une marque. C’est un héritage.</strong>
          </footer>
        </div>
      )}
    </section>,
    document.body,
  );
}
