import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Building2, CheckCircle2, Globe2, LockKeyhole, Sparkles, Target, X } from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import City3BPortal from './City3BPortal.jsx';
import '../styles/nexus-city-gateway.css';
import '../styles/nexus-city-premium.css';
import '../styles/passport-nexus-entry.css';

function PremiumCityBackdrop() {
  const towers = [
    { x: 54, y: 250, w: 48, h: 226 }, { x: 112, y: 204, w: 58, h: 272 },
    { x: 181, y: 278, w: 42, h: 198 }, { x: 232, y: 166, w: 66, h: 310 },
    { x: 308, y: 236, w: 48, h: 240 }, { x: 366, y: 112, w: 70, h: 364 },
    { x: 448, y: 48, w: 78, h: 428 }, { x: 538, y: 154, w: 66, h: 322 },
    { x: 616, y: 224, w: 46, h: 252 }, { x: 674, y: 126, w: 64, h: 350 },
    { x: 750, y: 242, w: 44, h: 234 }, { x: 806, y: 192, w: 56, h: 284 },
  ];
  return (
    <svg className="nexus-premium-city" viewBox="0 0 900 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="citySky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#071424"/><stop offset=".5" stopColor="#0d2940"/><stop offset="1" stopColor="#06101b"/></linearGradient>
        <linearGradient id="cityGlass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#07131f"/><stop offset=".28" stopColor="#0b5278"/><stop offset=".55" stopColor="#102a42"/><stop offset=".78" stopColor="#b88b36"/><stop offset="1" stopColor="#091523"/></linearGradient>
        <linearGradient id="cityGold" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#8a6425"/><stop offset=".5" stopColor="#ffe6a2"/><stop offset="1" stopColor="#9d712a"/></linearGradient>
        <linearGradient id="cityWater" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0e567a" stopOpacity=".55"/><stop offset="1" stopColor="#02070d" stopOpacity=".96"/></linearGradient>
        <radialGradient id="cityAura"><stop stopColor="#54dbff" stopOpacity=".72"/><stop offset=".35" stopColor="#168cc9" stopOpacity=".22"/><stop offset="1" stopColor="#06101a" stopOpacity="0"/></radialGradient>
        <pattern id="cityWindows" width="12" height="14" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="3" height="5" rx="1" fill="#77e6ff" opacity=".58"/><rect x="7" y="2" width="3" height="5" rx="1" fill="#e4ba62" opacity=".5"/></pattern>
        <filter id="cityGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="citySoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>
      </defs>

      <rect width="900" height="620" fill="url(#citySky)"/>
      <ellipse cx="450" cy="298" rx="370" ry="215" fill="url(#cityAura)" opacity=".45"/>
      <path d="M0 330 Q110 245 210 292 T405 268 T610 284 T900 236 V380 H0Z" fill="#08121c" opacity=".86"/>
      <path d="M0 357 Q110 278 215 319 T410 299 T615 316 T900 272" fill="none" stroke="#3baed8" strokeOpacity=".14" strokeWidth="2"/>

      <g className="nexus-premium-city-towers">
        {towers.map((t, index) => (
          <g key={index} transform={`translate(${t.x} ${t.y})`}>
            <rect width={t.w} height={t.h} rx="4" fill="url(#cityGlass)" stroke={index % 3 === 0 ? '#d2a54e' : '#3bbde9'} strokeOpacity=".52"/>
            <rect x="6" y="12" width={Math.max(8, t.w - 12)} height={Math.max(20, t.h - 22)} rx="2" fill="url(#cityWindows)" opacity={index % 2 ? .5 : .66}/>
            <path d={`M${t.w * .12} ${t.h} L${t.w * .34} 0 L${t.w * .48} 0 L${t.w * .28} ${t.h}Z`} fill="#71dff7" opacity=".09"/>
            <path d={`M${t.w * .62} ${t.h} L${t.w * .82} 0`} stroke="#e5b95d" strokeOpacity=".36"/>
            <path d={`M${t.w/2} 0 L${t.w/2} -${18 + (index%4)*8}`} stroke={index % 2 ? '#6fe9ff' : '#f0c96e'} strokeWidth="2" filter="url(#cityGlow)"/>
            {index === 6 && <><rect x="8" y="70" width={t.w-16} height="46" rx="6" fill="#051422" stroke="#d9af54" strokeOpacity=".7"/><text x={t.w/2} y="102" textAnchor="middle" fontSize="22" fontWeight="800" fill="#e5c36d">3B</text></>}
          </g>
        ))}
      </g>

      <g opacity=".9">
        <path d="M88 422 Q450 326 812 422" fill="none" stroke="#0c2030" strokeWidth="34"/>
        <path d="M88 422 Q450 326 812 422" fill="none" stroke="url(#cityGold)" strokeWidth="4"/>
        <path d="M128 455 Q450 378 772 455" fill="none" stroke="#163349" strokeWidth="22"/>
        <path d="M128 455 Q450 378 772 455" fill="none" stroke="#58dafa" strokeOpacity=".65" strokeWidth="2"/>
        <path d="M184 396 Q260 350 340 372" fill="none" stroke="#e3b95f" strokeWidth="3" opacity=".7"/>
        <path d="M560 372 Q640 350 716 396" fill="none" stroke="#e3b95f" strokeWidth="3" opacity=".7"/>
      </g>

      <path d="M0 470 C145 438 246 466 338 452 C430 438 492 444 573 462 C675 485 764 446 900 468 V620 H0Z" fill="url(#cityWater)"/>
      <g opacity=".34" filter="url(#citySoft)">
        <path d="M450 462 L392 620 H508Z" fill="#43d7ff"/>
        <path d="M385 468 L344 620 H382 L418 469Z" fill="#d7ad50" opacity=".55"/>
        <path d="M520 470 L554 620 H594 L550 465Z" fill="#52d9ff" opacity=".45"/>
      </g>

      <g className="nexus-premium-platform">
        <ellipse cx="450" cy="466" rx="206" ry="50" fill="#02080d" stroke="#d4aa52" strokeWidth="5"/>
        <ellipse cx="450" cy="456" rx="185" ry="38" fill="#061c2a" stroke="#4fdaf9" strokeOpacity=".75" strokeWidth="2"/>
        <ellipse cx="450" cy="454" rx="132" ry="23" fill="#082f44" stroke="#dfb657" strokeOpacity=".75"/>
        <ellipse cx="450" cy="453" rx="76" ry="12" fill="#1d7294" opacity=".48" filter="url(#cityGlow)"/>
      </g>

      <g opacity=".72">
        <path d="M70 514 C186 476 252 512 352 492" fill="none" stroke="#5edfff" strokeWidth="2"/>
        <path d="M548 492 C650 512 716 476 830 514" fill="none" stroke="#e0b75e" strokeWidth="2"/>
        <path d="M135 530 C245 504 292 526 365 512" fill="none" stroke="#d9ad4d" strokeOpacity=".55"/>
        <path d="M535 512 C608 526 656 504 766 530" fill="none" stroke="#49d8ff" strokeOpacity=".55"/>
      </g>

      <g opacity=".55">
        <circle cx="116" cy="164" r="2" fill="#d7f9ff"/><circle cx="214" cy="118" r="1.5" fill="#dcb75d"/><circle cx="322" cy="86" r="2" fill="#65dcff"/><circle cx="608" cy="106" r="2" fill="#e2bb60"/><circle cx="748" cy="154" r="1.5" fill="#86e9ff"/>
        <path d="M118 178 l42 -8 l-19 13 z" fill="#57d9ff"/><path d="M714 188 l48 8 l-22 -15 z" fill="#e1ba61"/><path d="M264 140 l34 -5 l-16 11 z" fill="#e1ba61"/>
      </g>
    </svg>
  );
}

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
          <section className="nexus-city-visual nexus-city-visual-premium" aria-label="Cercle Brisé animé autour de la ville 3B">
            <div className="nexus-space-nebula" aria-hidden="true" />
            <div className="nexus-starfield" aria-hidden="true" />
            <PremiumCityBackdrop />
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
