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
import { APPEARANCE_OPTIONS, profileCompletion, scoutingLabel } from './penaltyRush/career.js';
import { stopPenaltyAudio, unlockPenaltyAudio } from './penaltyRush/audio.js';
import {
  coalescedPointerSample, createTechniqueTracker, detectJoystickTechnique, keyboardVector,
  penaltyInputMode, pointerAim, shapeJoystick,
} from './penaltyRush/joystick.js';
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

  useEffect(() => () => stopPenaltyAudio(), []);

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
                  ? <PlayHome busy={busy} profile={profile} rating={rating} tier={tier} snapshot={snapshot} code={privateCode} setCode={setPrivateCode} request={request} onTraining={setTraining} />
                  : tab === 'player'
                    ? <PlayerStudio profile={profile} rating={rating} snapshot={snapshot} setProfile={setProfile} busy={busy} onSave={() => request('profile.save', { profile }).catch(() => {})} />
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

function PlayHome({ busy, profile, rating, tier, snapshot, code, setCode, request, onTraining }) {
  const country=countryById(profile.countryId);
  const ranked=snapshot?.ranked||{};
  const division=ranked.division||{label:'Placement',remaining:5,progress:0};
  const passport=snapshot?.passport||{};
  const international=snapshot?.international||{};
  const competitiveReady=passport.competitiveReady!==false&&profile.identityStatus!=='review';
  return (
    <div className="penalty-play-home">
      <section className="penalty-hero penalty-hero-v8">
        <div className="penalty-hero-copy">
          <span className="penalty-kicker">PASSEPORT → JOUEUR → CLUB → CLASSÉ → SÉLECTION</span>
          <h1>Ta carrière 3B commence avec une seule identité.</h1>
          <p>Entraînement libre, duels rapides, saison classée et sélection nationale partagent le même joueur, sans doublon de compte.</p>
          <div className="penalty-profile-line">
            <span>{country.flag}</span><b>{profile.displayName}</b>
            <small>{division.label} · {ranked.rating || 1000} · {tier.label}</small>
          </div>
          <div className="penalty-passport-chip" data-state={competitiveReady?'ready':'review'}>
            <Shield size={14}/><span>{profile.passportLabel || snapshot?.passport?.label || 'Passeport 3B'}</span>
            <b>{competitiveReady?'IDENTITÉ VALIDÉE':'REVUE REQUISE'}</b>
          </div>
        </div>
        <div className="penalty-hero-pitch" aria-hidden="true">
          <span className="penalty-player-dot">{profile.shirtNumber}</span>
          <span className="penalty-ball-dot">3B</span>
          <span className="penalty-goal"><i /></span>
        </div>
      </section>

      <section className="penalty-mode-grid penalty-mode-grid-v8">
        <article>
          <span className="penalty-kicker">ENTRAÎNEMENT · SOLO</span>
          <h2>Centre d’entraînement</h2>
          <p>Travaille attaquant et gardien contre l’IA sans toucher au classement, à la réputation ou aux sélections.</p>
          <div className="penalty-training-actions"><button className="penalty-primary" onClick={()=>onTraining('attacker')}>Attaquant</button><button className="penalty-secondary" onClick={()=>onTraining('keeper')}>Gardien</button></div>
        </article>
        <article>
          <span className="penalty-kicker">RAPIDE · 1V1</span>
          <h2>Match immédiat</h2>
          <p>Un duel réel sans enjeu de division. Idéal pour tester un archétype, une technique ou un nouveau réglage.</p>
          <button className="penalty-primary" disabled={busy} onClick={()=>request('queue',{mode:'quick'}).catch(()=>{})}><Play size={17}/> Trouver un joueur</button>
        </article>
        <article className="penalty-ranked-card" data-ready={competitiveReady}>
          <span className="penalty-kicker">CLASSÉ · {ranked.season?.name || 'SAISON'}</span>
          <h2>{division.label}</h2>
          <p>{division.id==='placement'
            ? `${ranked.placementsRemaining ?? division.remaining ?? 5} match(s) de placement avant le rang officiel.`
            : `${ranked.rating || 1000} points · série ${ranked.streak || 0} · meilleur ${ranked.bestRating || ranked.rating || 1000}.`}</p>
          <div className="penalty-rank-progress" aria-hidden="true"><i style={{width:`${Math.round((division.progress ?? 0)*100)}%`}}/></div>
          <button className="penalty-primary" disabled={busy||!competitiveReady} onClick={()=>request('queue',{mode:'ranked'}).catch(()=>{})}><Trophy size={17}/> Jouer classé</button>
          {!competitiveReady&&<small>Le Passeport et le profil joueur doivent être validés.</small>}
        </article>
        <article>
          <span className="penalty-kicker">SALON PRIVÉ</span>
          <h2>Défier un ami</h2>
          <p>Code à six caractères. Aucun impact sur la division et aucun farm de récompenses classées.</p>
          <div className="penalty-inline-actions">
            <button className="penalty-secondary" disabled={busy} onClick={()=>request('create',{}).catch(()=>{})}>Créer</button>
            <input value={code} onChange={(event)=>setCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6))} placeholder="CODE 3B" aria-label="Code de salon"/>
            <button className="penalty-secondary" disabled={busy||code.length!==6} onClick={()=>request('join',{code}).catch(()=>{})}>Rejoindre</button>
          </div>
        </article>
        <article className="penalty-national-card" data-selected={international.selectionStatus==='selected'}>
          <span className="penalty-kicker">ÉQUIPE NATIONALE · {country.flag}</span>
          <h2>{international.selectionStatus==='selected'?'Tu représentes '+country.name:'Objectif sélection'}</h2>
          <p>{international.matchOpen
            ? 'La fenêtre internationale est ouverte : trouve un joueur sélectionné d’un autre pays.'
            : international.selectionStatus==='selected'
              ? 'Convocation acceptée. Les matchs s’ouvriront pendant la fenêtre internationale active.'
              : `Score sélection : ${Math.round(international.selectionScore || 0)} · statut ${scoutingLabel(international.scouting)}.`}</p>
          <button className="penalty-primary" disabled={busy||!international.matchOpen} onClick={()=>request('queue',{mode:'international'}).catch(()=>{})}><Globe2 size={17}/> Jouer pour mon pays</button>
        </article>
      </section>

      <section className="penalty-control-principle">
        <div><b>IDENTITÉ UNIQUE</b><span>Passeport 3B → joueur → club → sélection</span></div>
        <div><b>COMPÉTITION SERVEUR</b><span>Division, résultats, recrutement et convocations validés côté serveur</span></div>
        <strong>Les cosmétiques personnalisent ton joueur. Ils n’achètent jamais de performance.</strong>
      </section>
    </div>
  );
}

function PlayerStudio({ profile, rating, snapshot, setProfile, busy, onSave }) {
  const country=countryById(profile.countryId);
  const completion=profileCompletion(profile);
  const passport=snapshot?.passport||{};
  const optionMap=key=>new Map((APPEARANCE_OPTIONS[key]||[]).map(item=>[item[0],item]));
  const skinMap=optionMap('skinTones');
  const hairColorMap=optionMap('hairColors');
  function patch(key,value){setProfile(current=>({...current,[key]:value}));}
  function patchNested(key,child,value){setProfile(current=>({...current,[key]:{...current[key],[child]:value}}));}
  function patchAppearance(child,value){setProfile(current=>({...current,appearance:{...current.appearance,[child]:value}}));}
  function togglePower(id){
    setProfile(current=>{
      const has=current.keeperPowers.includes(id);
      const next=has?current.keeperPowers.filter(power=>power!==id):[...current.keeperPowers,id].slice(-2);
      return {...current,keeperPowers:next.length?next:current.keeperPowers};
    });
  }
  const skin=skinMap.get(profile.appearance?.skinTone)?.[2]||'#ad7655';
  const hair=hairColorMap.get(profile.appearance?.hairColor)?.[2]||'#2a1b13';
  return (
    <div className="penalty-studio penalty-studio-v8">
      <section className="penalty-player-card penalty-player-card-v8" style={{'--shirt':profile.kit.shirtPrimary,'--trim':profile.kit.shirtSecondary,'--skin':skin,'--hair':hair}}>
        <div className="penalty-avatar-preview" data-build={profile.appearance?.build||'athletic'} data-hair={profile.appearance?.hairStyle||'short'} aria-hidden="true">
          <i className="penalty-avatar-hair"/><i className="penalty-avatar-head"/><i className="penalty-avatar-body"/><b>{profile.shirtNumber}</b>
        </div>
        <div>
          <span>{country.flag} {profile.passportLabel||passport.label||'Passeport 3B'}</span>
          <h2>{profile.displayName}</h2>
          <p>{PLAYER_STYLES[profile.styleId]?.name} · {profile.preferredRole==='keeper'?'Gardien':profile.preferredRole==='attacker'?'Attaquant':'Polyvalent'} · niveau archétype {profile.archetypeLevel||1}</p>
          <small>{profile.clubName||'Sans club'} · identité {profile.identityStatus==='review'?'en revue':'validée'}</small>
        </div>
      </section>

      <section className="penalty-form-grid penalty-form-grid-v8">
        <article className="penalty-form-feature">
          <span className="penalty-kicker">PASSEPORT 3B · IDENTITÉ SPORTIVE</span><h3>Ce qui te suit partout</h3>
          <label>Identité officielle<span className="penalty-readonly-field">{profile.displayName}</span></label>
          <label>Pays / sélection<span className="penalty-readonly-field">{country.flag} {country.name} · {country.value}</span></label>
          <label>Passeport<span className="penalty-readonly-field">{profile.passportLabel||passport.label||'Passeport 3B'}</span></label>
          <div className="penalty-identity-state" data-state={profile.identityStatus==='review'?'review':'ready'}>
            <Shield size={17}/><div><b>{profile.identityStatus==='review'?'REVUE D’IDENTITÉ REQUISE':'IDENTITÉ RENFORCÉE'}</b><small>{profile.identityStatus==='review'?'Le classé et les sélections sont suspendus jusqu’à réalignement.':'Le pays et le nom officiel viennent du Passeport. Aucun UUID de connexion n’est affiché.'}</small></div>
          </div>
          <label>Nom sur le maillot<input value={profile.shirtName} maxLength={14} onChange={e=>patch('shirtName',e.target.value.toUpperCase())}/></label>
          <label>Numéro<input type="number" min="1" max="99" value={profile.shirtNumber} onChange={e=>patch('shirtNumber',e.target.value)}/></label>
          <label>Rôle préféré<select value={profile.preferredRole||'versatile'} onChange={e=>patch('preferredRole',e.target.value)}>{APPEARANCE_OPTIONS.roles.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Pied fort<select value={profile.dominantFoot||'right'} onChange={e=>patch('dominantFoot',e.target.value)}>{APPEARANCE_OPTIONS.feet.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Club<span className="penalty-readonly-field">{profile.clubName||'Sans club · recrutement dans l’onglet Club'}</span></label>
        </article>

        <article className="penalty-form-feature">
          <span className="penalty-kicker">APPARENCE</span><h3>Construis ton joueur</h3>
          <div className="penalty-appearance-swatches"><span>Teinte de peau</span><div>{APPEARANCE_OPTIONS.skinTones.map(([id,label,color])=><button type="button" key={id} title={label} aria-label={label} aria-pressed={profile.appearance?.skinTone===id} style={{'--swatch':color}} onClick={()=>patchAppearance('skinTone',id)}/>)}</div></div>
          <label>Coiffure<select value={profile.appearance?.hairStyle||'short'} onChange={e=>patchAppearance('hairStyle',e.target.value)}>{APPEARANCE_OPTIONS.hairStyles.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <div className="penalty-appearance-swatches"><span>Cheveux</span><div>{APPEARANCE_OPTIONS.hairColors.map(([id,label,color])=><button type="button" key={id} title={label} aria-label={label} aria-pressed={profile.appearance?.hairColor===id} style={{'--swatch':color}} onClick={()=>patchAppearance('hairColor',id)}/>)}</div></div>
          <label>Forme du visage<select value={profile.appearance?.faceShape||'balanced'} onChange={e=>patchAppearance('faceShape',e.target.value)}>{APPEARANCE_OPTIONS.faceShapes.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Barbe<select value={profile.appearance?.facialHair||'none'} onChange={e=>patchAppearance('facialHair',e.target.value)}>{APPEARANCE_OPTIONS.facialHair.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Taille visuelle <b>{profile.appearance?.heightCm||178} cm</b><input type="range" min="165" max="198" step="1" value={profile.appearance?.heightCm||178} onChange={e=>patchAppearance('heightCm',Number(e.target.value))}/></label>
          <label>Silhouette<select value={profile.appearance?.build||'athletic'} onChange={e=>patchAppearance('build',e.target.value)}>{APPEARANCE_OPTIONS.builds.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <small className="penalty-field-note">Taille, silhouette, peau, cheveux, visage et barbe sont purement visuels. La hitbox, la vitesse, la portée et le tir restent identiques en compétition.</small>
        </article>

        <article className="penalty-form-feature">
          <span className="penalty-kicker">ARCHÉTYPE · NIVEAU {profile.archetypeLevel||1}/50</span><h3>Ton identité de jeu</h3>
          <p className="penalty-form-copy">L’archétype définit de petites nuances équilibrées. La progression d’archétype débloquera surtout prestige et personnalisation, jamais un achat de puissance.</p>
          <div className="penalty-style-list">{Object.values(PLAYER_STYLES).map(style=>(
            <button type="button" key={style.id} aria-pressed={profile.styleId===style.id} onClick={()=>patch('styleId',style.id)}>
              <b>{style.name}</b><small>{style.description}</small>
            </button>
          ))}</div>
        </article>

        <article>
          <span className="penalty-kicker">TENUE</span><h3>Couleurs & textile</h3>
          {[['shirtPrimary','Maillot'],['shirtSecondary','Détails'],['shorts','Short'],['socks','Chaussettes']].map(([key,label])=><div className="penalty-color-row" key={key}><span>{label}</span><div>{SHIRT_COLORS.map(color=><button key={color} type="button" aria-label={label+' '+color} aria-pressed={profile.kit[key]===color} style={{'--swatch':color}} onClick={()=>patchNested('kit',key,color)}/>)}</div></div>)}
          <label>Motif du maillot<select value={profile.kit.pattern} onChange={e=>patchNested('kit','pattern',e.target.value)}><option value="clean">Épuré</option><option value="stripe">Bandes</option><option value="split">Bicolore</option><option value="gradient">Dégradé</option><option value="matrix">Matrix discret</option></select></label>
          <label>Manches<select value={profile.kit.sleeves||'short'} onChange={e=>patchNested('kit','sleeves',e.target.value)}>{KIT_SLEEVES.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Col<select value={profile.kit.collar||'v'} onChange={e=>patchNested('kit','collar',e.target.value)}>{KIT_COLLARS.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Coupe du short<select value={profile.kit.shortsCut||'classic'} onChange={e=>patchNested('kit','shortsCut',e.target.value)}>{SHORTS_CUTS.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Hauteur des chaussettes<select value={profile.kit.socksStyle||'high'} onChange={e=>patchNested('kit','socksStyle',e.target.value)}>{SOCKS_STYLES.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Chaussures<select value={profile.boots.preset} onChange={e=>patchNested('boots','preset',e.target.value)}>{BOOT_PRESETS.map(boot=><option value={boot.id} key={boot.id}>{boot.name}</option>)}</select></label>
          <label>Matière<select value={profile.boots.material||'synthetic'} onChange={e=>patchNested('boots','material',e.target.value)}>{BOOT_MATERIALS.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Type de crampons<select value={profile.boots.studs||'mixed'} onChange={e=>patchNested('boots','studs',e.target.value)}>{BOOT_STUDS.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Signature sur la chaussure<input value={profile.boots.signature||''} maxLength={8} placeholder="NOM / 3B" onChange={e=>patchNested('boots','signature',e.target.value.toUpperCase())}/></label>
          {[['upper','Chaussure'],['sole','Semelle'],['laces','Lacets']].map(([key,label])=><div className="penalty-color-row" key={key}><span>{label}</span><div>{SHIRT_COLORS.map(color=><button key={color} type="button" aria-label={label+' '+color} aria-pressed={profile.boots[key]===color} style={{'--swatch':color}} onClick={()=>patchNested('boots',key,color)}/>)}</div></div>)}
          <label>Célébration<select value={profile.celebration} onChange={e=>patch('celebration',e.target.value)}><option value="calme">Calme</option><option value="crown">Couronne 3B</option><option value="respect">Respect</option><option value="matrix">Matrix</option></select></label>
        </article>

        <article>
          <span className="penalty-kicker">GARDIEN</span><h3>Deux pouvoirs maximum</h3>
          <div className="penalty-power-list">{Object.values(KEEPER_POWERS).map(power=>(
            <button type="button" key={power.id} aria-pressed={profile.keeperPowers.includes(power.id)} onClick={()=>togglePower(power.id)}>
              <i>{powerIcon(power.id)}</i><span><b>{power.name}</b><small>{power.description}</small><em>{power.drawback}</em></span>
            </button>
          ))}</div>
        </article>
      </section>
      {!completion.ready&&<div className="penalty-notice">Profil incomplet : {completion.missing.join(', ')}.</div>}
      <button className="penalty-primary penalty-save" disabled={busy||profile.keeperPowers.length!==2||!completion.ready||profile.identityStatus==='review'} onClick={onSave}>Enregistrer mon joueur</button>
    </div>
  );
}

function ClubPanel({ snapshot, profile, busy, request }) {
  const club=snapshot?.club;
  const invites=snapshot?.clubInvites||[];
  const [name,setName]=useState('');
  const [code,setCode]=useState('');
  const [recruitPassport,setRecruitPassport]=useState('');
  const [colors,setColors]=useState({primary:'#08090b',secondary:'#d8b35e'});
  const canRecruit=club&&['owner','captain'].includes(club.role);
  return (
    <section className="penalty-panel-page penalty-club-page">
      <span className="penalty-kicker">CLUBS 3B · RECRUTEMENT</span><h1>Un effectif construit autour de vraies identités.</h1>
      <p>Les clubs regroupent les carrières individuelles. Le recrutement passe par le Passeport public 3B : aucune adresse e-mail ni identifiant de connexion n’est partagé.</p>

      {club ? (
        <>
          <div className="penalty-big-card penalty-club-hero" style={{'--club-primary':club.colors?.primary||'#08090b','--club-secondary':club.colors?.secondary||'#d8b35e'}}>
            <span className="penalty-club-crest">3B</span>
            <div className="penalty-club-summary">
              <span className="penalty-kicker">{club.role==='owner'?'FONDATEUR':club.role==='captain'?'CAPITAINE':'MEMBRE'}</span>
              <h2>{club.name}</h2>
              <p>{club.members||1} membre(s) · code privé {club.code}</p>
              <div className="penalty-club-manage">
                <button className="penalty-copy" type="button" onClick={()=>navigator.clipboard?.writeText(club.code).catch(()=>{})}><Copy size={13}/> Copier le code</button>
                {club.role==='owner'
                  ? <button className="penalty-danger" type="button" disabled={busy} onClick={()=>{if(window.confirm('Dissoudre définitivement ce club ?'))request('club.disband',{}).catch(()=>{});}}>Dissoudre</button>
                  : <button className="penalty-secondary" type="button" disabled={busy} onClick={()=>{if(window.confirm('Quitter ce club ?'))request('club.leave',{}).catch(()=>{});}}>Quitter</button>}
              </div>
            </div>
          </div>

          {canRecruit&&<article className="penalty-recruit-box">
            <span className="penalty-kicker">CELLULE DE RECRUTEMENT</span><h3>Inviter par Passeport 3B</h3>
            <p>Entre l’identifiant public du joueur. L’invitation expire automatiquement après 72 heures et le joueur doit l’accepter.</p>
            <div className="penalty-inline-actions">
              <input value={recruitPassport} placeholder="UUID public du Passeport" aria-label="Identifiant Passeport public" onChange={e=>setRecruitPassport(e.target.value.trim())}/>
              <button className="penalty-primary" disabled={busy||recruitPassport.length<32} onClick={()=>request('club.invite',{passportPublicId:recruitPassport}).then(()=>setRecruitPassport('')).catch(()=>{})}>Envoyer l’invitation</button>
            </div>
          </article>}

          <div className="penalty-roster">
            <div className="penalty-section-title"><div><span className="penalty-kicker">EFFECTIF</span><h2>Vestiaire du club</h2></div><b>{club.roster?.length||0} joueurs</b></div>
            {(club.roster||[]).map((member,index)=>(
              <article key={member.passportPublicId||index} className="penalty-roster-row" data-self={member.isSelf}>
                <div className="penalty-roster-number">{String(member.shirtNumber||10).padStart(2,'0')}</div>
                <div className="penalty-roster-main">
                  <b>{member.displayName}{member.isSelf?' · toi':''}</b>
                  <span>{countryById(member.countryId).flag} {member.shirtName} · {PLAYER_STYLES[member.styleId]?.name||'Technicien'} · {member.preferredRole==='keeper'?'Gardien':member.preferredRole==='attacker'?'Attaquant':'Polyvalent'}</span>
                  <small>{member.passportLabel||'Passeport 3B'} · {member.role==='owner'?'Fondateur':member.role==='captain'?'Capitaine':'Membre'}</small>
                </div>
                {!member.isSelf&&<div className="penalty-roster-actions">
                  {club.role==='owner'&&member.role!=='owner'&&<button className="penalty-secondary" disabled={busy} onClick={()=>request('club.member.role',{passportPublicId:member.passportPublicId,role:member.role==='captain'?'member':'captain'}).catch(()=>{})}>{member.role==='captain'?'Retirer capitaine':'Nommer capitaine'}</button>}
                  {canRecruit&&member.role!=='owner'&&<button className="penalty-danger" disabled={busy} onClick={()=>{if(window.confirm('Retirer ce joueur du club ?'))request('club.kick',{passportPublicId:member.passportPublicId}).catch(()=>{});}}>Retirer</button>}
                </div>}
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          {invites.length>0&&<div className="penalty-invite-list">
            <span className="penalty-kicker">INVITATIONS REÇUES</span>
            {invites.map(invite=><article key={invite.id}>
              <div><b>{invite.club?.name||'Club 3B'}</b><small>Expire {invite.expiresAt?new Date(invite.expiresAt).toLocaleString('fr-FR'):'bientôt'}</small></div>
              <div className="penalty-inline-actions">
                <button className="penalty-primary" disabled={busy} onClick={()=>request('club.invite.respond',{inviteId:invite.id,decision:'accept'}).catch(()=>{})}>Accepter</button>
                <button className="penalty-secondary" disabled={busy} onClick={()=>request('club.invite.respond',{inviteId:invite.id,decision:'decline'}).catch(()=>{})}>Refuser</button>
              </div>
            </article>)}
          </div>}
          <div className="penalty-club-actions">
            <article>
              <span className="penalty-kicker">FONDER</span><h3>Créer un club</h3>
              <input value={name} maxLength={40} placeholder="Nom du club" onChange={e=>setName(e.target.value)}/>
              <div className="penalty-color-row"><span>Principale</span><div>{SHIRT_COLORS.map(color=><button key={color} type="button" aria-label={'Couleur principale '+color} aria-pressed={colors.primary===color} style={{'--swatch':color}} onClick={()=>setColors(current=>({...current,primary:color}))}/>)}</div></div>
              <div className="penalty-color-row"><span>Secondaire</span><div>{SHIRT_COLORS.map(color=><button key={color} type="button" aria-label={'Couleur secondaire '+color} aria-pressed={colors.secondary===color} style={{'--swatch':color}} onClick={()=>setColors(current=>({...current,secondary:color}))}/>)}</div></div>
              <button className="penalty-primary" disabled={busy||name.trim().length<3||colors.primary===colors.secondary} onClick={()=>request('club.create',{name,colors}).catch(()=>{})}>Créer mon club</button>
            </article>
            <article>
              <span className="penalty-kicker">CODE PRIVÉ</span><h3>Rejoindre directement</h3>
              <p>Le code reste une solution rapide entre amis. Le recrutement officiel utilise une invitation Passeport.</p>
              <input value={code} maxLength={6} placeholder="CODE" onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6))}/>
              <button className="penalty-secondary" disabled={busy||code.trim().length!==6} onClick={()=>request('club.join',{code}).catch(()=>{})}>Rejoindre</button>
            </article>
          </div>
        </>
      )}
      <div className="penalty-rule-note"><b>Hiérarchie sécurisée :</b> fondateur → capitaine → membre. Les capitaines peuvent recruter et gérer des membres, mais seul le fondateur contrôle les capitaines et la dissolution.</div>
    </section>
  );
}

function InternationalPanel({ snapshot, profile, busy, request }) {
  const country=countryById(profile.countryId);
  const international=snapshot?.international||{};
  const ranked=snapshot?.ranked||{};
  const hasCallup=international.selectionStatus==='preselected'&&international.selectionId;
  const selected=international.selectionStatus==='selected';
  const neededRoleLabel=international.neededRole==='pression'
    ? 'Spécialiste des Duels d’Or'
    : PLAYER_STYLES[international.neededRole]?.name||null;
  const breakdown=international.scoreBreakdown||{};
  const phaseLabel={
    selection:'Sélection en cours',locked:'Liste verrouillée',active:'Matchs internationaux ouverts',
    closed:'Fenêtre fermée',planned:'À venir',
  }[international.windowStatus]||'Hors fenêtre';
  return (
    <section className="penalty-panel-page penalty-international-page">
      <span className="penalty-kicker">ÉQUIPE NATIONALE · {country.flag} {country.name}</span>
      <h1>La sélection se gagne sur des preuves, pas sur un bouton.</h1>
      <p>Le serveur combine ta saison classée, ton rang national, ta forme récente, ta réputation, les Duels d’Or, le besoin du groupe et ta discipline. Les achats et cosmétiques ne comptent jamais.</p>

      <div className="penalty-selection-path" aria-label="Parcours de sélection">
        {[
          ['01','Placements','Terminer les matchs de placement classé.'],
          ['02','Radar','Entrer dans les joueurs suivis du pays.'],
          ['03','Observation','Confirmer ta forme sur plusieurs matchs.'],
          ['04','Convocation','Recevoir une place dans la limite de l’effectif.'],
          ['05','Sélection','Accepter la convocation pendant la fenêtre.'],
          ['06','International','Jouer contre une autre sélection quand les matchs ouvrent.'],
        ].map(([step,title,text])=><article key={step} data-active={
          title==='Placements'?(ranked.placementsRemaining||0)>0:
          title==='Convocation'?hasCallup:
          title==='Sélection'?selected:
          title==='International'?international.matchOpen:false
        }><b>{step}</b><div><strong>{title}</strong><small>{text}</small></div></article>)}
      </div>

      {hasCallup&&<div className="penalty-callup" data-state="urgent">
        <Globe2 size={34}/><div>
          <span className="penalty-kicker">CONVOCATION OFFICIELLE</span>
          <b>LE PAYS A BESOIN DE TOI</b>
          <p>{country.name} t’a présélectionné{international.windowName?' pour '+international.windowName:''}. Profil recherché : {international.roleProfile||PLAYER_STYLES[profile.styleId]?.name||'polyvalent'}.</p>
          <div className="penalty-inline-actions">
            <button className="penalty-primary" disabled={busy} onClick={()=>request('international.respond',{selectionId:international.selectionId,decision:'accept'}).catch(()=>{})}>Accepter</button>
            <button className="penalty-secondary" disabled={busy} onClick={()=>request('international.respond',{selectionId:international.selectionId,decision:'decline'}).catch(()=>{})}>Décliner</button>
          </div>
        </div>
      </div>}

      {selected&&<div className="penalty-callup" data-state="selected">
        <Globe2 size={34}/><div>
          <span className="penalty-kicker">SÉLECTION CONFIRMÉE</span>
          <b>{country.flag} TU REPRÉSENTES {country.name.toUpperCase()}</b>
          <p>{international.matchOpen?'La fenêtre de matchs est ouverte. Tu peux entrer dans la file internationale.':`Ta place est enregistrée. Phase actuelle : ${phaseLabel}.`}</p>
          <button className="penalty-primary" disabled={busy||!international.matchOpen} onClick={()=>request('queue',{mode:'international'}).catch(()=>{})}><Globe2 size={17}/> Jouer pour {country.name}</button>
        </div>
      </div>}

      <div className="penalty-international-grid penalty-international-grid-v8">
        <article><small>RANG NATIONAL</small><strong>{international.nationalRank?'#'+international.nationalRank:'—'}</strong><span>{ranked.placementsRemaining?ranked.placementsRemaining+' placement(s) restant(s)':country.name}</span></article>
        <article><small>SCORE SÉLECTION</small><strong>{Math.round(international.selectionScore||0)}</strong><span>/ 100 · {scoutingLabel(international.scouting)}</span></article>
        <article><small>FORME · 10 DERNIERS</small><strong>{Math.round((international.recentForm?.winRate||0)*100)}%</strong><span>{international.recentForm?.wins||0} victoire(s) / {international.recentForm?.matches||0}</span></article>
        <article><small>PRESSION</small><strong>{Math.round((international.pressureScore||0)*100)}%</strong><span>Duels d’Or</span></article>
        <article><small>SÉLECTIONS</small><strong>{international.caps||0}</strong><span>{international.goals||0} but(s) international(aux)</span></article>
        <article><small>FENÊTRE</small><strong>{phaseLabel}</strong><span>{international.windowName||'Aucune fenêtre active'}</span></article>
      </div>

      <div className="penalty-scouting-breakdown">
        <div className="penalty-section-title"><div><span className="penalty-kicker">POURQUOI CE SCORE ?</span><h2>Lecture du sélectionneur serveur</h2></div><b>{neededRoleLabel?'Besoin : '+neededRoleLabel:'Besoin variable'}</b></div>
        <div className="penalty-scouting-bars">
          {[['Niveau classé',breakdown.rating,38],['Rang national',breakdown.rank,22],['Forme',breakdown.form,14],['Réputation',breakdown.reputation,10],['Pression',breakdown.pressure,10],['Profil recherché',breakdown.role,6]].map(([label,value,max])=><div key={label}><span>{label}</span><i><b style={{width:`${Math.max(0,Math.min(100,(Number(value||0)/Number(max))*100))}%`}}/></i><strong>{Number(value||0).toFixed(1)}</strong></div>)}
          {Number(breakdown.discipline||0)<0&&<div data-penalty="true"><span>Discipline / abandons</span><i><b style={{width:`${Math.min(100,Math.abs(Number(breakdown.discipline))*6.25)}%`}}/></i><strong>{Number(breakdown.discipline).toFixed(1)}</strong></div>}
        </div>
      </div>

      <div className="penalty-rule-note"><b>Règle nationale :</b> le classement seul ne garantit jamais une convocation. Il faut assez de matchs, une identité Passeport valide, une place disponible dans l’effectif et un dossier sportif cohérent.</div>
      <h2>Compétitions 3B</h2>
      <div className="penalty-competition-list">{COMPETITIONS.map(competition=><article key={competition.id}><b>{competition.name}</b><small>{competition.cadence}</small><p>{competition.description}</p></article>)}</div>
    </section>
  );
}

function CareerPanel({ snapshot, rating, tier, profile }) {
  const career=snapshot?.career||{};
  const ranked=snapshot?.ranked||{};
  const history=snapshot?.history||[];
  const international=snapshot?.international||{};
  const country=countryById(profile.countryId);
  const division=ranked.division||{label:'Placement'};
  const total=Number(ranked.wins||0)+Number(ranked.losses||0);
  const winRate=total?Math.round(Number(ranked.wins||0)/total*100):0;
  return (
    <section className="penalty-panel-page penalty-career-page">
      <span className="penalty-kicker">BIOGRAPHIE SPORTIVE · {ranked.season?.name||'CARRIÈRE'}</span>
      <h1>{profile.displayName} · {division.label}</h1>
      <p>{country.flag} {country.name} · {PLAYER_STYLES[profile.styleId]?.name} · {profile.clubName||'Sans club'} · archétype niveau {career.archetypeLevel||profile.archetypeLevel||1}/50.</p>

      <div className="penalty-career-stats penalty-career-stats-v8">
        <article><small>NOTE SAISON</small><strong>{ranked.rating||1000}</strong><span>{division.label}</span></article>
        <article><small>MATCHS CLASSÉS</small><strong>{ranked.games||0}</strong><span>{ranked.placementsRemaining?ranked.placementsRemaining+' placement(s) restant(s)':'Rang officiel'}</span></article>
        <article><small>VICTOIRES</small><strong>{ranked.wins||0}</strong><span>{winRate}% de victoire</span></article>
        <article><small>SÉRIE</small><strong>{ranked.streak||0}</strong><span>meilleure note {ranked.bestRating||ranked.rating||1000}</span></article>
        <article><small>RÉPUTATION</small><strong>{career.reputation||0}</strong><span>{tier.label}</span></article>
        <article><small>ARCHÉTYPE</small><strong>{career.archetypeLevel||1}</strong><span>{career.archetypeXp||0} AXP</span></article>
        <article><small>RANG NATIONAL</small><strong>{international.nationalRank?'#'+international.nationalRank:'—'}</strong><span>{scoutingLabel(international.scouting)}</span></article>
        <article><small>ABANDONS</small><strong>{ranked.forfeits||0}</strong><span>impactent la sélection</span></article>
        <article><small>BUTS CARRIÈRE</small><strong>{career.goals||0}</strong><span>tous duels officiels</span></article>
        <article><small>ARRÊTS</small><strong>{career.saves||0}</strong><span>gardien</span></article>
      </div>

      <div className="penalty-career-roadmap">
        <span className="penalty-kicker">PROGRESSION</span>
        <div>{[
          ['Passeport',snapshot?.passport?.competitiveReady?'validé':'à vérifier'],
          ['Saison',ranked.placementsRemaining?'placements':'classé'],
          ['Club',profile.clubName||'libre'],
          ['National',scoutingLabel(international.scouting)],
          ['International',(international.caps||0)+' sélection(s)'],
        ].map(([label,value])=><article key={label}><small>{label}</small><b>{value}</b></article>)}</div>
      </div>

      <div className="penalty-biography">
        <div className="penalty-section-title"><div><span className="penalty-kicker">CHRONOLOGIE</span><h2>Mes derniers matchs</h2></div><b>{history.length} événement(s)</b></div>
        {history.length?history.slice(0,20).map((event,index)=><div key={event.id||index} data-result={event.result}><span>{event.label||event.result||'Match 3B'}</span><small>{event.result} · {event.createdAt?new Date(event.createdAt).toLocaleString('fr-FR'):country.name}</small></div>):<p>Ta première ligne s’écrira après ton premier duel multijoueur.</p>}
      </div>
      <div className="penalty-rule-note"><b>Progression propre :</b> AXP, réputation, division et sélection viennent de matchs réglés côté serveur. La progression d’archétype débloque du prestige ; elle ne transforme pas le joueur en pay-to-win.</div>
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
  const inputMode = useMemo(() => penaltyInputMode(), []);
  const desktop = inputMode === 'desktop';
  const remaining = remainingPossessionSeconds(state, Date.now());
  const leftGesture = useRef(new PointerGesture());
  const rightGesture = useRef(new PointerGesture());
  const rightLastTap = useRef(0);
  const chargeFrame = useRef(0);
  const moveThrottle = useRef(0);
  const techniqueTracker = useRef(createTechniqueTracker());
  const keeperMoveThrottle = useRef(0);
  const moveInFlight = useRef(false);
  const pendingMove = useRef(null);
  const attackerActionInFlight = useRef(false);
  const pendingAttackerAction = useRef(null);
  const keeperMoveInFlight = useRef(false);
  const pendingKeeperMove = useRef(null);
  const keeperFinalAction = useRef(null);
  const keeperFaceTimer = useRef(0);
  const keeperFaceActive = useRef(0);
  const revisionRef = useRef(room.revision);
  const controlRef = useRef({ x:0, y:0, intensity:0, active:false, keeper:{ direction:0, forward:0, intensity:0, active:false } });
  const leftPadRef = useRef(null);
  const rightPadRef = useRef(null);
  const pitchRef = useRef(null);
  const desktopKeys = useRef(new Set());
  const desktopFrame = useRef(0);
  const desktopMoving = useRef(false);
  const desktopKeeperMoving = useRef(false);
  const desktopAim = useRef({ x:0, y:.42 });
  const desktopShot = useRef(null);
  const opponent = room.players?.find((player) => !player.isSelf);
  revisionRef.current = room.revision;
  useEffect(() => () => {
    cancelAnimationFrame(chargeFrame.current);
    cancelAnimationFrame(desktopFrame.current);
    clearInterval(keeperFaceTimer.current);
  }, []);

  useEffect(() => {
    if (!desktop || state.status === 'finished') return undefined;
    const gameplayCodes = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight']);
    const editable = target => target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName));
    const onKeyDown = event => {
      if (editable(event.target)) return;
      if (gameplayCodes.has(event.code)) event.preventDefault();
      desktopKeys.current.add(event.code);
      if (event.repeat) return;
      if (isAttacker) {
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sendAttackerFace('accelerate', 0, .96);
        else if (event.code === 'KeyQ') sendAttackerFace('feint', -.9, .86);
        else if (event.code === 'KeyE') sendAttackerFace('cut', .9, .92);
        else if (event.code === 'Space') sendAttackerFace('rhythm', desktopAim.current.x || 1, .86);
      } else if (isKeeper) {
        if (event.code === 'Space') keeperFaceAction('high-claim');
        else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') keeperFaceAction('close-angle');
      }
    };
    const onKeyUp = event => desktopKeys.current.delete(event.code);
    const clearKeys = () => desktopKeys.current.clear();
    window.addEventListener('keydown', onKeyDown, { passive:false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);

    const tick = () => {
      const input = keyboardVector(desktopKeys.current);
      const now = performance.now();
      if (isAttacker) {
        controlRef.current = { ...controlRef.current, x:input.x, y:input.y, intensity:input.intensity, active:input.active };
        if (input.active && now - moveThrottle.current >= 45) {
          moveThrottle.current = now;
          queueMove({ type:'move', x:input.x, y:input.y, intensity:input.intensity });
        } else if (!input.active && desktopMoving.current) {
          queueMove({ type:'move', x:0, y:0, intensity:0 });
        }
        desktopMoving.current = input.active;
      } else if (isKeeper) {
        const forward = -input.y;
        controlRef.current.keeper = { direction:input.x, forward, intensity:input.intensity, active:input.active };
        if (input.active && now - keeperMoveThrottle.current >= 45) {
          keeperMoveThrottle.current = now;
          queueKeeperMove({ type:'hold', direction:input.x, forward, intensity:input.intensity });
        } else if (!input.active && desktopKeeperMoving.current) {
          queueKeeperMove({ type:'hold', direction:0, forward:0, intensity:0 });
        }
        desktopKeeperMoving.current = input.active;
      }
      desktopFrame.current = requestAnimationFrame(tick);
    };
    desktopFrame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(desktopFrame.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      desktopKeys.current.clear();
      desktopMoving.current = false;
      desktopKeeperMoving.current = false;
      controlRef.current = { ...controlRef.current, x:0, y:0, intensity:0, active:false, keeper:{ direction:0, forward:0, intensity:0, active:false } };
    };
  }, [desktop, isAttacker, isKeeper, state.status, room.id]);

  function flushMove() {
    if (moveInFlight.current || attackerActionInFlight.current || !pendingMove.current) return;
    const input = pendingMove.current;
    pendingMove.current = null;
    moveInFlight.current = true;
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .then((data) => { if (data?.room?.revision != null) revisionRef.current = data.room.revision; })
      .catch(() => {})
      .finally(() => {
        moveInFlight.current = false;
        if (pendingAttackerAction.current) flushAttackerAction();
        else if (pendingMove.current) flushMove();
      });
  }

  function flushAttackerAction() {
    if (attackerActionInFlight.current || moveInFlight.current || !pendingAttackerAction.current) return;
    const input = pendingAttackerAction.current;
    pendingAttackerAction.current = null;
    attackerActionInFlight.current = true;
    request('input', { room:room.id, revision:revisionRef.current, input }, { silent:true })
      .then((data) => { if (data?.room?.revision != null) revisionRef.current = data.room.revision; })
      .catch(() => {})
      .finally(() => {
        attackerActionInFlight.current = false;
        if (pendingAttackerAction.current) flushAttackerAction();
        else if (pendingMove.current) flushMove();
      });
  }

  function queueAttackerAction(input) {
    pendingAttackerAction.current = input;
    flushAttackerAction();
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
    controlRef.current = isKeeper
      ? { ...controlRef.current, keeper:{ direction:0, forward:0, intensity:0, active:false } }
      : { ...controlRef.current, x:0, y:0, intensity:0, active:false };
    techniqueTracker.current = createTechniqueTracker();
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
    if ((!isAttacker && !isKeeper) || state.status === 'finished' || event.button !== 0) return;
    if (!leftGesture.current.begin(event.pointerId, { x:event.clientX, y:event.clientY })) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.active = 'true';
  }

  function leftMove(event) {
    const start = leftGesture.current.get(event.pointerId);
    if (!start || (!isAttacker && !isKeeper)) return;
    const sample = coalescedPointerSample(event) || event;
    const radius = Math.max(68, Math.min(96, (leftPadRef.current?.clientWidth || 176) * .52));
    const input = shapeJoystick(sample.clientX - start.x, sample.clientY - start.y, { deadZone:7, radius });
    const pad = leftPadRef.current;
    if (pad) {
      pad.style.setProperty('--stick-x', (input.x * input.visual).toFixed(1) + 'px');
      pad.style.setProperty('--stick-y', (input.y * input.visual).toFixed(1) + 'px');
      pad.style.setProperty('--stick-power', input.intensity.toFixed(3));
    }

    const now = performance.now();
    if (isKeeper) {
      const forward = -input.y;
      controlRef.current.keeper = { direction:input.x, forward, intensity:input.intensity, active:input.active };
      if (now - keeperMoveThrottle.current >= 45) {
        keeperMoveThrottle.current = now;
        queueKeeperMove({ type:'hold', direction:input.x, forward, intensity:input.intensity });
      }
      return;
    }

    controlRef.current = {
      ...controlRef.current,
      x:input.x,
      y:input.y,
      intensity:input.intensity,
      active:input.active,
    };
    const technique = detectJoystickTechnique(techniqueTracker.current, input, now);
    if (technique) {
      pad?.setAttribute('data-technique', technique.label);
      window.setTimeout(() => pad?.removeAttribute('data-technique'), 420);
      sendAttackerFace(technique.type, technique.direction, technique.intensity);
    }

    if (now - moveThrottle.current < 42) return;
    moveThrottle.current = now;
    queueMove({ type:'move', x:input.x, y:input.y, intensity:input.intensity });
  }

  function leftEnd(event) {
    if (!leftGesture.current.end(event.pointerId)) return;
    resetLeftPad();
    if (isKeeper) queueKeeperMove({ type:'hold', direction:0, forward:0, intensity:0 });
    else queueMove({ type:'move', x:0, y:0, intensity:0 });
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
      controlRef.current.keeper = { direction:0, forward:0, intensity:0, active:true };
    }
  }

  function rightMove(event) {
    const gesture = rightGesture.current.get(event.pointerId);
    if (!gesture) return;
    const sample = coalescedPointerSample(event) || event;
    gesture.path.push({ x:sample.clientX, y:sample.clientY });
    if (gesture.path.length > 24) gesture.path.shift();

    const dx = sample.clientX - gesture.x;
    const dy = sample.clientY - gesture.y;
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
      const forward = Math.max(-1, Math.min(1, -dy / 115));
      controlRef.current.keeper = { direction, forward, intensity, active:effectiveDistance > 0 };
      const now = performance.now();
      if (now - keeperMoveThrottle.current >= 50) {
        keeperMoveThrottle.current = now;
        queueKeeperMove({ type:'hold', direction, forward, intensity });
      }
    }
  }

  function rightEnd(event) {
    const gesture = rightGesture.current.end(event.pointerId);
    if (!gesture) return;
    resetRightPad();
    if (isKeeper) {
      controlRef.current.keeper = { direction:0, forward:0, intensity:0, active:false };
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
      controlRef.current.keeper = { direction:0, forward:0, intensity:0, active:false };
      pendingKeeperMove.current = null;
      queueKeeperFinal({ type:'hold', direction:0, forward:0, intensity:0 });
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
    queueAttackerAction(input);
  }

  function keeperFaceStart(direction, event) {
    if (!isKeeper || busy || state.status === 'finished') return;
    unlockPenaltyAudio().catch(() => {});
    vibrateFace(6);
    clearInterval(keeperFaceTimer.current);
    keeperFaceActive.current = direction;
    event?.currentTarget?.setPointerCapture?.(event.pointerId);
    const stream = () => {
      controlRef.current.keeper = { direction, forward:0, intensity:.78, active:true };
      queueKeeperMove({ type:'hold', direction, forward:0, intensity:.78 });
    };
    stream();
    keeperFaceTimer.current = window.setInterval(stream, 70);
  }

  function keeperFaceEnd(direction) {
    if (!isKeeper || keeperFaceActive.current !== direction) return;
    keeperFaceActive.current = 0;
    clearInterval(keeperFaceTimer.current);
    keeperFaceTimer.current = 0;
    controlRef.current.keeper = { direction:0, forward:0, intensity:0, active:false };
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

  function updateDesktopAim(event) {
    if (!desktop || !pitchRef.current) return;
    const sample = coalescedPointerSample(event) || event;
    desktopAim.current = pointerAim(sample, pitchRef.current);
    pitchRef.current.style.setProperty('--pc-aim-x', ((desktopAim.current.x + 1) * 50).toFixed(2) + '%');
    pitchRef.current.style.setProperty('--pc-aim-y', ((1 - desktopAim.current.y) * 72 + 8).toFixed(2) + '%');
  }

  function desktopPointerDown(event) {
    if (!desktop || state.status === 'finished') return;
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
    updateDesktopAim(event);
    if (event.button === 2) {
      event.preventDefault();
      if (isAttacker) {
        const dir = desktopAim.current.x < 0 ? -1 : 1;
        sendAttackerFace(Math.abs(desktopAim.current.x) > .42 ? 'cut' : 'feint', dir, .88);
      } else if (isKeeper) keeperFaceAction('close-angle');
      return;
    }
    if (event.button !== 0) return;
    unlockPenaltyAudio().catch(() => {});
    if (isAttacker) {
      desktopShot.current = { at:performance.now(), x:event.clientX };
      event.currentTarget.dataset.pcCharging = 'true';
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } else if (isKeeper) {
      const aim = desktopAim.current;
      const type = aim.y > .76 ? 'high-claim' : Math.abs(aim.x) < .16 ? 'close-angle' : 'dive';
      queueKeeperFinal({ type, direction:aim.x, intensity:.94 });
    }
  }

  function desktopPointerUp(event) {
    if (!desktop || !isAttacker || event.button !== 0 || !desktopShot.current) return;
    updateDesktopAim(event);
    const shotStart = desktopShot.current;
    desktopShot.current = null;
    event.currentTarget.dataset.pcCharging = 'false';
    const heldMs = Math.max(330, Math.min(1200, performance.now() - shotStart.at));
    const aim = desktopAim.current;
    const rect = pitchRef.current?.getBoundingClientRect?.();
    const curve = rect ? Math.max(-.62, Math.min(.62, (event.clientX - shotStart.x) / Math.max(80, rect.width * .34))) : 0;
    const parsed = interpretAttackGesture({
      dx:aim.x * 125,
      dy:-aim.y * 135,
      durationMs:heldMs,
      heldMs,
      curve,
      taps:0,
    });
    queueAttackerAction(parsed);
  }

  function desktopPointerCancel(event) {
    if (!desktopShot.current) return;
    desktopShot.current = null;
    if (event.currentTarget) event.currentTarget.dataset.pcCharging = 'false';
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

      <section ref={pitchRef} className="penalty-pitch penalty-pitch-3d" data-input={inputMode} data-pc-charging="false"
        onPointerMove={desktop ? updateDesktopAim : undefined}
        onPointerDown={desktop ? desktopPointerDown : undefined}
        onPointerUp={desktop ? desktopPointerUp : undefined}
        onPointerCancel={desktop ? desktopPointerCancel : undefined}
        onContextMenu={desktop ? (event) => event.preventDefault() : undefined}>
        <Suspense fallback={<div className="penalty-arena3d-fallback"><b>Terrain 3B</b><span>Chargement du match 3D…</span></div>}>
          <PenaltyRushArena3D room={room} profile={profile} selfIndex={selfIndex} controlRef={controlRef} />
        </Suspense>

        {isKeeper && <div className="penalty-power-dock">{powerIds.map((id) => <button key={id} disabled={(state.keeperEnergy?.[selfIndex] ?? 100) < (KEEPER_POWERS[id]?.cost || 100)} onClick={() => activatePower(id)}><i>{powerIcon(id)}</i><span>{KEEPER_POWERS[id]?.name}</span></button>)}</div>}

        {!desktop && (isAttacker || isKeeper) && <div ref={leftPadRef} className="penalty-touch-left" data-active="false" aria-label={isKeeper ? 'Déplacement libre du gardien' : 'Déplacement de l’attaquant'} onPointerDown={leftStart} onPointerMove={leftMove} onPointerUp={leftEnd} onPointerCancel={leftEnd} onLostPointerCapture={leftEnd}><span /></div>}
        {!desktop && (isAttacker || isKeeper) && <div className="penalty-face-cluster" data-role={isAttacker ? 'attacker' : 'keeper'} aria-label="Commandes d’action 3B">
          <button className="penalty-face penalty-face-top" data-tone="3b" aria-label={isAttacker ? 'Accélération 3B' : 'Sortie haute 3B'} onPointerDown={() => isAttacker ? sendAttackerFace('accelerate', 0, .95) : keeperFaceAction('high-claim')}><b>3B</b><small>{isAttacker ? 'BOOST' : 'HAUT'}</small></button>
          <button className="penalty-face penalty-face-left" data-tone="black" aria-label={isAttacker ? 'Feinte noire gauche' : 'Plongeon gauche'} onPointerDown={(e) => isAttacker ? sendAttackerFace('feint', -.86, .82) : keeperFaceStart(-1, e)} onPointerUp={() => isKeeper && keeperFaceEnd(-1)} onPointerCancel={() => isKeeper && keeperFaceEnd(-1)} onLostPointerCapture={() => isKeeper && keeperFaceEnd(-1)}><b>N</b><small>{isAttacker ? 'FEINTE' : 'GAUCHE'}</small></button>
          <button className="penalty-face penalty-face-right" data-tone="white" aria-label={isAttacker ? 'Crochet blanc droite' : 'Plongeon droite'} onPointerDown={(e) => isAttacker ? sendAttackerFace('cut', .86, .9) : keeperFaceStart(1, e)} onPointerUp={() => isKeeper && keeperFaceEnd(1)} onPointerCancel={() => isKeeper && keeperFaceEnd(1)} onLostPointerCapture={() => isKeeper && keeperFaceEnd(1)}><b>B</b><small>{isAttacker ? 'CROCHET' : 'DROITE'}</small></button>
          <div ref={rightPadRef} className="penalty-face penalty-face-bottom penalty-face-shot" data-tone="beur" data-active="false" data-charging="false" aria-label={isAttacker ? 'Frappe Beur or avec puissance et effet' : 'Fermeture d’angle Beur or'} onPointerDown={isAttacker ? rightStart : () => keeperFaceAction('close-angle')} onPointerMove={isAttacker ? rightMove : undefined} onPointerUp={isAttacker ? rightEnd : undefined} onPointerCancel={isAttacker ? rightCancel : undefined} onLostPointerCapture={isAttacker ? rightCancel : undefined}>
            <b>{isAttacker ? 'OR' : 'O'}</b><small>{isAttacker ? 'FRAPPE' : 'ANGLE'}</small>
            {isAttacker && <i className="penalty-shot-charge" aria-hidden="true"><b /></i>}
          </div>
        </div>}

        {desktop && (isAttacker || isKeeper) && <><span className="penalty-pc-reticle" aria-hidden="true" /><div className="penalty-pc-controls" aria-hidden="true">{isAttacker ? 'FLÈCHES / WASD · SHIFT BOOST · Q FEINTE · E CROCHET · ESPACE ROULETTE · CLIC MAINTENU = TIR' : 'FLÈCHES / WASD = DÉPLACEMENT LIBRE · CLIC = PLONGEON · ESPACE = SORTIE HAUTE · SHIFT = FERMER L’ANGLE'}</div></>}
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
