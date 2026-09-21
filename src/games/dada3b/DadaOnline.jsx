import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Copy,RefreshCw,Users,Wifi,WifiOff,X} from 'lucide-react';
import {useLoyalty} from '../../loyalty/LoyaltyContext.jsx';
import {
  COUNTRIES_3B,
  DEFAULT_RULES,
  FINISH_STEP,
  HOME_LENGTH,
  SANCTUARY_CELLS,
  STABLE,
  TRACK_LENGTH,
  blockadeOwnerAt,
  countryFor,
  globalCellFor,
  homeIndexFor,
  readMatchSnapshot,
  scoreFor,
} from './engine.js';
import {createDadaFeedback,readDadaFeedbackPreferences} from './feedback.js';
import {
  dadaOnlineRequest,
  rememberDadaRoom,
  rememberedDadaRoom,
  subscribeDadaRoom,
} from './online.js';

const DICE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

const THEME_LABELS={
  nexus:'Nexus 3B',fr:'France · Justice',dz:'Algérie · Loyauté',es:'Espagne · Passion',
  ma:'Maroc · Noblesse',it:'Italie · Espoir',tn:'Tunisie · Courage',tr:'Turquie · Foi',ee:'Estonie · Sagesse',
};

function polar(angleDeg,radius){
  const angle=(angleDeg*Math.PI)/180;
  return{left:50+Math.cos(angle)*radius,top:50+Math.sin(angle)*radius};
}
function trackPosition(index){return polar(-90+(index*360)/TRACK_LENGTH,38.8);}
function homePosition(country,index){
  const angle=-90+(country.start*360)/TRACK_LENGTH;
  return polar(angle,31.8-index*4.15);
}
function stableCenter(country){return polar(-90+(country.start*360)/TRACK_LENGTH,44.1);}
function finishedPosition(country,pieceIndex){
  const angle=-90+(country.start*360)/TRACK_LENGTH+pieceIndex*4-6;
  return polar(angle,6.4+(pieceIndex%2)*1.25);
}
function positionForPiece(country,steps,pieceIndex){
  if(steps===STABLE){
    const base=stableCenter(country),angle=(pieceIndex*Math.PI)/2+Math.PI/4;
    return{left:base.left+Math.cos(angle)*2.65,top:base.top+Math.sin(angle)*2.65};
  }
  if(steps===FINISH_STEP)return finishedPosition(country,pieceIndex);
  if(steps>=TRACK_LENGTH)return homePosition(country,homeIndexFor(steps));
  const base=trackPosition(globalCellFor(country.id,steps)),angle=(pieceIndex*Math.PI)/2;
  return{left:base.left+Math.cos(angle)*.72,top:base.top+Math.sin(angle)*.72};
}

function GuardianTotem({country,pieceIndex}){
  return <svg className="dada3b-totem" viewBox="0 0 40 48" aria-hidden="true">
    <path className="dada3b-totem-aura" d="M20 1 34 9 37 27 28 44 12 44 3 27 6 9Z"/>
    <circle className="dada3b-totem-head" cx="20" cy="12" r="6.2"/>
    <path className="dada3b-totem-body" d="M9 38c1-12 3-19 11-19s10 7 11 19l-6 5H15Z"/>
    <path className="dada3b-totem-cape" d={pieceIndex%2?'M11 25 5 39h10l5-20Z':'M29 25 35 39H25l-5-20Z'}/>
    <circle className="dada3b-totem-core" cx="20" cy="28.5" r="5.5"/>
    <text x="20" y="31.5" textAnchor="middle">{country.crest}</text>
  </svg>;
}

function safeState(value){
  try{return readMatchSnapshot(value);}catch{return null;}
}

function OnlineBoard({room,motion,blast,focus,busy,onPiece}){
  const state=safeState(room?.state);
  if(!state)return <div className="dada3b-online-empty">Synchronisation du plateau…</div>;
  const activeCountries=state.players.map(player=>countryFor(player.countryId)).filter(Boolean);
  const activeIds=new Set(activeCountries.map(country=>country.id));
  const startMap=new Map(COUNTRIES_3B.map(country=>[country.start,country]));
  const self=room.players.find(player=>player.isSelf);
  const canControl=Boolean(self&&!self.botTakeover&&state.players[state.turn]?.countryId===self.countryId);
  const style=focus?{'--focus-x':focus.left+'%','--focus-y':focus.top+'%'}:undefined;

  return <div className="dada3b-board" data-theme={state.rules.boardTheme} data-focus={Boolean(focus)} style={style}>
    <div className="dada3b-board-atmosphere" aria-hidden="true"/>
    {Array.from({length:TRACK_LENGTH},(_,index)=>{
      const pos=trackPosition(index),startCountry=startMap.get(index),activeStart=startCountry&&activeIds.has(startCountry.id);
      const blockade=blockadeOwnerAt(state,index);
      return <span key={index} className="dada3b-track-cell" data-start={Boolean(activeStart)}
        data-safe={SANCTUARY_CELLS.includes(index)} data-blockade={blockade!==null}
        style={{left:pos.left+'%',top:pos.top+'%','--cell-color':activeStart?startCountry.accent:'#bca56f'}} aria-hidden="true">
        {activeStart?startCountry.code:SANCTUARY_CELLS.includes(index)?'◇':''}
      </span>;
    })}
    {activeCountries.flatMap(country=>Array.from({length:HOME_LENGTH},(_,index)=>{
      const pos=homePosition(country,index);
      return <span key={country.id+'-'+index} className="dada3b-home-cell"
        style={{left:pos.left+'%',top:pos.top+'%','--cell-color':country.accent}} aria-hidden="true"/>;
    }))}
    <div className="dada3b-nexus" aria-hidden="true"><div><strong>3B</strong><small>NEXUS</small>
      <i>{state.players.reduce((sum,player)=>sum+player.pieces.filter(piece=>piece.steps===FINISH_STEP).length,0)}</i>
    </div></div>
    {state.players.map(player=>{
      const country=countryFor(player.countryId),pos=stableCenter(country),stable=player.pieces.filter(piece=>piece.steps===STABLE).length;
      return <div key={'stable-'+country.id} className="dada3b-stable"
        style={{left:pos.left+'%',top:pos.top+'%','--country':country.accent}} aria-hidden="true">
        <span>{country.code}</span><small>{stable} ÉCURIE</small>
      </div>;
    })}
    {state.players.flatMap((player,playerIndex)=>{
      const country=countryFor(player.countryId);
      return player.pieces.map((piece,pieceIndex)=>{
        const shown=motion?.countryId===player.countryId&&motion.pieceIndex===pieceIndex?motion.step:piece.steps;
        const pos=positionForPiece(country,shown,pieceIndex);
        const legal=canControl&&!busy&&playerIndex===state.turn&&state.pendingMoves.includes(pieceIndex)&&!motion;
        return <button key={country.id+'-'+pieceIndex} type="button" className="dada3b-piece"
          data-shape={country.shape} data-legal={legal} data-finished={piece.steps===FINISH_STEP}
          style={{left:pos.left+'%',top:pos.top+'%','--country':country.accent}}
          disabled={!legal} onClick={()=>onPiece(pieceIndex)}
          aria-label={country.name+', totem '+(pieceIndex+1)+(legal?', jouable':'')}>
          <GuardianTotem country={country} pieceIndex={pieceIndex}/>
        </button>;
      });
    })}
    {blast&&<span key={blast.key} className="dada3b-burst" style={{left:blast.left+'%',top:blast.top+'%'}} aria-hidden="true"/>}
  </div>;
}

function CountryPicker({value,onChange}){
  return <div className="dada3b-online-country-grid">
    {COUNTRIES_3B.map(country=><button key={country.id} type="button" aria-pressed={value===country.id}
      style={{'--country':country.accent}} onClick={()=>onChange(country.id)}>
      <span>{country.flag}</span><b>{country.name}</b><small>{country.guardian} · {country.value}</small>
    </button>)}
  </div>;
}

function ModeMenu({country,setCountry,code,setCode,maxPlayers,setMaxPlayers,rules,setRules,onCreate,onJoin,onQueue,onSpectate,onResume,resumeId,onLeaderboard,busy}){
  return <main className="dada3b-online-menu">
    <section className="dada3b-online-hero">
      <span className="dada3b-kicker">Multijoueur autoritaire · Supabase</span>
      <h2>Le Cercle, maintenant entre joueurs.</h2>
      <p>Le serveur lance le dé, valide chaque mouvement et synchronise tous les appareils. Aucun téléphone ne peut déclarer lui-même une victoire.</p>
      {resumeId&&<button type="button" className="dada3b-online-resume" onClick={onResume} disabled={busy}>
        <RefreshCw size={18}/><span><b>Reprendre ma partie en ligne</b><small>Synchroniser le dernier salon connu</small></span>
      </button>}
    </section>

    <section className="dada3b-online-panel">
      <span className="dada3b-kicker">1 · Ta nation</span>
      <h3>Choisis ton Totem-Gardien</h3>
      <CountryPicker value={country} onChange={setCountry}/>
    </section>

    <section className="dada3b-online-modes">
      <article>
        <span className="dada3b-kicker">Salon privé</span><h3>2 à 8 joueurs</h3>
        <p>Crée un code à six caractères, choisis les règles, puis invite tes amis.</p>
        <label>Places
          <select value={maxPlayers} onChange={event=>setMaxPlayers(Number(event.target.value))}>
            {[2,3,4,5,6,7,8].map(value=><option key={value}>{value}</option>)}
          </select>
        </label>
        <label>Timer
          <select value={rules.timerSeconds} onChange={event=>setRules(current=>({...current,timerSeconds:Number(event.target.value)}))}>
            <option value={20}>20 s</option><option value={30}>30 s</option><option value={45}>45 s</option>
          </select>
        </label>
        <div className="dada3b-online-rulechecks">
          <label><input type="checkbox" checked={rules.safeCells} onChange={event=>setRules(current=>({...current,safeCells:event.target.checked}))}/> Sanctuaires</label>
          <label><input type="checkbox" checked={rules.barricades} onChange={event=>setRules(current=>({...current,barricades:event.target.checked}))}/> Boucliers</label>
          <label><input type="checkbox" checked={rules.captureRequired} onChange={event=>setRules(current=>({...current,captureRequired:event.target.checked}))}/> Capture prioritaire</label>
        </div>
        <button type="button" className="dada3b-primary" onClick={onCreate} disabled={busy}>Créer le salon</button>
      </article>

      <article>
        <span className="dada3b-kicker">Invitation</span><h3>Rejoindre un code</h3>
        <p>Le code ne contient ni I, ni O pour éviter les erreurs de lecture.</p>
        <input className="dada3b-code-input" value={code} maxLength={6} placeholder="ABC234"
          onChange={event=>setCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6))}/>
        <div className="dada3b-online-row">
          <button type="button" className="dada3b-primary" onClick={onJoin} disabled={busy||code.length!==6}>Jouer</button>
          <button type="button" className="dada3b-secondary" onClick={onSpectate} disabled={busy||code.length!==6}>Spectateur</button>
        </div>
      </article>

      <article>
        <span className="dada3b-kicker">Matchmaking</span><h3>Jeu rapide</h3>
        <p>Deux joueurs, règles équilibrées, 30 secondes par tour. Si personne n’attend, une file est créée.</p>
        <button type="button" className="dada3b-primary" onClick={()=>onQueue('quick')} disabled={busy}>Chercher un joueur</button>
      </article>

      <article>
        <span className="dada3b-kicker">Compétitif</span><h3>Classé 1v1</h3>
        <p>Capture prioritaire, 20 secondes par tour et classement serveur. Le résultat est enregistré une seule fois.</p>
        <button type="button" className="dada3b-primary" onClick={()=>onQueue('ranked')} disabled={busy}>Entrer en classé</button>
        <button type="button" className="dada3b-secondary" onClick={onLeaderboard} disabled={busy}>Voir le classement</button>
      </article>
    </section>
  </main>;
}

function Lobby({room,busy,onReady,onStart,onLeave,onCopy}){
  const self=room.players.find(player=>player.isSelf);
  const allReady=room.players.length>=2&&room.players.every(player=>player.ready);
  return <main className="dada3b-online-lobby">
    <section className="dada3b-lobby-code">
      <span className="dada3b-kicker">{room.mode==='private'?'Salon privé':'Matchmaking'}</span>
      <h2>{room.code}</h2>
      <button type="button" className="dada3b-secondary" onClick={onCopy}><Copy size={15}/> Copier le code</button>
      <p>{room.players.length}/{room.maxPlayers} joueurs · {room.spectators.length}/8 spectateurs</p>
    </section>
    <section className="dada3b-lobby-players">
      {room.players.map((player,index)=>{
        const country=countryFor(player.countryId);
        return <article key={country.id+index} style={{'--country':country.accent}}>
          <span>{country.flag}</span><div><b>{player.name}{player.isSelf?' · toi':''}</b><small>{country.name} · {country.guardian}</small></div>
          <strong data-ready={player.ready}>{player.ready?'PRÊT':'ATTENTE'}</strong>
        </article>;
      })}
      {Array.from({length:Math.max(0,room.maxPlayers-room.players.length)},(_,index)=><article className="dada3b-lobby-empty" key={'empty-'+index}><Users size={18}/><span>Place disponible</span></article>)}
    </section>
    {room.spectators.length>0&&<p className="dada3b-lobby-spectators">Spectateurs : {room.spectators.map(entry=>entry.name+(entry.isSelf?' (toi)':'')).join(' · ')}</p>}
    <div className="dada3b-lobby-actions">
      {self&&room.mode==='private'&&<button type="button" className="dada3b-secondary" disabled={busy} onClick={()=>onReady(!self.ready)}>{self.ready?'Je ne suis plus prêt':'Je suis prêt'}</button>}
      {room.isHost&&room.mode==='private'&&<button type="button" className="dada3b-primary" disabled={busy||!allReady} onClick={onStart}>Ouvrir le Cercle</button>}
      <button type="button" className="dada3b-secondary" disabled={busy} onClick={onLeave}>Quitter le salon</button>
    </div>
  </main>;
}

function Leaderboard({rows,onBack}){
  return <main className="dada3b-online-leaderboard">
    <button type="button" className="dada3b-secondary" onClick={onBack}><ArrowLeft size={15}/> Retour</button>
    <span className="dada3b-kicker">Classement DADA 3B</span><h2>Les Gardiens classés</h2>
    <div>
      {rows.length?rows.map(row=><article key={row.rank+'-'+row.handle}>
        <strong>#{row.rank}</strong><span><b>{row.handle}</b><small>{row.games} parties · {row.wins} victoires · série {row.streak}</small></span><em>{row.rating}</em>
      </article>):<p>Aucune partie classée terminée pour l’instant.</p>}
    </div>
  </main>;
}

export default function DadaOnline({onBack,onClose,onAccount}){
  const account=useLoyalty();
  const [country,setCountry]=useState('fr');
  const [code,setCode]=useState('');
  const [maxPlayers,setMaxPlayers]=useState(4);
  const [rules,setRules]=useState({...DEFAULT_RULES,timerSeconds:30});
  const [room,setRoom]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [connection,setConnection]=useState('idle');
  const [leaderboard,setLeaderboard]=useState(null);
  const [turnRemaining,setTurnRemaining]=useState(0);
  const [motion,setMotion]=useState(null);
  const [blast,setBlast]=useState(null);
  const [focus,setFocus]=useState(null);
  const feedback=useRef(null);
  const serverOffset=useRef(0);
  const syncBusy=useRef(false);
  const animationToken=useRef(0);
  const lastEvent=useRef(0);
  const resumeId=rememberedDadaRoom();

  if(!feedback.current)feedback.current=createDadaFeedback(readDadaFeedbackPreferences());

  useEffect(()=>()=>{animationToken.current+=1;feedback.current?.close();},[]);

  const applyData=useCallback((data)=>{
    if(data?.serverTime)serverOffset.current=Date.parse(data.serverTime)-Date.now();
    if(data?.room){
      setRoom(data.room);
      rememberDadaRoom(data.room.id);
      setError('');
      setConnection('online');
      if(data.room.status==='finished')setBusy(false);
    }
  },[]);

  const request=useCallback(async(action,payload={},quiet=false)=>{
    if(!quiet)setBusy(true);
    try{
      const data=await dadaOnlineRequest(action,payload);
      applyData(data);
      return data;
    }catch(err){
      setConnection(err.status===0?'offline':'error');
      setError(err.message||'Erreur réseau.');
      if(err.status===409&&room?.id&&action!=='status'){
        try{applyData(await dadaOnlineRequest('status',{room:room.id}));}catch{}
      }
      throw err;
    }finally{
      if(!quiet)setBusy(false);
    }
  },[applyData,room?.id]);

  const sync=useCallback(async(id=room?.id)=>{
    if(!id||syncBusy.current)return;
    syncBusy.current=true;
    try{
      applyData(await dadaOnlineRequest('status',{room:id}));
    }catch(err){
      setConnection(err.status===0?'offline':'error');
      if(err.status===404||err.status===403){rememberDadaRoom(null);setRoom(null);}
    }finally{syncBusy.current=false;}
  },[applyData,room?.id]);

  useEffect(()=>{
    if(!room?.id)return undefined;
    const unsubscribe=subscribeDadaRoom(room.id,()=>sync(room.id),status=>{
      setConnection(status==='SUBSCRIBED'?'online':status==='CHANNEL_ERROR'?'offline':connection);
    });
    const timer=setInterval(()=>sync(room.id),4500);
    const visible=()=>{if(!document.hidden)sync(room.id);};
    document.addEventListener('visibilitychange',visible);
    return()=>{unsubscribe();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[room?.id,sync]);

  useEffect(()=>{
    if(!room?.turnDeadline||room.status!=='active'){setTurnRemaining(0);return undefined;}
    const update=()=>{
      const now=Date.now()+serverOffset.current;
      setTurnRemaining(Math.max(0,Math.ceil((Date.parse(room.turnDeadline)-now)/1000)));
    };
    update();
    const timer=setInterval(update,250);
    return()=>clearInterval(timer);
  },[room?.turnDeadline,room?.revision,room?.status]);

  useEffect(()=>{
    const state=safeState(room?.state),event=state?.lastEvent;
    if(!event?.id||event.id===lastEvent.current)return;
    if(lastEvent.current===0){lastEvent.current=event.id;return;}
    lastEvent.current=event.id;
    const token=++animationToken.current;
    const run=async()=>{
      if(Number.isInteger(event.pieceIndex)&&Number.isInteger(event.to)){
        const steps=event.from===STABLE?[0]:Array.from({length:Math.max(0,event.to-event.from)},(_,index)=>event.from+index+1);
        for(const step of steps){
          if(token!==animationToken.current)return;
          setMotion({countryId:event.countryId,pieceIndex:event.pieceIndex,step});
          await wait(90);
        }
      }
      if(token!==animationToken.current)return;
      setMotion(null);
      if(event.type==='capture'&&event.landing!==null){
        const point=trackPosition(event.landing);
        setBlast({...point,key:Date.now()});setFocus(point);
        setTimeout(()=>setBlast(null),850);setTimeout(()=>setFocus(null),1050);
      }else if(event.type==='finish'||event.type==='victory'){
        setFocus({left:50,top:50});setTimeout(()=>setFocus(null),1100);
      }
      feedback.current?.event(event.type==='triple-six'?'tripleSix':event.type||'move');
    };
    run();
  },[room?.state?.sequence]);

  const create=()=>request('create',{mode:'private',countryId:country,maxPlayers,rules}).catch(()=>{});
  const join=()=>request('join',{code,countryId:country}).catch(()=>{});
  const spectate=()=>request('spectate',{code}).catch(()=>{});
  const queue=(mode)=>request('queue',{mode,countryId:country,rules}).catch(()=>{});
  const resume=()=>resumeId&&request('status',{room:resumeId}).catch(()=>{});
  const showLeaderboard=async()=>{
    setBusy(true);
    try{const data=await dadaOnlineRequest('leaderboard');setLeaderboard(data.leaderboard||[]);setError('');}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  };
  const leave=async()=>{
    if(!room?.id)return;
    const active=room.status==='active';
    try{await dadaOnlineRequest('leave',{room:room.id});}catch{}
    if(!active)rememberDadaRoom(null);
    setRoom(null);
    setError(active?'Ton pays passe en IA Gardien. Tu peux reprendre la partie depuis ce menu.':'');
  };
  const copyCode=()=>{
    if(!room?.code)return;
    navigator.clipboard?.writeText(room.code).then(()=>setError('Code copié.')).catch(()=>setError('Code : '+room.code));
  };

  if(!account.user){
    return <div className="dada3b-shell">
      <header className="dada3b-topbar"><div><small>Jeux 3B · En ligne</small><strong>DADA 3B MULTIJOUEUR</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
      <main className="dada3b-online-login"><Wifi size={42}/><span className="dada3b-kicker">Identité joueur obligatoire</span><h2>Connecte ton Passeport 3B.</h2>
        <p>Le multijoueur utilise ton compte pour la reconnexion, le classement et les récompenses serveur. Le jeu local reste accessible sans compte.</p>
        <div><button className="dada3b-primary" onClick={onAccount}>Connexion / inscription</button><button className="dada3b-secondary" onClick={onBack}>Revenir au jeu local</button></div>
      </main>
    </div>;
  }

  const state=safeState(room?.state);
  const self=room?.players?.find(player=>player.isSelf);
  const isSpectator=Boolean(room&&!self);
  const currentCountry=state?countryFor(state.players[state.turn]?.countryId):null;
  const canRoll=Boolean(room?.status==='active'&&self&&!self.botTakeover&&state?.players[state.turn]?.countryId===self.countryId&&state.pendingRoll===null&&!busy);
  const pendingDice=state?.pendingRoll||state?.lastEvent?.roll||null;

  if(leaderboard&&!room){
    return <div className="dada3b-shell">
      <header className="dada3b-topbar"><div><small>Jeux 3B · Classé</small><strong>CLASSEMENT DADA 3B</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
      <Leaderboard rows={leaderboard} onBack={()=>setLeaderboard(null)}/>
    </div>;
  }

  if(!room){
    return <div className="dada3b-shell">
      <header className="dada3b-topbar">
        <div><small>Jeux 3B · Online</small><strong>DADA 3B MULTIJOUEUR</strong></div>
        <div className="dada3b-top-actions"><button className="dada3b-mini-button" onClick={onBack}><ArrowLeft size={13}/> Local</button><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></div>
      </header>
      {error&&<div className="dada3b-online-notice" role="status">{error}</div>}
      <ModeMenu country={country} setCountry={setCountry} code={code} setCode={setCode} maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers}
        rules={rules} setRules={setRules} onCreate={create} onJoin={join} onQueue={queue} onSpectate={spectate}
        onResume={resume} resumeId={resumeId} onLeaderboard={showLeaderboard} busy={busy}/>
    </div>;
  }

  if(room.status==='waiting'){
    return <div className="dada3b-shell">
      <header className="dada3b-topbar">
        <div><small>Salon {room.mode} · {room.players.length}/{room.maxPlayers}</small><strong>DADA 3B · SALON {room.code}</strong></div>
        <div className="dada3b-top-actions"><span className="dada3b-connection" data-state={connection}>{connection==='online'?<Wifi size={15}/>:<WifiOff size={15}/>} {connection}</span><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></div>
      </header>
      {error&&<div className="dada3b-online-notice" role="status">{error}</div>}
      <Lobby room={room} busy={busy} onReady={ready=>request('ready',{room:room.id,ready}).catch(()=>{})}
        onStart={()=>request('start',{room:room.id}).catch(()=>{})} onLeave={leave} onCopy={copyCode}/>
    </div>;
  }

  return <div className="dada3b-shell" role="dialog" aria-modal="true" aria-label="DADA 3B multijoueur">
    <header className="dada3b-topbar">
      <div><small>{room.mode.toUpperCase()} · {isSpectator?'Spectateur':self?.botTakeover?'IA temporaire':'Joueur'} · révision {room.revision}</small>
        <strong>{currentCountry?.flag} {currentCountry?.name||'DADA 3B'} · {THEME_LABELS[state?.rules?.boardTheme]||'Nexus 3B'}</strong></div>
      <div className="dada3b-top-actions">
        <span className="dada3b-connection" data-state={connection}>{connection==='online'?<Wifi size={15}/>:<WifiOff size={15}/>} {connection}</span>
        <button className="dada3b-icon-button" disabled={busy} onClick={()=>sync(room.id)} aria-label="Resynchroniser"><RefreshCw size={18}/></button>
        <button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button>
      </div>
    </header>
    {error&&<div className="dada3b-online-notice" role="status">{error}</div>}

    <div className="dada3b-arena">
      <div className="dada3b-board-wrap"><OnlineBoard room={room} motion={motion} blast={blast} focus={focus} busy={busy}
        onPiece={piece=>request('move',{room:room.id,revision:room.revision,piece}).catch(()=>{})}/></div>
      <aside className="dada3b-sidebar">
        <section className="dada3b-turn-card" style={{'--country':currentCountry?.accent||'#c7a66a'}}>
          <div className="dada3b-turn-line"><div><span className="dada3b-kicker">Tour serveur</span><strong>{currentCountry?.name}</strong>
            <small>{isSpectator?'Lecture seule':state?.players[state.turn]?.countryId===self?.countryId?'À toi de jouer':'Adversaire'}</small></div><span>{currentCountry?.flag}</span></div>
          {room.turnDeadline&&<div className="dada3b-timer" data-low={turnRemaining<=5}><span style={{width:Math.min(100,(turnRemaining/(state?.rules?.timerSeconds||30))*100)+'%'}}/><b>{turnRemaining}s</b></div>}
          <button type="button" className="dada3b-dice" disabled={!canRoll} onClick={()=>request('roll',{room:room.id,revision:room.revision}).catch(()=>{})}>
            <b>{pendingDice?DICE[pendingDice]:'◇'}</b><small>{pendingDice?pendingDice+' obtenu':isSpectator?'Mode spectateur':canRoll?'Lancer serveur':'Attends ton tour'}</small>
          </button>
        </section>

        {self?.botTakeover&&<section className="dada3b-online-reconnect"><b>IA Gardien active</b><p>Le serveur joue temporairement ton pays pour ne pas bloquer les autres.</p>
          <button className="dada3b-primary" disabled={busy} onClick={()=>request('reconnect',{room:room.id}).catch(()=>{})}>Reprendre ma place</button></section>}

        <section className="dada3b-event" aria-live="polite"><b>Journal serveur</b><br/>{state?.lastEvent?.text||'Le Cercle est synchronisé.'}</section>

        <section className="dada3b-roster"><h3>Joueurs</h3>{room.players.map((player,index)=>{
          const c=countryFor(player.countryId),sp=state?.players.find(candidate=>candidate.countryId===player.countryId);
          return <div className="dada3b-roster-row" key={c.id+index} style={{'--country':c.accent}}><span className="dada3b-roster-dot"/><div>
            <strong>{c.flag} {player.name}{player.isSelf?' · toi':''}</strong><small>{player.botTakeover?'IA Gardien temporaire':c.guardian+' · '+c.value}</small></div>
            <span>{sp?.stats?.finished||0}/{state?.rules?.piecesPerPlayer||4} Nexus</span></div>;
        })}</section>

        <div className="dada3b-rules"><strong>Autorité serveur</strong><br/>Dé, mouvements, timer, victoire et récompenses sont validés côté serveur.
          <small>{room.settled?'Résultat économique traité de façon idempotente.':'Synchronisation Realtime + reprise après coupure actives.'}</small></div>

        <button className="dada3b-secondary" disabled={busy} onClick={leave}>{room.status==='active'&&!isSpectator?'Quitter · IA prend le relais':'Quitter'}</button>
      </aside>
    </div>

    {room.status==='finished'&&state&&<div className="dada3b-victory">
      <section className="dada3b-victory-card">
        <span className="dada3b-kicker">Résultat validé côté serveur</span>
        <h2>{state.winner?countryFor(state.winner)?.flag+' '+countryFor(state.winner)?.name:'Partie terminée'}</h2>
        <p>{state.lastEvent?.text}</p>
        <div className="dada3b-result-stats">{state.players.map(player=>{
          const c=countryFor(player.countryId);
          return <article key={c.id}><strong>{c.flag} {c.code}</strong><span>{scoreFor(state,c.id)} pts</span>
            <small>{player.stats.captures} captures · {player.stats.sixes} six · {player.stats.finished} fragment(s)</small></article>;
        })}</div>
        <p className="dada3b-online-reward-note">XP et Coins sont calculés avec plafonds anti-farming et idempotence serveur. Le téléphone ne choisit jamais le montant.</p>
        <div className="dada3b-victory-actions"><button className="dada3b-primary" onClick={()=>{rememberDadaRoom(null);setRoom(null);setLeaderboard(null);}}>Nouvelle partie</button>
          <button className="dada3b-secondary" onClick={showLeaderboard}>Classement</button><button className="dada3b-secondary" onClick={onClose}>Retour aux Jeux 3B</button></div>
      </section>
    </div>}
  </div>;
}
