import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Swords,Shield,Sparkles,Trophy,Users,ArrowLeft,RefreshCw,Copy} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {cardById,cardSlot} from '../world/catalog.js';
import {portraitArt} from '../world/portraits.js';
import {arenaRequest} from './client.js';
import {defaultDeck,optionsFor,ROLES,makeDuel,duelStep,practiceAction,masteryLevel} from './duel.js';
import {ArenaStage} from './ArenaStage.jsx';
import './arena.css';

function Portrait({id}){const art=portraitArt(id);return art?<svg viewBox={art.portrait.join(' ')} preserveAspectRatio="xMidYMin slice" aria-hidden="true"><image href={art.src} width={art.width} height={art.height}/></svg>:<span>3B</span>;}
const modes={friendly:'Duel privé',ranked:'Duel classé',tournament:'Tournoi des liens'};

export default function ArenaPage({onAccount,onExit}){
 const {user,refresh:refreshAccount}=useLoyalty(),[snapshot,setSnapshot]=useState(null),[deck,setDeck]=useState(defaultDeck),[error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[practice,setPractice]=useState(null),[editing,setEditing]=useState(false),[clock,setClock]=useState(Date.now());
 const rewardedMatches=useRef(new Set()),accountRefresh=useRef(refreshAccount);accountRefresh.current=refreshAccount;
 const active=useRef(true),inFlight=useRef(false),snapshotRef=useRef(null),abort=useRef(null),root=useRef(null),requestNumber=useRef(0);
 const accept=useCallback(data=>{if(!active.current)return;snapshotRef.current=data;setSnapshot(data);},[]);
 const request=useCallback(async(action,payload={})=>{
  if(inFlight.current)return;abort.current?.abort();const number=++requestNumber.current;inFlight.current=true;setBusy(true);setError('');
  try{const data=await arenaRequest(action,payload);if(!active.current||number!==requestNumber.current)return;accept(data);if(action==='deck'){setDeck(data.profile.deck);setEditing(false);}return data;}
  catch(e){if(active.current)setError(e.message);if(e.status===409)try{accept(await arenaRequest('status'));}catch{}}
  finally{inFlight.current=false;if(active.current)setBusy(false);}
 },[accept]);
 useEffect(()=>{
  active.current=true;++requestNumber.current;abort.current?.abort();snapshotRef.current=null;setSnapshot(null);setError('');setEditing(false);setDeck(defaultDeck());rewardedMatches.current.clear();if(!user)return()=>{active.current=false;};
  let timer;const refresh=async()=>{if(!active.current)return;
   if(!inFlight.current&&!document.hidden){const number=++requestNumber.current;abort.current=new AbortController();try{const data=await arenaRequest('status',{},abort.current.signal);if(active.current&&number===requestNumber.current){accept(data);setError('');}}catch(e){if(active.current&&number===requestNumber.current&&e.name!=='AbortError')setError(e.message);}}
   timer=setTimeout(refresh,snapshotRef.current?.room?.status==='active'?2200:4500);
  };refresh();return()=>{active.current=false;clearTimeout(timer);abort.current?.abort();};
 },[user?.id,accept]);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(!practice||practice.winner!==null||practice.turn!==1)return;const timer=setTimeout(()=>setPractice(p=>p&&p.winner===null&&p.turn===1?duelStep(p,1,practiceAction(p)):p),850);return()=>clearTimeout(timer);},[practice]);
 const room=snapshot?.room,profile=snapshot?.profile,matches=snapshot?.matches||[],myMatches=matches.filter(m=>[m.p1,m.p2].includes(user?.id));
 const match=myMatches.find(m=>m.status==='active')||myMatches.at(-1),state=practice||match?.state,side=practice?0:match?.p1===user?.id?0:1;
 useEffect(()=>{if(match?.status==='finished'&&!rewardedMatches.current.has(match.id)){rewardedMatches.current.add(match.id);accountRefresh.current();}},[match?.id,match?.status]);
 const competing=room&&['waiting','active'].includes(room.status),fighting=!!state&&(practice||room?.status==='active'||room?.status==='finished');
 useEffect(()=>{root.current?.closest('dialog')?.scrollTo({top:0});},[!!fighting,match?.id]);
 const options=optionsFor({collection:snapshot?.collection||{}}),entrant=id=>room?.entrants?.find(e=>e.uid===id)?.handle||'Joueur 3B';
 function move(action){if(practice){try{setPractice(duelStep(practice,0,action));}catch(e){setError(e.message);}return;}request('move',{match:match.id,revision:match.revision,move:action});}
 function startPractice(){setPractice(makeDuel([profile?.deck||deck,defaultDeck()]));setEditing(false);setError('');}
 const selected=state?.sides[side],opponent=state?.sides[1-side],fighter=selected?.cards[selected.active],role=fighter&&ROLES[fighter.role],yourTurn=state?.winner===null&&state.turn===side&&!busy;
 const remaining=practice?null:Math.max(0,Math.ceil((Date.parse(match?.deadline)-clock)/1000));
 return <div ref={root} className={'card-arena'+(fighting?' is-fighting':'')}>
  <header className="arena-heading"><div><span className="arena-eyebrow">LE CERCLE DES LIENS</span><h2>{fighting?(practice?'Entraînement':modes[room.mode]):'L’Arène 3B'}</h2></div><button className="arena-icon" aria-label="Retour au monde" onClick={onExit}><ArrowLeft/></button></header>
  {error&&<div className="arena-error" role="alert">{error}<button onClick={()=>request('status')} disabled={!user||busy}><RefreshCw size={15}/> Reconnecter</button></div>}
  {fighting?<>
   <div className="arena-stage-shell"><ArenaStage state={state} side={side}/><div className="arena-versus"><span>{practice?'Ton équipe':entrant(side===0?match.p1:match.p2)}</span><b>VS</b><span>{practice?'Entraînement · ordinateur':entrant(side===0?match.p2:match.p1)}</span></div>
    {state.winner===null?<div className="arena-turn" role="status">{yourTurn?'À toi de jouer':'L’adversaire réfléchit'} {remaining!==null&&<b>{remaining} s</b>}</div>:<div className="arena-result" role="status"><Trophy/><h3>{state.winner===2?'Égalité':state.winner===side?'Victoire':'Défaite'}</h3><p>{state.reason==='timeout'?'Temps de réflexion écoulé.':state.reason==='forfeit'?'Un joueur a abandonné.':'Les liens se reforment. Prépare ta prochaine équipe.'}</p></div>}
   </div>
   <div className="arena-health"><Team side={selected} onSwap={index=>move({type:'swap',index})} disabled={!yourTurn}/><Team side={opponent} disabled/></div>
   {state.winner===null&&<><div className="arena-action-title"><strong>{cardById[fighter.id].name}</strong><span>{role.name} · {fighter.focus}/3 concentrations · {fighter.shield} bouclier</span></div><div className="arena-actions">
    <button disabled={!yourTurn} onClick={()=>move({type:'strike'})}><Swords/><strong>Frapper</strong><small>{role.hit} dégâts · +1 concentration</small></button>
    <button disabled={!yourTurn||selected.guarded} onClick={()=>move({type:'guard'})}><Shield/><strong>Protéger</strong><small>+22 bouclier · +1 concentration</small></button>
    <button disabled={!yourTurn||fighter.focus<2} onClick={()=>move({type:'power'})} title={role.description}><Sparkles/><strong>{role.power}</strong><small>2 concentrations</small></button>
    <button disabled={!yourTurn||selected.relicUsed||!selected.relic} onClick={()=>move({type:'relic'})}><span>◈</span><strong>Relique</strong><small>{selected.relicUsed?'Déjà utilisée':cardById[selected.relic]?.name||'Aucune'}</small></button>
   </div><p className="arena-power-description">{role.power} : {role.description}</p></>}
   <p className="arena-battle-log" role="status">{state.log.at(-1)}</p>
   <div className="arena-footer">{state.winner===null?<button className="arena-link" disabled={busy} onClick={()=>move({type:'forfeit'})}>Abandonner le duel</button>:practice?<><button className="arena-primary" onClick={startPractice}>Rejouer</button><button onClick={()=>setPractice(null)}>Revenir au salon</button></>:room.status==='finished'?<button className="arena-primary" disabled={busy} onClick={()=>request('home')}>Revenir au salon</button>:<p>Les autres duels continuent. La finale apparaîtra ici.</p>}</div>
  </>:<>
   <div className="arena-intro"><span className="arena-seal">3B</span><div><h3>Trois cartes. Un lien à défendre.</h3><p>Fais entrer tes personnages dans l’arène. Alterne attaques, pouvoirs et réserves pour épuiser les trois cartes adverses.</p></div></div>
   {!user&&<div className="arena-account"><p>Connecte ton compte 3B pour retrouver ta collection et affronter d’autres joueurs sur Internet.</p><button className="arena-primary" onClick={onAccount}>Se connecter au compte 3B</button></div>}
   {competing?<div className="arena-waiting"><h3>{room.mode==='ranked'?'Recherche d’un adversaire…':'Le cercle attend ses joueurs'}</h3>{room.mode!=='ranked'&&<button className="arena-code" onClick={()=>navigator.clipboard?.writeText(room.code).catch(()=>setError('Copie ce code : '+room.code))}><b>{room.code}</b><Copy size={18}/></button>}<p>{room.entrants.length} / {room.mode==='tournament'?4:2} joueurs · {modes[room.mode]}</p><div className="arena-entrants">{room.entrants.map(e=><span key={e.uid}>{e.handle}</span>)}</div><p>Le duel commence quand le cercle est complet. Garde cet écran ouvert.</p><button disabled={busy} onClick={()=>request('cancel')}>Quitter l’attente</button></div>:<>
    <div className="arena-modes"><button disabled={!profile||busy} onClick={()=>request('queue')}><Trophy/><strong>Duel classé</strong><small>Un adversaire · cote {profile?.rating||1000}</small></button><button disabled={!profile||busy} onClick={()=>request('create',{mode:'friendly'})}><Swords/><strong>Duel privé</strong><small>Invite un ami avec un code</small></button><button disabled={!profile||busy} onClick={()=>request('create',{mode:'tournament'})}><Users/><strong>Tournoi</strong><small>4 joueurs · demi-finales et finale</small></button></div>
    <form className="arena-join" onSubmit={e=>{e.preventDefault();request('join',{code});}}><label htmlFor="arena-code">Rejoindre avec un code</label><input id="arena-code" placeholder="A1B2C3D4" maxLength={8} value={code} autoComplete="off" onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,''))}/><button disabled={!profile||busy||code.length!==8}>Rejoindre</button></form>
    <div className="arena-squad-heading"><h3>Ton équipe</h3><button disabled={!profile||busy} onClick={()=>{setDeck(profile.deck);setEditing(!editing);}}>{editing?'Annuler':'Composer l’équipe'}</button></div>
    {editing?<div className="arena-builder">{deck.cards.map((id,i)=><label key={i}>Carte {i+1}<select value={id} onChange={e=>setDeck(d=>({...d,cards:d.cards.map((old,j)=>j===i?e.target.value:old)}))}>{options.cards.map(c=><option key={c.id} value={c.id}>{c.name} · {ROLES[c.role].name}</option>)}</select></label>)}{['terrain','ambiance','relic'].map(slot=><label key={slot}>{({terrain:'Terrain · +8 vitalité par carte',ambiance:'Ambiance · +3 dégâts des pouvoirs',relic:'Relique · une utilisation'})[slot]}<select value={deck[slot]||''} onChange={e=>setDeck(d=>({...d,[slot]:e.target.value||null}))}><option value="">Sans équipement</option>{options.tools.filter(c=>slot==='relic'?!['terrain','ambiance'].includes(cardSlot(c)):cardSlot(c)===slot).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>)}<button className="arena-primary" disabled={busy||new Set(deck.cards).size!==3} onClick={()=>request('deck',{deck})}>Enregistrer l’équipe</button></div>:<div className="arena-squad">{(profile?.deck||deck).cards.map(id=><div key={id}><Portrait id={id}/><div><strong>{cardById[id].name}</strong><small>{ROLES[cardById[id].role].name} · Maîtrise {masteryLevel(profile?.mastery?.[id]||0)}</small></div></div>)}</div>}
    <button className="arena-practice" onClick={startPractice}>Entraînement contre l’ordinateur <span>Sans classement ni récompense</span></button>
   </>}
   <details className="arena-rules"><summary>Règles et progression</summary><p>Trois personnages distincts et au plus un personnage de l’Union. Les huit cartes d’initiation et quelques équipements sont prêtés dans l’arène. Tes autres cartes viennent de ta collection du Monde 3B.</p><p>Chaque tour dure 45 secondes. Un changement de carte consomme le tour et accorde 8 points de bouclier. Les rôles ont des statistiques fixes : la rareté, les achats, la nationalité et la maîtrise ne donnent aucun avantage de puissance.</p><p>Classé : +16 de cote en victoire, −16 en défaite. Après au moins 6 actions, chaque carte de ton équipe gagne 30 XP de maîtrise en victoire ou 15 autrement, dans la limite de 20 duels récompensés par jour. La maîtrise débloque un niveau honorifique.</p><p>Après au moins 12 actions et 90 secondes, un duel terminé rapporte aussi 40 XP de compte en victoire ou 20 autrement, plus 1 point de fidélité. Ces gains respectent le plafond commun des jeux : 600 XP et 20 points par jour. Seuls les trois premiers duels de la journée contre la même personne peuvent rapporter ce bonus. L’entraînement ne distribue aucune récompense. Aucun jeton blockchain n’est émis.</p><p>Un tournoi réunit quatre joueurs ; les deux vainqueurs disputent la finale. Après 100 actions, la vitalité restante départage les équipes. Une égalité parfaite en tournoi favorise la première tête de série annoncée dans le tableau.</p></details>
  </>}
  {room?.mode==='tournament'&&matches.length>0&&<div className="arena-bracket"><h3>Tableau du tournoi</h3>{matches.map(m=><div key={m.id}><span>{m.round===2?'Finale':'Demi-finale '+(m.seat+1)}</span><b>{entrant(m.p1)} / {entrant(m.p2)}</b><small>{m.status==='finished'?'Victoire : '+entrant(m.winner):'En cours'}</small></div>)}</div>}
  {!competing&&!practice&&snapshot?.ranking?.length>0&&<details className="arena-ranking"><summary>Classement du Cercle</summary>{snapshot.ranking.map((r,i)=><p key={r.handle}><b>{i+1}. {r.handle}</b><span>{r.rating} · {r.wins} victoires</span></p>)}</details>}
 </div>;
}
function Team({side,onSwap,disabled}){return <div className="arena-team">{side.cards.map((c,i)=><button key={c.id} className={(i===side.active?'is-active ':'')+(c.hp===0?'is-ko':'')} disabled={disabled||i===side.active||c.hp===0} onClick={()=>onSwap?.(i)} aria-label={cardById[c.id].name+', '+c.hp+' vitalité'+(i===side.active?', active':', faire entrer')}><Portrait id={c.id}/><div><strong>{cardById[c.id].name}</strong><span className="arena-life"><i style={{width:Math.round(c.hp/c.max*100)+'%'}}/></span><small>{c.hp} / {c.max}</small></div></button>)}</div>;}
