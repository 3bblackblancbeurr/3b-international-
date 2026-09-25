import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Copy, Globe2, Play, RefreshCw, Shield, Shirt, Trophy, UserRound, Users, Wifi, X, Zap,
} from 'lucide-react';
import { useLoyalty } from '../loyalty/LoyaltyContext.jsx';
import {
  BOOT_MATERIALS, BOOT_PRESETS, BOOT_STUDS, COMPETITIONS, KEEPER_POWERS,
  KIT_COLLARS, KIT_SLEEVES, PENALTY_COUNTRIES, PLAYER_STYLES, SHIRT_COLORS,
  SHORTS_CUTS, SOCKS_STYLES, careerTierFor, countryById, createDefaultPenaltyProfile,
  normalizePenaltyProfile,
} from './penaltyRush/config.js';
import {
  interpretAttackGesture, interpretKeeperGesture, remainingPossessionSeconds,
} from './penaltyRush/core.js';
import {
  penaltyRequest, rememberPenaltyRoom, rememberedPenaltyRoom, subscribePenaltyRoom,
} from './penaltyRush/online.js';
import {PointerGesture} from './touchControls.js';
import { unlockPenaltyAudio } from './penaltyRush/audio.js';
import './penaltyRush.css';
import './penaltyRush3d.css';

const PenaltyRushArena3D = lazy(() => import('./penaltyRush/PenaltyRushArena3D.jsx'));
const PenaltyTraining = lazy(() => import('./penaltyRush/PenaltyTraining.jsx'));

const NAV = [
  ['play', Play, 'Jouer'],
  ['player', UserRound, 'Mon joueur'],
  ['club', Users, 'Club'],
  ['international', Globe2, 'International'],
  ['career', Trophy, 'Carrière'],
];

function powerIcon(id) {
  if (id === 'read') return '◉';
  if (id === 'anchor') return '⬢';
  if (id === 'phantom') return '◇';
  return '≋';
}

function phaseLabel(phase) {
  return {
    'first-half': '1ÈRE PÉRIODE',
    'second-half': '2E PÉRIODE',
    'golden-duel': 'DUEL D’OR',
    finished: 'TERMINÉ',
  }[phase] || 'EN LIGNE';
}

export default function PenaltyRush({ onClose, onAccount }) {
  const account = useLoyalty();
  const [tab, setTab] = useState('play');
  const [profile, setProfile] = useState(() => createDefaultPenaltyProfile(account));
  const [snapshot, setSnapshot] = useState(null);
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [connection, setConnection] = useState('sync');
  const [privateCode, setPrivateCode] = useState('');
  const [training, setTraining] = useState(null);
  const pollRef = useRef(null);
  const tickInFlight = useRef(false);

  const user = account.user;
  const rating = snapshot?.rating || { rating: 1000, games: 0, wins: 0, losses: 0 };
  const tier = careerTierFor(snapshot?.career?.reputation || 0);

  async function request(action, body = {}, options = {}) {
    if (!user) throw new Error('Compte 3B requis.');
    if (!options.silent) setBusy(true);
    try {
      const data = await penaltyRequest(action, body);
      if (data.profile) setProfile(normalizePenaltyProfile(data.profile, account));
      if (data.snapshot) setSnapshot(data.snapshot);
      if (data.room !== undefined) {
        setRoom(data.room);
        rememberPenaltyRoom(data.room?.id || null);
      }
      if (data.message) setNotice(data.message);
      return data;
    } catch (error) {
      if (!options.silent) setNotice(error.message || 'Action impossible.');
      throw error;
    } finally {
      if (!options.silent) setBusy(false);
    }
  }

  async function syncRoom(roomId = room?.id, silent = true) {
    if (!roomId) return;
    try {
      setConnection('sync');
      const data = await request('room', { room: roomId }, { silent });
      if (data.room) setConnection('online');
    } catch {
      setConnection('error');
    }
  }

  useEffect(() => {
    if (!user) return;
    let live = true;
    setBusy(true);
    penaltyRequest('status', { room: rememberedPenaltyRoom() })
      .then((data) => {
        if (!live) return;
        if (data.profile) setProfile(normalizePenaltyProfile(data.profile, account));
        if (data.snapshot) setSnapshot(data.snapshot);
        if (data.room) {
          setRoom(data.room);
          rememberPenaltyRoom(data.room.id);
        }
        setConnection('online');
      })
      .catch((error) => {
        if (live) setNotice(error.message || 'Penalty Rush est momentanément indisponible.');
      })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!room?.id) return;
    const unsubscribe = subscribePenaltyRoom(
      room.id,
      () => syncRoom(room.id, true),
      (status) => setConnection(status === 'SUBSCRIBED' ? 'online' : status === 'CHANNEL_ERROR' ? 'error' : 'sync'),
    );
    pollRef.current = window.setInterval(() => {
      if (document.hidden || tickInFlight.current) return;
      tickInFlight.current = true;
      request('tick', { room: room.id }, { silent: true })
        .catch(() => {})
        .finally(() => { tickInFlight.current = false; });
    }, 1000);
    return () => {
      unsubscribe();
      clearInterval(pollRef.current);
      pollRef.current = null;
      tickInFlight.current = false;
    };
  }, [room?.id]);

  if (!user && training) return <div className="penalty-shell" role="dialog" aria-modal="true" aria-label="Entraînement Penalty Rush"><header className="penalty-topbar"><strong>3B PENALTY RUSH · ENTRAÎNEMENT</strong><button className="penalty-icon" onClick={onClose} aria-label="Fermer"><X size={20}/></button></header><Suspense fallback={<p>Chargement du terrain…</p>}><PenaltyTraining key={training} role={training} profile={profile} onExit={() => setTraining(null)}/></Suspense></div>;
  if (!user) {
    return (
      <div className="penalty-shell" role="dialog" aria-modal="true" aria-label="3B Penalty Rush">
        <header className="penalty-topbar">
          <div><small>JEUX 3B · ENTRAÎNEMENT</small><strong>3B PENALTY RUSH</strong></div>
          <button className="penalty-icon" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </header>
        <main className="penalty-login">
          <div className="penalty-crown">3B</div>
          <span>DUEL FOOT · 1V1 · ONLINE</span>
          <h1>Ton joueur. Ton club. Ton pays.</h1>
          <p>Entraîne-toi seul contre l’IA. Connecte-toi pour les matchs en ligne, le classement et la carrière.</p>
          <div className="penalty-training-actions"><button className="penalty-primary" onClick={() => setTraining('attacker')}>Attaquant contre IA</button><button className="penalty-secondary" onClick={() => setTraining('keeper')}>Gardien contre IA</button></div>
          <button className="penalty-primary" onClick={onAccount}>Connexion / inscription</button>
          <button className="penalty-secondary" onClick={onClose}>Retour aux Jeux 3B</button>
        </main>
      </div>
    );
  }

  return (
    <div className="penalty-shell" role="dialog" aria-modal="true" aria-label="3B Penalty Rush">
      <header className="penalty-topbar">
        <div>
          <small>JEUX 3B · ENTRAÎNEMENT ET MULTIJOUEUR</small>
          <strong>3B PENALTY RUSH</strong>
        </div>
        <div className="penalty-top-actions">
          <span className="penalty-connection" data-state={connection}><Wifi size={14} /> {connection}</span>
          {room?.id && <button className="penalty-icon" onClick={() => syncRoom(room.id, false)} aria-label="Resynchroniser"><RefreshCw size={17} /></button>}
          <button className="penalty-icon" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
      </header>

      {notice && <div className="penalty-notice" role="status">{notice}</div>}

      {training && !room ? <Suspense fallback={<p>Chargement du terrain…</p>}><PenaltyTraining key={training} role={training} profile={profile} onExit={() => setTraining(null)} /></Suspense>
      : room?.status === 'active' || room?.status === 'finished'
        ? <MatchRoom room={room} profile={profile} busy={busy} request={request} onLeave={async () => {
            const id = room.id;
            try {
              await request('leave', { room: id });
              await request('status', {});
            } catch {}
          }} />
        : (
          <>
            <nav className="penalty-nav" aria-label="Penalty Rush">
              {NAV.map(([id, Icon, label]) => (
                <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                  <Icon size={16} /><span>{label}</span>
                </button>
              ))}
            </nav>
            <main className="penalty-main">
              {room?.status === 'waiting'
                ? <Lobby room={room} busy={busy} request={request} onBack={() => request('leave', { room: room.id }).catch(() => {})} />
                : tab === 'play'
                  ? <PlayHome busy={busy} profile={profile} rating={rating} tier={tier} code={privateCode} setCode={setPrivateCode} request={request} onTraining={setTraining} />
                  : tab === 'player'
                    ? <PlayerStudio profile={profile} rating={rating} setProfile={setProfile} busy={busy} onSave={() => request('profile.save', { profile }).catch(() => {})} />
                    : tab === 'club'
                      ? <ClubPanel snapshot={snapshot} profile={profile} busy={busy} request={request} />
                      : tab === 'international'
                        ? <InternationalPanel snapshot={snapshot} profile={profile} busy={busy} request={request} />
                        : <CareerPanel snapshot={snapshot} rating={rating} tier={tier} profile={profile} />}
            </main>
          </>
        )}
    </div>
  );
}

function PlayHome({ busy, profile, rating, tier, code, setCode, request, onTraining }) {
  const country = countryById(profile.countryId);
  return (
    <div className="penalty-play-home">
      <section className="penalty-hero">
        <div className="penalty-hero-copy">
          <span className="penalty-kicker">PLACEMENT → RYTHME → LECTURE → FEINTE → FRAPPE</span>
          <h1>Un duel de football pensé pour deux pouces.</h1>
          <p>15 secondes par possession. Trois attaques chacun. Puis inversion des rôles. En cas d’égalité, Duel d’Or.</p>
          <div className="penalty-profile-line">
            <span>{country.flag}</span><b>{profile.displayName}</b><small>{tier.label} · {rating.rating} Elo</small>
          </div>
        </div>
        <div className="penalty-hero-pitch" aria-hidden="true">
          <span className="penalty-player-dot">10</span>
          <span className="penalty-ball-dot">3B</span>
          <span className="penalty-goal"><i /></span>
        </div>
      </section>

      <section className="penalty-mode-grid">
        <article>
          <span className="penalty-kicker">ENTRAÎNEMENT · SOLO</span>
          <h2>Jouer contre l’IA</h2>
          <p>Travaille ta frappe contre un gardien IA ou protège toute la cage face à un tireur IA. Sans classement et sans attente.</p>
          <div className="penalty-training-actions"><button className="penalty-primary" onClick={() => onTraining('attacker')}>Jouer attaquant</button><button className="penalty-secondary" onClick={() => onTraining('keeper')}>Jouer gardien</button></div>
        </article>
        <article>
          <span className="penalty-kicker">RAPIDE · 1V1</span>
          <h2>Match immédiat</h2>
          <p>Matchmaking sans enjeu de classement. Même gameplay, même carrière, idéal pour apprendre un adversaire réel.</p>
          <button className="penalty-primary" disabled={busy} onClick={() => request('queue', { mode: 'quick' }).catch(() => {})}><Play size={17} /> Trouver un joueur</button>
        </article>
        <article>
          <span className="penalty-kicker">CLASSÉ · SAISON</span>
          <h2>Gravir le classement</h2>
          <p>Elo, forme récente, pression et résultats alimentent ton classement national et le radar des sélections.</p>
          <button className="penalty-primary" disabled={busy} onClick={() => request('queue', { mode: 'ranked' }).catch(() => {})}><Trophy size={17} /> Jouer classé</button>
        </article>
        <article>
          <span className="penalty-kicker">SALON PRIVÉ</span>
          <h2>Défier un ami</h2>
          <p>Crée un code à six caractères, partage-le, puis joue avec les mêmes règles compétitives.</p>
          <div className="penalty-inline-actions">
            <button className="penalty-secondary" disabled={busy} onClick={() => request('create', {}).catch(() => {})}>Créer</button>
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6))} placeholder="CODE 3B" aria-label="Code de salon" />
            <button className="penalty-secondary" disabled={busy || code.length !== 6} onClick={() => request('join', { code }).catch(() => {})}>Rejoindre</button>
          </div>
        </article>
      </section>

      <section className="penalty-control-principle">
        <div><b>POUCE GAUCHE</b><span>Déplacement · changement de rythme · ralentissement naturel</span></div>
        <div><b>POUCE DROIT</b><span>Gestes contextuels · feinte · crochet · frappe · plongeon</span></div>
        <strong>Pas de rangée de boutons. Le terrain reste lisible.</strong>
      </section>
    </div>
  );
}

function PlayerStudio({ profile, rating, setProfile, busy, onSave }) {
  const country = countryById(profile.countryId);
  function patch(key, value) { setProfile((current) => ({ ...current, [key]: value })); }
  function patchNested(key, child, value) {
    setProfile((current) => ({ ...current, [key]: { ...current[key], [child]: value } }));
  }
  function togglePower(id) {
    setProfile((current) => {
      const has = current.keeperPowers.includes(id);
      const next = has ? current.keeperPowers.filter((power) => power !== id) : [...current.keeperPowers, id].slice(-2);
      return { ...current, keeperPowers: next.length ? next : current.keeperPowers };
    });
  }
  return (
    <div className="penalty-studio">
      <section className="penalty-player-card" style={{ '--shirt': profile.kit.shirtPrimary, '--trim': profile.kit.shirtSecondary }}>
        <div className="penalty-avatar-shirt"><span>3B</span><strong>{profile.shirtNumber}</strong><small>{profile.shirtName || '3B'}</small></div>
        <div><span>{country.flag}</span><h2>{profile.displayName}</h2><p>{PLAYER_STYLES[profile.styleId]?.name} · {profile.clubName || 'Sans club'}</p></div>
      </section>

      <section className="penalty-form-grid">
        <article>
          <span className="penalty-kicker">IDENTITÉ</span><h3>Ton joueur</h3>
          <label>Prénom / pseudo<input value={profile.displayName} maxLength={24} onChange={(e) => patch('displayName', e.target.value)} /></label>
          <label>Nom sur le maillot<input value={profile.shirtName} maxLength={14} onChange={(e) => patch('shirtName', e.target.value.toUpperCase())} /></label>
          <label>Numéro<input type="number" min="1" max="99" value={profile.shirtNumber} onChange={(e) => patch('shirtNumber', e.target.value)} /></label>
          <label>Pays<select value={profile.countryId} disabled={(rating?.games || 0) > 0} onChange={(e) => patch('countryId', e.target.value)}>{PENALTY_COUNTRIES.map((c) => <option value={c.id} key={c.id}>{c.flag} {c.name}</option>)}</select></label>
          {(rating?.games || 0) > 0 && <small className="penalty-field-note">Pays de carrière verrouillé après ton premier duel officiel.</small>}
          <label>Club<span className="penalty-readonly-field">{profile.clubName || 'Sans club · rejoins-en un dans l’onglet Club'}</span></label>
        </article>

        <article>
          <span className="penalty-kicker">STYLE DE JEU</span><h3>Un profil, aucun pay-to-win</h3>
          <div className="penalty-style-list">{Object.values(PLAYER_STYLES).map((style) => (
            <button type="button" key={style.id} aria-pressed={profile.styleId === style.id} onClick={() => patch('styleId', style.id)}>
              <b>{style.name}</b><small>{style.description}</small>
            </button>
          ))}</div>
        </article>

        <article>
          <span className="penalty-kicker">TENUE</span><h3>Couleurs & textile</h3>
          {[
            ['shirtPrimary', 'Maillot'],
            ['shirtSecondary', 'Détails'],
            ['shorts', 'Short'],
            ['socks', 'Chaussettes'],
          ].map(([key, label]) => <div className="penalty-color-row" key={key}><span>{label}</span><div>{SHIRT_COLORS.map((color) => <button key={color} type="button" aria-label={label + ' ' + color} aria-pressed={profile.kit[key] === color} style={{ '--swatch': color }} onClick={() => patchNested('kit', key, color)} />)}</div></div>)}
          <label>Motif du maillot<select value={profile.kit.pattern} onChange={(e) => patchNested('kit', 'pattern', e.target.value)}>
            <option value="clean">Épuré</option><option value="stripe">Bandes</option><option value="split">Bicolore</option><option value="gradient">Dégradé</option><option value="matrix">Matrix discret</option>
          </select></label>
          <label>Manches<select value={profile.kit.sleeves || 'short'} onChange={(e) => patchNested('kit', 'sleeves', e.target.value)}>{KIT_SLEEVES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Col<select value={profile.kit.collar || 'v'} onChange={(e) => patchNested('kit', 'collar', e.target.value)}>{KIT_COLLARS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Coupe du short<select value={profile.kit.shortsCut || 'classic'} onChange={(e) => patchNested('kit', 'shortsCut', e.target.value)}>{SHORTS_CUTS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Hauteur des chaussettes<select value={profile.kit.socksStyle || 'high'} onChange={(e) => patchNested('kit', 'socksStyle', e.target.value)}>{SOCKS_STYLES.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Chaussures<select value={profile.boots.preset} onChange={(e) => patchNested('boots', 'preset', e.target.value)}>{BOOT_PRESETS.map((boot) => <option value={boot.id} key={boot.id}>{boot.name}</option>)}</select></label>
          <label>Matière<select value={profile.boots.material || 'synthetic'} onChange={(e) => patchNested('boots', 'material', e.target.value)}>{BOOT_MATERIALS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Type de crampons<select value={profile.boots.studs || 'mixed'} onChange={(e) => patchNested('boots', 'studs', e.target.value)}>{BOOT_STUDS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Signature sur la chaussure<input value={profile.boots.signature || ''} maxLength={8} placeholder="NOM / 3B" onChange={(e) => patchNested('boots', 'signature', e.target.value.toUpperCase())} /></label>
          {[
            ['upper', 'Chaussure'],
            ['sole', 'Semelle'],
            ['laces', 'Lacets'],
          ].map(([key, label]) => <div className="penalty-color-row" key={key}><span>{label}</span><div>{SHIRT_COLORS.map((color) => <button key={color} type="button" aria-label={label + ' ' + color} aria-pressed={profile.boots[key] === color} style={{ '--swatch': color }} onClick={() => patchNested('boots', key, color)} />)}</div></div>)}
          <label>Célébration<select value={profile.celebration} onChange={(e) => patch('celebration', e.target.value)}>
            <option value="calme">Calme</option><option value="crown">Couronne 3B</option><option value="respect">Respect</option><option value="matrix">Matrix</option>
          </select></label>
          <small className="penalty-field-note">Toutes ces options sont visuelles : aucune tenue, chaussure, matière ou signature ne donne un bonus de gameplay.</small>
        </article>

        <article>
          <span className="penalty-kicker">GARDIEN</span><h3>Deux pouvoirs maximum</h3>
          <div className="penalty-power-list">{Object.values(KEEPER_POWERS).map((power) => (
            <button type="button" key={power.id} aria-pressed={profile.keeperPowers.includes(power.id)} onClick={() => togglePower(power.id)}>
              <i>{powerIcon(power.id)}</i><span><b>{power.name}</b><small>{power.description}</small><em>{power.drawback}</em></span>
            </button>
          ))}</div>
        </article>
      </section>
      <button className="penalty-primary penalty-save" disabled={busy || profile.keeperPowers.length !== 2} onClick={onSave}>Enregistrer mon joueur</button>
    </div>
  );
}

function ClubPanel({ snapshot, profile, busy, request }) {
  const club = snapshot?.club;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [colors, setColors] = useState({ primary:'#08090b', secondary:'#d8b35e' });
  return (
    <section className="penalty-panel-page">
      <span className="penalty-kicker">CARRIÈRE CLUB</span><h1>Gagner seul. Construire ensemble.</h1>
      <p>Les matchs restent 1v1, mais les clubs réunissent plusieurs résultats dans des rencontres collectives. Cinq duels peuvent composer une confrontation de club.</p>
      {club ? (
        <div className="penalty-big-card" style={{ '--club-primary':club.colors?.primary || '#08090b', '--club-secondary':club.colors?.secondary || '#d8b35e' }}>
          <span className="penalty-club-crest">3B</span>
          <div className="penalty-club-summary">
            <h2>{club.name}</h2><p>{club.role} · {club.members || 1} membre(s) · code {club.code}</p><small>Couleurs officielles du club</small>
            <div className="penalty-club-manage">
              <button className="penalty-copy" type="button" onClick={() => navigator.clipboard?.writeText(club.code).catch(() => {})}><Copy size={13}/> Copier le code</button>
              {club.role === 'owner'
                ? <button className="penalty-danger" type="button" disabled={busy} onClick={() => { if (window.confirm('Dissoudre définitivement ce club ?')) request('club.disband', {}).catch(() => {}); }}>Dissoudre</button>
                : <button className="penalty-secondary" type="button" disabled={busy} onClick={() => { if (window.confirm('Quitter ce club ?')) request('club.leave', {}).catch(() => {}); }}>Quitter</button>}
            </div>
          </div>
        </div>
      ) : (
        <div className="penalty-club-actions">
          <article>
            <h3>Créer un club</h3>
            <input value={name} maxLength={40} placeholder="Nom du club" onChange={(e) => setName(e.target.value)} />
            <div className="penalty-color-row"><span>Principale</span><div>{SHIRT_COLORS.map((color) => <button key={color} type="button" aria-label={'Couleur principale ' + color} aria-pressed={colors.primary === color} style={{ '--swatch':color }} onClick={() => setColors((current) => ({ ...current, primary:color }))} />)}</div></div>
            <div className="penalty-color-row"><span>Secondaire</span><div>{SHIRT_COLORS.map((color) => <button key={color} type="button" aria-label={'Couleur secondaire ' + color} aria-pressed={colors.secondary === color} style={{ '--swatch':color }} onClick={() => setColors((current) => ({ ...current, secondary:color }))} />)}</div></div>
            <button className="penalty-primary" disabled={busy || name.trim().length < 3 || colors.primary === colors.secondary} onClick={() => request('club.create', { name, colors }).catch(() => {})}>Créer mon club</button>
          </article>
          <article><h3>Rejoindre un club</h3><input value={code} maxLength={6} placeholder="CODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6))} /><button className="penalty-secondary" disabled={busy || code.trim().length !== 6} onClick={() => request('club.join', { code }).catch(() => {})}>Rejoindre</button></article>
        </div>
      )}
      <div className="penalty-rule-note">Les couleurs du club identifient l’équipe. Les vêtements, chaussures et cosmétiques ne modifient jamais vitesse, portée, puissance ou précision.</div>
    </section>
  );
}

function InternationalPanel({ snapshot, profile, busy, request }) {
  const country = countryById(profile.countryId);
  const international = snapshot?.international || {};
  const statusText = {
    selection: 'Sélection confirmée',
    preselection: 'Présélection',
    declined: 'Convocation déclinée',
    observe: 'Observé',
    radar: 'Radar national',
    club: 'Carrière club',
    'non-classe': '10 matchs requis',
  }[international.scouting] || 'Radar national';

  const hasCallup = international.selectionStatus === 'preselected' && international.selectionId;
  const selected = international.selectionStatus === 'selected';
  const neededRoleLabel = international.neededRole === 'pression'
    ? 'Spécialiste des Duels d’Or'
    : PLAYER_STYLES[international.neededRole]?.name || null;

  return (
    <section className="penalty-panel-page">
      <span className="penalty-kicker">INTERNATIONAL</span><h1>{country.flag} {country.name} peut avoir besoin de toi.</h1>
      <p>La sélection regarde ton classement national, ta forme, tes performances sous pression et le profil recherché. Le classement seul ne garantit jamais une place.</p>

      {hasCallup && (
        <div className="penalty-callup" data-state="urgent">
          <Globe2 size={32}/>
          <div>
            <b>LE PAYS A BESOIN DE TOI</b>
            <p>{country.name} t’a présélectionné{international.windowName ? ' pour ' + international.windowName : ''}. Profil recherché : {international.roleProfile || PLAYER_STYLES[profile.styleId]?.name || 'polyvalent'}.</p>
            <div className="penalty-inline-actions">
              <button className="penalty-primary" disabled={busy} onClick={() => request('international.respond', { selectionId: international.selectionId, decision: 'accept' }).catch(() => {})}>Accepter la convocation</button>
              <button className="penalty-secondary" disabled={busy} onClick={() => request('international.respond', { selectionId: international.selectionId, decision: 'decline' }).catch(() => {})}>Décliner</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="penalty-callup" data-state="selected">
          <Globe2 size={32}/>
          <div>
            <b>{country.flag} SÉLECTION CONFIRMÉE</b>
            <p>Tu représenteras {country.name}{international.windowName ? ' pendant ' + international.windowName : ''}. Le maillot de sélection remplace automatiquement la tenue club pendant les rencontres internationales, sans modifier tes chaussures ni ton identité.</p>
          </div>
        </div>
      )}

      <div className="penalty-international-grid">
        <article><small>RANG NATIONAL</small><strong>{international.nationalRank ? '#' + international.nationalRank : '—'}</strong><span>{country.name}</span></article>
        <article><small>STATUT</small><strong>{statusText}</strong><span>{international.windowLabel || 'Hors fenêtre internationale'}</span></article>
        <article><small>PRESSION</small><strong>{Math.round((international.pressureScore || 0) * 100)} %</strong><span>Duels d’Or gagnés</span></article>
        <article><small>SÉLECTIONS</small><strong>{international.caps || 0}</strong><span>{international.goals || 0} but(s) international(aux)</span></article>
      </div>

      <div className="penalty-rule-note">{neededRoleLabel ? <><b>Besoin actuel de la sélection : {neededRoleLabel}.</b> {' '}Le besoin est recalculé selon les profils déjà retenus. </> : null}Parcours : radar national → observé → présélection → convocation → sélection. Une place internationale se gagne en multijoueur et ne peut pas être achetée.</div>

      <h2>Compétitions 3B</h2>
      <div className="penalty-competition-list">{COMPETITIONS.map((competition) => <article key={competition.id}><b>{competition.name}</b><small>{competition.cadence}</small><p>{competition.description}</p></article>)}</div>

      {!hasCallup && !selected && (
        <div className="penalty-callup">
          <Globe2 size={28}/><div><b>Le pays a besoin de toi</b><p>Lors d’une fenêtre officielle, le serveur peut te présélectionner selon ton rang, ta réputation, ta résistance à la pression et le profil dont la sélection a besoin.</p></div>
        </div>
      )}
    </section>
  );
}
function CareerPanel({ snapshot, rating, tier, profile }) {
  const career = snapshot?.career || {};
  const history = snapshot?.history || [];
  const country = countryById(profile.countryId);
  return (
    <section className="penalty-panel-page">
      <span className="penalty-kicker">BIOGRAPHIE SPORTIVE</span><h1>{profile.displayName} · {tier.label}</h1>
      <div className="penalty-career-stats">
        <article><small>MATCHS</small><strong>{rating.games || 0}</strong></article>
        <article><small>VICTOIRES</small><strong>{rating.wins || 0}</strong></article>
        <article><small>ELO</small><strong>{rating.rating || 1000}</strong></article>
        <article><small>RÉPUTATION</small><strong>{career.reputation || 0}</strong></article>
        <article><small>BUTS</small><strong>{career.goals || 0}</strong></article>
        <article><small>ARRÊTS</small><strong>{career.saves || 0}</strong></article>
      </div>
      <div className="penalty-biography">
        <h2>Chronologie</h2>
        {history.length ? history.slice(0, 12).map((event, index) => <div key={event.id || index}><span>{event.label || event.result || 'Match 3B'}</span><small>{event.createdAt ? new Date(event.createdAt).toLocaleDateString('fr-FR') : country.name}</small></div>) : <p>Ta première ligne s’écrira après ton premier duel multijoueur.</p>}
      </div>
    </section>
  );
}

function Lobby({ room, busy, request, onBack }) {
  const self = room.players?.find((player) => player.isSelf);
  return (
    <section className="penalty-lobby">
      <button className="penalty-link" onClick={onBack}><ArrowLeft size={14}/> Quitter le salon</button>
      <span className="penalty-kicker">{room.mode === 'private' ? 'SALON PRIVÉ' : 'MATCHMAKING'}</span>
      <h1>{room.code || 'Recherche adversaire'}</h1>
      {room.code && <button className="penalty-copy" onClick={() => navigator.clipboard?.writeText(room.code)}><Copy size={14}/> Copier le code</button>}
      <div className="penalty-lobby-players">{[0, 1].map((index) => {
        const player = room.players?.[index];
        return <article key={index} data-empty={!player}>{player ? <><span>{countryById(player.countryId).flag}</span><div><b>{player.name}{player.isSelf ? ' · toi' : ''}</b><small>{player.ready ? 'PRÊT' : 'EN ATTENTE'}</small></div></> : <><span>?</span><div><b>Adversaire recherché</b><small>Connexion au matchmaking…</small></div></>}</article>;
      })}</div>
      {self && room.mode === 'private' && <button className="penalty-primary" disabled={busy} onClick={() => request('ready', { room: room.id, ready: !self.ready }).catch(() => {})}>{self.ready ? 'Je ne suis plus prêt' : 'Je suis prêt'}</button>}
      {room.isHost && room.players?.length === 2 && room.players.every((player) => player.ready) && <button className="penalty-primary" disabled={busy} onClick={() => request('start', { room: room.id }).catch(() => {})}>Lancer le duel</button>}
    </section>
  );
}

function MatchRoom({ room, profile, busy, request, onLeave }) {
  const state = room.state || {};
  const selfIndex = room.players?.findIndex((player) => player.isSelf) ?? -1;
  const attackerIndex = Number.isInteger(state.attacker) ? state.attacker : 0;
  const keeperIndex = Number.isInteger(state.keeper) ? state.keeper : 1;
  const isAttacker = selfIndex === attackerIndex;
  const isKeeper = selfIndex === keeperIndex;
  const remaining = remainingPossessionSeconds(state, Date.now());
  const leftGesture = useRef(new PointerGesture());
  const rightGesture = useRef(new PointerGesture());
  const rightLastTap = useRef(0);
  const chargeFrame = useRef(0);
  const moveThrottle = useRef(0);
  const keeperMoveThrottle = useRef(0);
  const moveInFlight = useRef(false);
  const pendingMove = useRef(null);
  const keeperMoveInFlight = useRef(false);
  const pendingKeeperMove = useRef(null);
  const keeperFinalAction = useRef(null);
  const keeperFaceTimer = useRef(0);
  const keeperFaceActive = useRef(0);
  const revisionRef = useRef(room.revision);
  const controlRef = useRef({ x:0, y:0, intensity:0, active:false, keeper:{ direction:0, intensity:0, active:false } });
  const leftPadRef = useRef(null);
  const rightPadRef = useRef(null);
  const opponent = room.players?.find((player) => !player.isSelf);
  revisionRef.current = room.revision;
  useEffect(() => () => {
    cancelAnimationFrame(chargeFrame.current);
    clearInterval(keeperFaceTimer.current);
  }, []);

  function flushMove() {
    if (moveInFlight.current || !pendingMove.current) return;
    const input = pendingMove.current;
    pendingMove.current = null;
    moveInFlight.current = true;
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .catch(() => {})
      .finally(() => {
        moveInFlight.current = false;
        if (pendingMove.current) flushMove();
      });
  }

  function queueMove(input) {
    pendingMove.current = input;
    flushMove();
  }

  function flushKeeperFinal() {
    if (keeperMoveInFlight.current || pendingKeeperMove.current || !keeperFinalAction.current) return;
    const input = keeperFinalAction.current;
    keeperFinalAction.current = null;
    keeperMoveInFlight.current = true;
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .then((data) => {
        if (data?.room?.revision != null) revisionRef.current = data.room.revision;
      })
      .catch(() => {})
      .finally(() => {
        keeperMoveInFlight.current = false;
        if (pendingKeeperMove.current) flushKeeperMove();
        else if (keeperFinalAction.current) flushKeeperFinal();
      });
  }

  function flushKeeperMove() {
    if (keeperMoveInFlight.current || !pendingKeeperMove.current) return;
    const input = pendingKeeperMove.current;
    pendingKeeperMove.current = null;
    keeperMoveInFlight.current = true;
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .then((data) => {
        if (data?.room?.revision != null) revisionRef.current = data.room.revision;
      })
      .catch(() => {})
      .finally(() => {
        keeperMoveInFlight.current = false;
        if (pendingKeeperMove.current) flushKeeperMove();
        else if (keeperFinalAction.current) flushKeeperFinal();
      });
  }

  function queueKeeperMove(input) {
    pendingKeeperMove.current = input;
    flushKeeperMove();
  }

  function queueKeeperFinal(input) {
    keeperFinalAction.current = input;
    if (!keeperMoveInFlight.current && !pendingKeeperMove.current) flushKeeperFinal();
  }

  function resetLeftPad() {
    controlRef.current = { ...controlRef.current, x:0, y:0, intensity:0, active:false };
    const pad = leftPadRef.current;
    if (!pad) return;
    pad.dataset.active = 'false';
    pad.style.setProperty('--stick-x', '0px');
    pad.style.setProperty('--stick-y', '0px');
  }

  function resetRightPad() {
    cancelAnimationFrame(chargeFrame.current);
    chargeFrame.current = 0;
    const pad = rightPadRef.current;
    if (!pad) return;
    pad.dataset.active = 'false';
    pad.dataset.charging = 'false';
    pad.style.setProperty('--charge', '0');
    pad.style.setProperty('--gesture-power', '.18');
    pad.style.setProperty('--gesture-opacity', '.28');
  }

  function leftStart(event) {
    if (!isAttacker || state.status === 'finished' || event.button !== 0) return;
    if (!leftGesture.current.begin(event.pointerId, { x:event.clientX, y:event.clientY })) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active = 'true';
  }

  function leftMove(event) {
    const start = leftGesture.current.get(event.pointerId);
    if (!start || !isAttacker) return;
    const rawDx = event.clientX - start.x;
    const rawDy = event.clientY - start.y;
    const rawLength = Math.hypot(rawDx, rawDy);
    const deadZone = 10;
    const activeLength = Math.max(0, rawLength - deadZone);
    const scale = rawLength > 0 ? activeLength / rawLength : 0;
    const dx = rawDx * scale;
    const dy = rawDy * scale;
    const length = Math.hypot(dx, dy);
    const x = length ? dx / length : 0;
    const y = length ? dy / length : 0;
    const intensity = Math.min(1, length / 88);
    controlRef.current = { ...controlRef.current, x, y, intensity, active:activeLength > 0 };

    const pad = leftPadRef.current;
    if (pad) {
      const visualRadius = Math.min(39, length);
      pad.style.setProperty('--stick-x', (x * visualRadius).toFixed(1) + 'px');
      pad.style.setProperty('--stick-y', (y * visualRadius).toFixed(1) + 'px');
    }

    const now = performance.now();
    if (now - moveThrottle.current < 50) return;
    moveThrottle.current = now;
    queueMove({ type:'move', x, y, intensity });
  }

  function leftEnd(event) {
    if (!leftGesture.current.end(event.pointerId)) return;
    resetLeftPad();
    queueMove({ type:'move', x:0, y:0, intensity:0 });
  }

  function rightStart(event) {
    if ((!isAttacker && !isKeeper) || state.status === 'finished' || event.button !== 0) return;
    unlockPenaltyAudio().catch(() => {});
    if (!rightGesture.current.begin(event.pointerId, {
      x:event.clientX,
      y:event.clientY,
      t:performance.now(),
      path:[{ x:event.clientX, y:event.clientY }],
    })) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active = 'true';
    event.currentTarget.style.setProperty('--gesture-opacity', '.92');
    if (isAttacker) {
      const pad = event.currentTarget;
      pad.dataset.charging = 'true';
      pad.style.setProperty('--charge', '.1');
      const tick = now => {
        const gesture = rightGesture.current.get(event.pointerId);
        if (!gesture) return;
        const charge = Math.max(.1, Math.min(1, (now - gesture.t) / 950));
        pad.style.setProperty('--charge', charge.toFixed(3));
        pad.style.setProperty('--gesture-power', String(Math.max(.18, charge)));
        chargeFrame.current = requestAnimationFrame(tick);
      };
      chargeFrame.current = requestAnimationFrame(tick);
    }
    if (isKeeper) {
      keeperFinalAction.current = null;
      pendingKeeperMove.current = null;
      event.currentTarget.style.setProperty('--charge', '0');
      controlRef.current.keeper = { direction:0, intensity:0, active:true };
    }
  }

  function rightMove(event) {
    const gesture = rightGesture.current.get(event.pointerId);
    if (!gesture) return;
    gesture.path.push({ x:event.clientX, y:event.clientY });
    if (gesture.path.length > 24) gesture.path.shift();

    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const pad = rightPadRef.current;
    if (pad) {
      pad.style.setProperty('--gesture-angle', angle.toFixed(1) + 'deg');
      if (isKeeper) {
        const preview = Math.min(1, distance / 92);
        pad.style.setProperty('--gesture-power', String(Math.max(.18, preview)));
        pad.style.setProperty('--charge', preview.toFixed(3));
      }
    }
    if (isKeeper) {
      const keeperDeadZone = 9;
      const effectiveDistance = Math.max(0, distance - keeperDeadZone);
      const direction = effectiveDistance ? Math.max(-1, Math.min(1, dx / Math.max(38, Math.abs(dx)))) : 0;
      const intensity = Math.min(1, effectiveDistance / 92);
      controlRef.current.keeper = { direction, intensity, active:effectiveDistance > 0 };
      const now = performance.now();
      if (now - keeperMoveThrottle.current >= 50) {
        keeperMoveThrottle.current = now;
        queueKeeperMove({ type:'hold', direction, intensity });
      }
    }
  }

  function rightEnd(event) {
    const gesture = rightGesture.current.end(event.pointerId);
    if (!gesture) return;
    resetRightPad();
    if (isKeeper) {
      controlRef.current.keeper = { direction:0, intensity:0, active:false };
    }

    const endedAt = performance.now();
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    const durationMs = endedAt - gesture.t;
    const effectiveHeldMs = isAttacker ? Math.max(340, durationMs) : durationMs;
    const taps = 0;

    const curve = gesture.path.length > 2
      ? Math.max(-1, Math.min(1, (gesture.path[Math.floor(gesture.path.length / 2)].x - (gesture.x + dx / 2)) / 45))
      : 0;
    const parsed = isAttacker
      ? interpretAttackGesture({ dx, dy, durationMs:effectiveHeldMs, heldMs:effectiveHeldMs, curve, taps })
      : interpretKeeperGesture({ dx, dy, durationMs });

    if (isKeeper) {
      pendingKeeperMove.current = null;
      queueKeeperFinal(parsed);
    } else {
      request('input', { room:room.id, revision:revisionRef.current, input:parsed }, { silent:true })
        .then((data) => { if (data?.room?.revision != null) revisionRef.current = data.room.revision; })
        .catch(() => {});
    }
  }

  function rightCancel(event) {
    if (!rightGesture.current.cancel(event.pointerId)) return;
    resetRightPad();
    rightLastTap.current = 0;
    if (isKeeper) {
      controlRef.current.keeper = { direction:0, intensity:0, active:false };
      pendingKeeperMove.current = null;
      queueKeeperFinal({ type:'hold', direction:0, intensity:0 });
    }
  }

  function vibrateFace(pattern = 8) {
    try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch {}
  }

  function sendAttackerFace(type, directionX = 0, intensity = .82) {
    if (!isAttacker || busy || state.status === 'finished') return;
    unlockPenaltyAudio().catch(() => {});
    vibrateFace();
    const input = { type, intensity };
    if (type === 'feint' || type === 'cut' || type === 'rhythm') {
      input.direction = { x:directionX, y:0, length:Math.abs(directionX) };
    }
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .then((data) => { if (data?.room?.revision != null) revisionRef.current = data.room.revision; })
      .catch(() => {});
  }

  function keeperFaceStart(direction, event) {
    if (!isKeeper || busy || state.status === 'finished') return;
    unlockPenaltyAudio().catch(() => {});
    vibrateFace(6);
    clearInterval(keeperFaceTimer.current);
    keeperFaceActive.current = direction;
    event?.currentTarget?.setPointerCapture?.(event.pointerId);
    const stream = () => {
      controlRef.current.keeper = { direction, intensity:.72, active:true };
      queueKeeperMove({ type:'hold', direction, intensity:.72 });
    };
    stream();
    keeperFaceTimer.current = window.setInterval(stream, 70);
  }

  function keeperFaceEnd(direction) {
    if (!isKeeper || keeperFaceActive.current !== direction) return;
    keeperFaceActive.current = 0;
    clearInterval(keeperFaceTimer.current);
    keeperFaceTimer.current = 0;
    controlRef.current.keeper = { direction:0, intensity:0, active:false };
    pendingKeeperMove.current = null;
    vibrateFace([8, 18, 12]);
    queueKeeperFinal({ type:'dive', direction, intensity:.92 });
  }

  function keeperFaceAction(type) {
    if (!isKeeper || busy || state.status === 'finished') return;
    unlockPenaltyAudio().catch(() => {});
    vibrateFace(type === 'high-claim' ? [8, 14, 8] : 10);
    const direction = Math.abs(controlRef.current?.keeper?.direction || 0) > .08
      ? controlRef.current.keeper.direction : 0;
    queueKeeperFinal({ type, direction, intensity:type === 'high-claim' ? .9 : .74 });
  }

  function activatePower(powerId) {
    if (!isKeeper || busy) return;
    request('input', {
      room:room.id,
      revision:revisionRef.current,
      input:{ type:'power', powerId },
    }, { silent:true })
      .then((data) => { if (data?.room?.revision != null) revisionRef.current = data.room.revision; })
      .catch(() => {});
  }

  const score = state.score || [0, 0];
  const powerIds = room.players?.[selfIndex]?.keeperPowers || profile.keeperPowers;
  const impactType = ['goal','save','frame'].includes(state.lastEvent?.type) ? state.lastEvent.type : null;
  const impactLabel = impactType === 'goal' ? 'BUT' : impactType === 'save' ? 'ARRÊT' : impactType === 'frame' ? 'CADRE' : '';

  return (
    <main className="penalty-match" data-role={isAttacker ? 'attacker' : isKeeper ? 'keeper' : 'spectator'}>
      <div className="penalty-match-hud">
        <div className="penalty-hud-player"><b>{room.players?.[0]?.name || 'Joueur A'}</b><small>{room.players?.[0]?.countryId ? countryById(room.players[0].countryId).flag : ''}</small></div>
        <div className="penalty-score"><span>{score[0] || 0}</span><div><small>{phaseLabel(state.phase)}</small><b>{remaining.toString().padStart(2, '0')}s</b></div><span>{score[1] || 0}</span></div>
        <div className="penalty-hud-player right"><small>{opponent?.countryId ? countryById(opponent.countryId).flag : ''}</small><b>{room.players?.[1]?.name || 'Joueur B'}</b></div>
      </div>

      <div className="penalty-meter-line">
        <div><span>ÉNERGIE</span><i><b style={{ width:`${state.energy?.[selfIndex] ?? 100}%` }} /></i></div>
        <strong>{isAttacker ? 'ATTAQUE' : isKeeper ? 'GARDIEN · CAGE ENTIÈRE' : 'SPECTATEUR'}</strong>
        <div><span>FLOW</span><i><b style={{ width:`${state.flow?.[selfIndex] ?? 0}%` }} /></i></div>
      </div>

      <section className="penalty-pitch penalty-pitch-3d">
        <Suspense fallback={<div className="penalty-arena3d-fallback"><b>Terrain 3B</b><span>Chargement du match 3D…</span></div>}>
          <PenaltyRushArena3D room={room} profile={profile} selfIndex={selfIndex} controlRef={controlRef} />
        </Suspense>

        {isKeeper && <div className="penalty-power-dock">{powerIds.map((id) => <button key={id} disabled={(state.keeperEnergy?.[selfIndex] ?? 100) < (KEEPER_POWERS[id]?.cost || 100)} onClick={() => activatePower(id)}><i>{powerIcon(id)}</i><span>{KEEPER_POWERS[id]?.name}</span></button>)}</div>}

        {isAttacker && <div ref={leftPadRef} className="penalty-touch-left" data-active="false" aria-label="Déplacement de l’attaquant" onPointerDown={leftStart} onPointerMove={leftMove} onPointerUp={leftEnd} onPointerCancel={leftEnd} onLostPointerCapture={leftEnd}><span /></div>}
        {(isAttacker || isKeeper) && <div className="penalty-face-cluster" data-role={isAttacker ? 'attacker' : 'keeper'} aria-label="Commandes d’action 3B">
          <button className="penalty-face penalty-face-top" data-tone="3b" aria-label={isAttacker ? 'Accélération 3B' : 'Sortie haute 3B'} onPointerDown={() => isAttacker ? sendAttackerFace('accelerate', 0, .95) : keeperFaceAction('high-claim')}><b>3B</b><small>{isAttacker ? 'BOOST' : 'HAUT'}</small></button>
          <button className="penalty-face penalty-face-left" data-tone="black" aria-label={isAttacker ? 'Feinte noire gauche' : 'Plongeon gauche'} onPointerDown={(e) => isAttacker ? sendAttackerFace('feint', -.86, .82) : keeperFaceStart(-1, e)} onPointerUp={() => isKeeper && keeperFaceEnd(-1)} onPointerCancel={() => isKeeper && keeperFaceEnd(-1)} onLostPointerCapture={() => isKeeper && keeperFaceEnd(-1)}><b>N</b><small>{isAttacker ? 'FEINTE' : 'GAUCHE'}</small></button>
          <button className="penalty-face penalty-face-right" data-tone="white" aria-label={isAttacker ? 'Crochet blanc droite' : 'Plongeon droite'} onPointerDown={(e) => isAttacker ? sendAttackerFace('cut', .86, .9) : keeperFaceStart(1, e)} onPointerUp={() => isKeeper && keeperFaceEnd(1)} onPointerCancel={() => isKeeper && keeperFaceEnd(1)} onLostPointerCapture={() => isKeeper && keeperFaceEnd(1)}><b>B</b><small>{isAttacker ? 'CROCHET' : 'DROITE'}</small></button>
          <div ref={rightPadRef} className="penalty-face penalty-face-bottom penalty-face-shot" data-tone="beur" data-active="false" data-charging="false" aria-label={isAttacker ? 'Frappe Beur or avec puissance et effet' : 'Fermeture d’angle Beur or'} onPointerDown={isAttacker ? rightStart : () => keeperFaceAction('close-angle')} onPointerMove={isAttacker ? rightMove : undefined} onPointerUp={isAttacker ? rightEnd : undefined} onPointerCancel={isAttacker ? rightCancel : undefined} onLostPointerCapture={isAttacker ? rightCancel : undefined}>
            <b>{isAttacker ? 'OR' : 'O'}</b><small>{isAttacker ? 'FRAPPE' : 'ANGLE'}</small>
            {isAttacker && <i className="penalty-shot-charge" aria-hidden="true"><b /></i>}
          </div>
        </div>}

        <div className="penalty-last-event">{state.lastEvent?.text || (isAttacker ? 'Lis le gardien. Change de rythme.' : 'Lis la course. Ferme l’angle.')}</div>
        {impactType && <div key={String(state.lastEvent?.visual?.at || room.revision)} className="penalty-impact-word" data-type={impactType} aria-hidden="true"><strong>{impactLabel}</strong><span>{impactType === 'goal' ? '3B PENALTY RUSH' : impactType === 'save' ? 'RÉFLEXE GARDIEN' : 'À QUELQUES CENTIMÈTRES'}</span></div>}
      </section>

      {state.phase === 'second-half' && state.possession === 1 && <div className="penalty-phase-banner">MI-TEMPS · INVERSION DES RÔLES</div>}
      {state.phase === 'golden-duel' && <div className="penalty-phase-banner gold">DUEL D’OR · UNE ATTAQUE CHACUN</div>}
      {room.status === 'finished' && <div className="penalty-result-overlay"><section><span className="penalty-kicker">RÉSULTAT SERVEUR</span><h2>{state.winner === selfIndex ? 'Victoire' : state.winner === null ? 'Égalité' : 'Défaite'}</h2><p>{score[0]} — {score[1]}</p><button className="penalty-primary" onClick={onLeave}>Retour au hub</button></section></div>}

      <button className="penalty-match-exit" onClick={onLeave}>Quitter</button>
    </main>
  );
}
