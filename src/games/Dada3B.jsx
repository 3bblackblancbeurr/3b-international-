import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Copy,Play,RotateCcw,Shield,Users,Wifi,X} from 'lucide-react';
import {useLoyalty} from '../loyalty/LoyaltyContext.jsx';
import {
  AI_LEVELS,BOARD_THEMES,COUNTRIES_3B,DEFAULT_RULES,FINISH_STEP,HOME_LENGTH,SANCTUARY_CELLS,STABLE,TEAM_LABELS,TRACK_LENGTH,
  achievementsFor,blockadeOwnerAt,countryFor,createMatch,currentPlayer,finishByTime,globalCellFor,homeIndexFor,
  movePiece,normalizeRules,previewMove,readMatchSnapshot,resolveTimeout,rollTurn,scoreFor,secureRoll,selectBotMove,serializeMatch,teamScoreFor,
} from './dada3b/engine.js';
import {dadaRequest,subscribeDadaRoom} from './dada3b/online.js';
import {guardianAssetFor} from './dada3b/guardians.js';
import {closeDadaAudio,dadaHaptic,dadaSpeak,dadaTone} from './dada3b/audio.js';

import './dada3b.css';

const Dada3BThree=React.lazy(()=>import('./Dada3BThree.jsx'));
const DadaDice3D=React.lazy(()=>import('./DadaDice3D.jsx'));
class Dice3DErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return{failed:true};}
 componentDidCatch(error){this.props.onFail?.(error);}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
const DICE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
const DICE_PIPS=Object.freeze({1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]});
function DiceFace({value}){return <span className="dada3b-die-face-pips" aria-hidden="true">{DICE_PIPS[value].map(slot=><i key={slot} data-slot={slot}/>)}</span>;}
function PremiumDice({value,rolling,disabled,onClick,skin,country,pending,adverse}){
 const shown=value||1,status=pending?'Choisis un Totem':adverse?'Tour adverse':'Lancer le dé',rendererKey=(skin||'core')+':'+(country||'neutral'),[webglFailed,setWebglFailed]=useState(false),[webglReadyKey,setWebglReadyKey]=useState(null),webglReady=webglReadyKey===rendererKey&&!webglFailed;
 const fallback=<span className="dada3b-dice-stage" aria-hidden="true"><span className="dada3b-die-cube">
  <span className="dada3b-die-face dada3b-die-front"><DiceFace value={1}/></span><span className="dada3b-die-face dada3b-die-right"><DiceFace value={2}/></span>
  <span className="dada3b-die-face dada3b-die-back"><DiceFace value={3}/></span><span className="dada3b-die-face dada3b-die-left"><DiceFace value={4}/></span>
  <span className="dada3b-die-face dada3b-die-top"><DiceFace value={5}/></span><span className="dada3b-die-face dada3b-die-bottom"><DiceFace value={6}/></span>
 </span></span>;
 return <button className="dada3b-dice dada3b-dice-premium" data-skin={skin} data-value={shown} data-rolling={rolling} data-webgl={webglReady} style={{'--country':country||'#c7a66a'}} onClick={onClick} disabled={disabled} aria-label={value?'Dé '+value+' · '+status:status}>
  {webglFailed?fallback:<Dice3DErrorBoundary fallback={fallback} onFail={()=>{setWebglReadyKey(null);setWebglFailed(true);}}><React.Suspense fallback={fallback}><DadaDice3D key={rendererKey} value={shown} rolling={rolling} skin={skin} country={country||'#c7a66a'} onReady={()=>{setWebglFailed(false);setWebglReadyKey(rendererKey);}} onUnsupported={()=>{setWebglReadyKey(null);setWebglFailed(true);}}/></React.Suspense></Dice3DErrorBoundary>}
  <span className="dada3b-dice-meta"><b>{value?value:'3B'}</b><small>{status}</small></span>
 </button>;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const initialSeats=()=>COUNTRIES_3B.map((country,index)=>({countryId:country.id,type:index<2?'human':index===2?'bot':'off',aiLevel:'tactique',team:null}));
const COSMETIC_SLOT_LABELS={totem_skin:'Totem',trail:'Trace',dice_skin:'Dé',board_skin:'Plateau',capture_fx:'Capture',intro_fx:'Introduction'};
const COUNTRY_SKIN_PREFIX={fr:'DADA_TOTEM_FR_',dz:'DADA_TOTEM_DZ_',es:'DADA_TOTEM_ES_',ma:'DADA_TOTEM_MA_',it:'DADA_TOTEM_IT_',tn:'DADA_TOTEM_TN_',tr:'DADA_TOTEM_TR_',ee:'DADA_TOTEM_EE_'};
function skinForCountry(code,countryId){if(!code||code==='DADA_TOTEM_CORE')return'DADA_TOTEM_CORE';return code.startsWith(COUNTRY_SKIN_PREFIX[countryId]||'__')?code:'DADA_TOTEM_CORE';}
const tutorialSteps=[
  ['1 · Sortir','Fais 6 pour ouvrir ton écurie. Un 6 te laisse rejouer.'],
  ['2 · Avancer','Le dé fixe la distance. Si plusieurs Totems peuvent bouger, choisis celui qui brille.'],
  ['3 · Défendre','Les Portes de départ sont des Sanctuaires. Deux Totems alliés peuvent former un Bouclier 3B.'],
  ['4 · Gagner','Fais le tour, traverse les six cases de ta Porte et entre dans le Nexus avec le compte exact.'],
];
const POWER_EVENT_LABELS=Object.freeze({
  capture:'FRACTURE MATRIX',barricade:'BOUCLIER 3B',sanctuary:'SANCTUAIRE',door:'PORTE DU NEXUS',finish:'FRAGMENT NEXUS',exit:'LIBÉRATION TOTEM','triple-six':'SURCHARGE MATRIX',victory:'NEXUS COMPLET',
});
const POWER_CARDS=Object.freeze([
  {id:'capture',sigil:'✦',name:'Fracture Matrix',detail:'Capture un Totem adverse et fracture sa progression.'},
  {id:'sanctuary',sigil:'◇',name:'Sanctuaire',detail:'Les 8 Portes deviennent des zones protégées.'},
  {id:'barricade',sigil:'⬢',name:'Bouclier 3B',detail:'Deux Totems alliés verrouillent le passage.'},
  {id:'door',sigil:'⌁',name:'Porte du Nexus',detail:'Le dernier corridor conduit au cœur du plateau.'},
  {id:'triple-six',sigil:'Ⅵ',name:'Surcharge Matrix',detail:'Trois 6 consécutifs déclenchent la surcharge.'},
]);

function polar(angleDeg,radius){const a=angleDeg*Math.PI/180;return{left:50+Math.cos(a)*radius,top:50+Math.sin(a)*radius};}
const TRACK_ANCHORS=Object.freeze([[50,8],[81,17],[92,47],[82,80],[49,92],[18,82],[8,53],[17,19]]);
const TRACK_SECTOR=TRACK_LENGTH/8;
const smoothStep=t=>t*t*(3-2*t);
function trackPosition(index){
 const normalized=((index%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH,sector=Math.floor(normalized/TRACK_SECTOR),t=(normalized%TRACK_SECTOR)/TRACK_SECTOR;
 const a=TRACK_ANCHORS[sector],b=TRACK_ANCHORS[(sector+1)%TRACK_ANCHORS.length],s=smoothStep(t),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
 const bend=Math.sin(Math.PI*t)*(sector%2===0?1.65:-1.25);
 return{left:a[0]+dx*s+(-dy/length)*bend,top:a[1]+dy*s+(dx/length)*bend};
}
function homePosition(country,index){
 const gate=trackPosition(country.start),factor=.72-index*.102;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function stableCenter(country){
 const gate=trackPosition(country.start),factor=1.085;
 return{left:50+(gate.left-50)*factor,top:50+(gate.top-50)*factor};
}
function finishedPosition(country,pieceIndex){return polar(-90+country.start*360/TRACK_LENGTH+pieceIndex*5-7.5,6.1+(pieceIndex%2)*1.15);}
function trackRailPoints(){return Array.from({length:TRACK_LENGTH+1},(_,index)=>{const p=trackPosition(index%TRACK_LENGTH);return p.left.toFixed(2)+','+p.top.toFixed(2);}).join(' ');}
function positionForPiece(country,steps,pieceIndex){
 if(steps===STABLE){const b=stableCenter(country),a=pieceIndex*Math.PI/2+Math.PI/4;return{left:b.left+Math.cos(a)*2.7,top:b.top+Math.sin(a)*2.7};}
 if(steps===FINISH_STEP)return finishedPosition(country,pieceIndex);
 if(steps>=TRACK_LENGTH)return homePosition(country,homeIndexFor(steps));
 const b=trackPosition(globalCellFor(country.id,steps)),a=pieceIndex*Math.PI/2;
 return{left:b.left+Math.cos(a)*.72,top:b.top+Math.sin(a)*.72};
}
function eventFeedback(event,sound,haptic,voice){
 const type=event?.type;
 const mapped=type==='capture'?'capture':type==='door'?'door':type==='finish'?'finish':type==='victory'?'victory':type==='triple-six'?'error':'move';
 dadaTone(mapped,sound);dadaHaptic(mapped,haptic);
 if(type==='capture')dadaSpeak('Fracture Matrix',voice);
 if(type==='door')dadaSpeak('Porte ouverte',voice);
 if(type==='finish')dadaSpeak('Totem dans le Nexus',voice);
 if(type==='victory')dadaSpeak('Nexus complété',voice);
}
function CountryPicker({value,onChange,label='Pays'}){return <label className="dada3b-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{COUNTRIES_3B.map(c=><option value={c.id} key={c.id}>{c.flag} {c.name} · {c.guardian}</option>)}</select></label>;}
function RuleToggle({checked,onChange,label,detail}){return <button type="button" className="dada3b-rule-toggle" aria-pressed={checked} onClick={()=>onChange(!checked)}><span><strong>{label}</strong><small>{detail}</small></span><b>{checked?'ON':'OFF'}</b></button>;}
class Dada3DErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={failed:false};}
 static getDerivedStateFromError(){return{failed:true};}
 componentDidCatch(error){this.props.onFail?.(error);}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}

function SeatCard({seat,country,onChange,teamMode=false}){
 const guardian=guardianAssetFor(country.id);
 return <article className="dada3b-country-card" data-state={seat.type} data-team={seat.team||''} style={{'--country':country.accent}}>
  <header><div><b>{country.name}</b><p>{country.code} · {country.value}{teamMode&&seat.team?' · Équipe '+TEAM_LABELS[seat.team]:''}</p></div><em>{country.flag}</em></header>
  <div className="dada3b-totem-preview" data-shape={country.shape}>{guardian?.portrait?<img src={guardian.portrait} alt={guardian.alt}/>:<span>{country.crest}</span>}<small>{country.guardian}</small></div>
  <div className="dada3b-seat-switch">{[['human','Joueur'],['bot','IA'],['off','Absent']].map(([v,l])=><button type="button" key={v} aria-pressed={seat.type===v} disabled={teamMode&&v==='off'} onClick={()=>onChange({...seat,type:v})}>{l}</button>)}</div>
  {seat.type==='bot'&&<select aria-label={'Niveau IA '+country.name} value={seat.aiLevel} onChange={e=>onChange({...seat,aiLevel:e.target.value})}>{AI_LEVELS.map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select>}
  {teamMode&&seat.type!=='off'&&<select className="dada3b-team-select" aria-label={'Équipe '+country.name} value={seat.team||'A'} onChange={e=>onChange({...seat,team:e.target.value})}><option value="A">Équipe OR</option><option value="B">Équipe MATRIX</option></select>}
 </article>;
}

function Board({match,legal=[],motion,blast,onPiece,focusEvent,loadout=null,cosmeticsByCountry=null}){
 const starts=useMemo(()=>new Map(COUNTRIES_3B.map(c=>[c.start,c])),[]);
 const railPoints=useMemo(()=>trackRailPoints(),[]);
 const finished=match.players.flatMap(player=>{const c=countryFor(player.countryId);return player.pieces.filter(p=>p.steps===FINISH_STEP).map((_,i)=>({c,i}));});
 const legalPreviews=legal.map(pieceIndex=>previewMove(match,pieceIndex)).filter(Boolean);
 const legalTrackTargets=new Set(legalPreviews.map(move=>move.landing).filter(Number.isInteger));
 const legalHomeTargets=new Set(legalPreviews.filter(move=>move.to>=TRACK_LENGTH&&move.to<FINISH_STEP).map(move=>move.to));
 const currentCountry=countryFor(match.players?.[match.turn]?.countryId);
 const powerLabel=POWER_EVENT_LABELS[focusEvent]||'';
 return <div className="dada3b-board" data-theme={match.rules?.boardTheme||'nexus'} data-board-skin={loadout?.board_skin||'DADA_BOARD_NEXUS'} data-focus={focusEvent||''} aria-label="Plateau DADA 3B">
  <div className="dada3b-board-aura" aria-hidden="true"/><div className="dada3b-board-depth" aria-hidden="true"/>
  <svg className="dada3b-track-rails" viewBox="0 0 100 100" aria-hidden="true">
   <polyline className="dada3b-rail-shadow" points={railPoints}/>
   <polyline className="dada3b-rail-metal" points={railPoints}/>
   <polyline className="dada3b-rail-energy" points={railPoints}/>
   {COUNTRIES_3B.map(c=>{const a=trackPosition(c.start),b=homePosition(c,HOME_LENGTH-1);return <line key={'rail-'+c.id} className="dada3b-home-rail" x1={a.left} y1={a.top} x2={b.left} y2={b.top} style={{'--rail-color':c.accent}}/>;})}
  </svg>
  <div className="dada3b-board-orbit" aria-hidden="true">{COUNTRIES_3B.map(c=><i key={c.id} style={{'--orbit':c.accent}}/>)}</div>
  {powerLabel&&<div key={'power-'+(match.lastEvent?.id||0)} className="dada3b-power-flash" data-power={focusEvent}><small>POUVOIR DU CERCLE</small><strong>{powerLabel}</strong></div>}
  {Array.from({length:TRACK_LENGTH},(_,index)=>{const p=trackPosition(index),start=starts.get(index),sanctuary=SANCTUARY_CELLS.includes(index)&&match.rules?.safeCells,barrier=blockadeOwnerAt(match,index)!==null,target=legalTrackTargets.has(index);return <span key={'t'+index} className="dada3b-track-cell" data-start={!!start} data-sanctuary={sanctuary} data-barricade={barrier} data-legal-target={target} data-sector={Math.floor(index/TRACK_SECTOR)} style={{left:p.left+'%',top:p.top+'%','--cell-color':start?.accent||'#bca56f'}}><i/>{target?'•':start?start.code:sanctuary?'◇':barrier?'▰':''}</span>;})}
  {COUNTRIES_3B.flatMap(c=>Array.from({length:HOME_LENGTH},(_,index)=>{const p=homePosition(c,index),target=c.id===currentCountry?.id&&legalHomeTargets.has(TRACK_LENGTH+index);return <span key={c.id+index} className="dada3b-home-cell" data-home-index={index} data-legal-target={target} style={{left:p.left+'%',top:p.top+'%','--cell-color':c.accent}}><i/></span>;}))}
  <div className="dada3b-nexus"><div><i className="dada3b-nexus-halo"/><strong>3B</strong><small>NEXUS</small><em>8 PORTES · 8 VALEURS</em><span className="dada3b-nexus-fragments">{finished.slice(0,12).map((x,i)=><i key={i} style={{'--fragment':x.c.accent}}/>)}</span></div></div>
  {COUNTRIES_3B.map(c=>{const p=stableCenter(c),active=match.players.some(player=>player.countryId===c.id),guardian=guardianAssetFor(c.id);return <div key={'s'+c.id} className="dada3b-stable" data-active={active} style={{left:p.left+'%',top:p.top+'%','--country':c.accent}}><i className="dada3b-gate-aura"/>{guardian?.portrait?<img src={guardian.portrait} alt="" aria-hidden="true"/>:<span>{c.crest}</span>}<strong>{c.guardian}</strong><small>{c.value} · {c.code}</small></div>;})}
  {match.players.flatMap((player,playerIndex)=>{const c=countryFor(player.countryId),playerLoadout=cosmeticsByCountry?.[player.countryId]||loadout||{},skin=skinForCountry(playerLoadout.totem_skin,c.id);return player.pieces.map((piece,pieceIndex)=>{const shown=motion?.countryId===player.countryId&&motion.pieceIndex===pieceIndex?motion.step:piece.steps,p=positionForPiece(c,shown,pieceIndex),can=playerIndex===match.turn&&legal.includes(pieceIndex)&&!motion,isMoving=motion?.countryId===player.countryId&&motion.pieceIndex===pieceIndex;return <button type="button" key={c.id+pieceIndex} className="dada3b-piece dada3b-totem" data-shape={c.shape} data-legal={can} data-totem-skin={skin} data-trail={isMoving?(playerLoadout.trail||loadout?.trail||''):''} style={{left:p.left+'%',top:p.top+'%','--country':c.accent}} disabled={!can} onClick={()=>onPiece(pieceIndex)} aria-label={c.name+' Totem '+(pieceIndex+1)+(can?' jouable':'')}><i className="dada3b-totem-shadow"/><i className="dada3b-totem-aura"/><span className="dada3b-totem-model"><i className="dada3b-totem-crown"/><b>{c.crest}</b><i className="dada3b-totem-core"/><i className="dada3b-totem-base"/></span><small>{pieceIndex+1}</small></button>;});})}
  {blast&&<span key={blast.key} className="dada3b-burst" data-fx={blast.fx||loadout?.capture_fx||'DADA_CAPTURE_FRACTURE'} style={{left:blast.left+'%',top:blast.top+'%'}}/>}
 </div>;
}

function Tutorial({step,setStep,onClose}){
 const [title,copy]=tutorialSteps[step];
 return <div className="dada3b-victory dada3b-tutorial"><section className="dada3b-victory-card"><span className="dada3b-kicker">Tutoriel interactif · {step+1}/4</span><h2>{title}</h2><p>{copy}</p><div className="dada3b-victory-actions">{step>0&&<button className="dada3b-secondary" onClick={()=>setStep(step-1)}>Précédent</button>}<button className="dada3b-primary" onClick={()=>step<3?setStep(step+1):onClose()}>{step<3?'Suivant':'Jouer'}</button></div></section></div>;
}
function PowerDeck({match,focus}){
 const enabled=id=>id==='capture'||id==='door'||(id==='sanctuary'&&match.rules.safeCells)||(id==='barricade'&&match.rules.barricades)||(id==='triple-six'&&match.rules.tripleSixPenalty);
 return <section className="dada3b-power-deck"><header><div><span className="dada3b-kicker">Arsenal du Cercle</span><h3>Pouvoirs du plateau</h3></div><b>5</b></header><div>{POWER_CARDS.map(power=><article key={power.id} data-enabled={enabled(power.id)} data-active={focus===power.id}><span>{power.sigil}</span><div><strong>{power.name}</strong><small>{power.detail}</small></div><i>{enabled(power.id)?'ACTIF':'OFF'}</i></article>)}</div></section>;
}

export default function Dada3B({saved,onClose,onCheckpoint}){
 const account=useLoyalty();
 const restored=useMemo(()=>{try{return readMatchSnapshot(saved);}catch{return null;}},[saved]);
 const[view,setView]=useState('menu'),[seats,setSeats]=useState(initialSeats),[rules,setRules]=useState(()=>normalizeRules(DEFAULT_RULES));
 const[match,setMatch]=useState(null),[lastSeats,setLastSeats]=useState(null),[dice,setDice]=useState(null),[legal,setLegal]=useState([]),[busy,setBusy]=useState(false),[motion,setMotion]=useState(null),[blast,setBlast]=useState(null),[notice,setNotice]=useState('Le Cercle attend.');
 const[sound,setSound]=useState(true),[haptic,setHaptic]=useState(true),[voice,setVoice]=useState(false),[tutorial,setTutorial]=useState(false),[tutorialStep,setTutorialStep]=useState(0),[localDeadline,setLocalDeadline]=useState(null),[clock,setClock]=useState(Date.now());
 const[threeD,setThreeD]=useState(true),[threeFailed,setThreeFailed]=useState(false);
 const[onlineRoom,setOnlineRoom]=useState(null),[onlineMode,setOnlineMode]=useState('private'),[onlineCountry,setOnlineCountry]=useState('fr'),[roomCode,setRoomCode]=useState(''),[onlineBusy,setOnlineBusy]=useState(false),[onlineStatus,setOnlineStatus]=useState(''),[maxPlayers,setMaxPlayers]=useState(4),[leaderboard,setLeaderboard]=useState([]);
 const[cosmetics,setCosmetics]=useState(null),[cosmeticStatus,setCosmeticStatus]=useState('');
 const sequence=useRef(0),recorded=useRef(false);
 useEffect(()=>()=>{sequence.current++;closeDadaAudio();},[]);
 useEffect(()=>{
  if(!account.user){setCosmetics(null);return;}
  let live=true;
  dadaRequest('cosmetics').then(data=>{if(live)setCosmetics({loadout:data.loadout,catalog:data.catalog||[],season:data.season||null});}).catch(()=>{});
  return()=>{live=false;};
 },[account.user?.id]);

 const activeSeats=seats.filter(s=>s.type!=='off');
 const renderMatch=onlineRoom?.state||match;
 const turnPlayer=currentPlayer(renderMatch),turnCountry=turnPlayer?countryFor(turnPlayer.countryId):null;
 const selfOnline=onlineRoom?.players?.find(p=>p.isSelf)||null;
 const selfTurn=Boolean(onlineRoom?.state&&selfOnline&&turnPlayer?.countryId===selfOnline.countryId&&!selfOnline.botTakeover);
 const currentLegal=onlineRoom?selfTurn?(onlineRoom.state.pendingMoves||[]):[]:legal;
 const shownDice=onlineRoom?.state?.pendingRoll??dice??(renderMatch?.lastEvent?.roll||null);
 const cosmeticLoadout=cosmetics?.loadout||null;
 const cosmeticsByCountry=onlineRoom?Object.fromEntries((onlineRoom.players||[]).map(player=>[player.countryId,player.cosmetics||null])):null;
 const currentXp=Number(account.profile?.xp??account.passport?.xp??0);

 function checkpoint(next,record=false){if(!next)return;const score=next.winnerTeam?teamScoreFor(next,next.winnerTeam):(next.winner?scoreFor(next,next.winner):0);onCheckpoint?.({snapshot:()=>serializeMatch(next),score,won:next.status==='finished'},'dada3b',record);}
 function adoptLocal(next,record=false){setMatch(next);setLegal(next?.pendingMoves||[]);setDice(next?.pendingRoll||null);setNotice(next?.lastEvent?.text||'Le Cercle continue.');checkpoint(next,record);if(next?.lastEvent)eventFeedback(next.lastEvent,sound,haptic,voice);}
 function updateSeat(countryId,next){setSeats(current=>current.map(s=>s.countryId===countryId?next:s));}
 function updateRule(key,value){setRules(r=>normalizeRules({...r,[key]:value}));}
 function setTeamMode(enabled){
  setRules(r=>normalizeRules({...r,teamMode:enabled}));
  setSeats(current=>current.map((seat,index)=>{
   if(!enabled)return {...seat,team:null};
   if(index<4)return {...seat,type:seat.type==='off'?'bot':seat.type,team:index%2===0?'A':'B'};
   return {...seat,type:'off',team:null};
  }));
 }

 function beginLocal(){
  if(rules.teamMode){
   if(activeSeats.length!==4||activeSeats.filter(s=>s.team==='A').length!==2||activeSeats.filter(s=>s.team==='B').length!==2){setNotice('Le 2v2 demande exactement 4 pays : 2 OR et 2 MATRIX.');return;}
  }else if(activeSeats.length<2){setNotice('Active au moins deux pays.');return;}
  const config=activeSeats.map(s=>({countryId:s.countryId,type:s.type,aiLevel:s.aiLevel,team:s.team,name:countryFor(s.countryId).name}));
  const next=createMatch(config,rules);recorded.current=false;setLastSeats(config);setView('local');adoptLocal(next);setTutorial(true);setTutorialStep(0);
 }
 function resumeLocal(){if(!restored||restored.status!=='playing')return;recorded.current=false;setView('local');setRules(restored.rules);adoptLocal(restored);setNotice('Partie restaurée depuis ta sauvegarde 3B.');}
 function replay(){if(!lastSeats)return;recorded.current=false;adoptLocal(createMatch(lastSeats,rules));}

 async function animateLocal(source,pieceIndex){
  const id=++sequence.current,info=previewMove(source,pieceIndex);
  if(!info){setBusy(false);return;}
  const result=movePiece(source,pieceIndex),countryId=source.players[source.turn].countryId;
  const steps=info.from===STABLE?[0]:Array.from({length:Math.max(0,info.to-info.from)},(_,i)=>info.from+i+1);
  for(const step of steps){if(id!==sequence.current)return;setMotion({countryId,pieceIndex,step});await wait(window.matchMedia('(prefers-reduced-motion: reduce)').matches?10:90);}
  if(id!==sequence.current)return;setMotion(null);
  if(result.event?.captured?.length&&result.event.landing!==null){const p=trackPosition(result.event.landing);setBlast({...p,key:Date.now(),fx:cosmeticLoadout?.capture_fx});setTimeout(()=>setBlast(null),720);}
  setBusy(false);setDice(null);adoptLocal(result.match,result.match.status==='finished'&&!recorded.current);
  if(result.match.status==='finished')recorded.current=true;
 }
 async function rollLocal(automated=false){
  if(!match||match.status!=='playing'||busy||match.pendingRoll!==null)return;
  const player=currentPlayer(match);if(!player||(!automated&&player.type==='bot'))return;
  setBusy(true);setLegal([]);setNotice(countryFor(player.countryId).name+' lance le dé…');dadaTone('roll',sound);dadaHaptic('roll',haptic);
  const finalRoll=secureRoll();for(let i=0;i<6;i++){setDice(i===5?finalRoll:secureRoll());await wait(48);}
  const rolled=rollTurn(match,finalRoll);setDice(finalRoll);adoptLocal(rolled.match);
  if(rolled.match.status!=='playing'||rolled.autoPass||rolled.match.pendingRoll===null){setBusy(false);await wait(260);setDice(null);return;}
  const moves=rolled.match.pendingMoves,active=rolled.match.players[rolled.match.turn],allStable=finalRoll===6&&moves.length&&moves.every(i=>active.pieces[i].steps===STABLE);
  const piece=automated?selectBotMove(rolled.match,finalRoll,rolled.match.turn,player.aiLevel||rules.aiLevel):(moves.length===1||allStable?moves[0]:null);
  if(piece!==null){await wait(180);await animateLocal(rolled.match,piece);return;}
  setLegal(moves);setBusy(false);setNotice('Choisis un Totem illuminé.');
 }
 function chooseLocal(pieceIndex){if(!match||busy||!match.pendingMoves?.includes(pieceIndex))return;setBusy(true);animateLocal(match,pieceIndex);}

 useEffect(()=>{
  if(view!=='local'||!match||match.status!=='playing'||busy)return;
  const player=currentPlayer(match);if(player?.type!=='bot')return;
  const t=setTimeout(()=>{if(match.pendingRoll===null)rollLocal(true);else{const p=selectBotMove(match,match.pendingRoll,match.turn,player.aiLevel||rules.aiLevel);if(p!==null){setBusy(true);animateLocal(match,p);}}},520);
  return()=>clearTimeout(t);
 },[view,match?.turn,match?.sequence,busy]);

 useEffect(()=>{
  if(view!=='local'||!match||match.status!=='playing'||match.rules.timerSeconds<=0){setLocalDeadline(null);return;}
  if(currentPlayer(match)?.type==='bot'){setLocalDeadline(null);return;}
  setLocalDeadline(Date.now()+match.rules.timerSeconds*1000);
 },[view,match?.turn,match?.pendingRoll,match?.status]);
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  if(!localDeadline||!match||match.status!=='playing'||busy||clock<localDeadline)return;
  setBusy(true);const result=resolveTimeout(match,secureRoll());setBusy(false);adoptLocal(result.match);setNotice('Temps écoulé · l’IA Gardien a sécurisé le tour.');
 },[clock,localDeadline]);
 useEffect(()=>{
  if(view!=='local'||!match||match.status!=='playing'||!match.rules.maxDurationMinutes)return;
  if(Date.now()-match.createdAt<match.rules.maxDurationMinutes*60000)return;
  const ended=finishByTime(match);adoptLocal(ended,!recorded.current);recorded.current=true;
 },[clock,view,match?.status]);

 async function loadCosmetics(){
  if(!account.user){setCosmeticStatus('Connecte-toi à ton compte 3B pour utiliser la collection.');return null;}
  setCosmeticStatus('Chargement de la collection…');
  try{const data=await dadaRequest('cosmetics');setCosmetics({loadout:data.loadout,catalog:data.catalog||[],season:data.season||null});setCosmeticStatus('Collection synchronisée.');return data;}
  catch(error){setCosmeticStatus(error.message||'Collection indisponible.');return null;}
 }
 async function equipCosmetic(slot,itemCode){
  setCosmeticStatus('Équipement…');
  try{const data=await dadaRequest('equip',{slot,itemCode});setCosmetics({loadout:data.loadout,catalog:data.catalog||[],season:data.season||null});setCosmeticStatus('Cosmétique équipé.');}
  catch(error){setCosmeticStatus(error.message||'Équipement impossible.');}
 }
 async function claimCosmetic(ruleCode){
  setCosmeticStatus('Validation de l’XP…');
  try{const data=await dadaRequest('claim',{ruleCode});setCosmetics({loadout:data.loadout,catalog:data.catalog||[],season:data.season||null});setCosmeticStatus('Récompense ajoutée à ton inventaire 3B.');}
  catch(error){setCosmeticStatus(error.message||'Récompense indisponible.');}
 }

 async function onlineAction(action,body={}){
  setOnlineBusy(true);setOnlineStatus('Synchronisation serveur…');
  try{const data=await dadaRequest(action,body);if(data.room)setOnlineRoom(data.room);setOnlineStatus('Serveur 3B synchronisé.');return data;}
  catch(error){setOnlineStatus(error.message||'Connexion interrompue.');if(onlineRoom?.id&&action!=='status')dadaRequest('status',{room:onlineRoom.id}).then(d=>setOnlineRoom(d.room)).catch(()=>{});return null;}
  finally{setOnlineBusy(false);}
 }
 async function enterOnline(mode){
  if(!account.user){setOnlineStatus('Connecte-toi à ton compte 3B pour jouer en ligne.');setView('online');setOnlineMode(mode);return;}
  setView('online');setOnlineMode(mode);
  if(['quick','ranked','team2v2'].includes(mode))await onlineAction('queue',{mode,countryId:onlineCountry,rules:{...rules,teamMode:mode==='team2v2'}});
  if(mode==='leaderboard'){const data=await onlineAction('leaderboard');if(data?.leaderboard)setLeaderboard(data.leaderboard);}
 }
 useEffect(()=>{
  if(!onlineRoom?.id||!account.user)return;
  let stop=()=>{},dead=false;
  subscribeDadaRoom(onlineRoom.id,(room)=>!dead&&setOnlineRoom(room),setOnlineStatus).then(fn=>{if(dead)fn();else stop=fn;}).catch(e=>setOnlineStatus(e.message));
  const poll=setInterval(()=>dadaRequest('tick',{room:onlineRoom.id}).then(d=>!dead&&setOnlineRoom(d.room)).catch(()=>{}),9000);
  return()=>{dead=true;stop();clearInterval(poll);};
 },[onlineRoom?.id,account.user?.id]);
 async function leaveOnline(){if(onlineRoom?.id)await onlineAction('leave',{room:onlineRoom.id});setOnlineRoom(null);setView('menu');}

 const deadlineMs=onlineRoom?.turnDeadline?Math.max(0,Date.parse(onlineRoom.turnDeadline)-clock):localDeadline?Math.max(0,localDeadline-clock):null;
 const winner=renderMatch?.winner?countryFor(renderMatch.winner):null;
 const winningTeam=renderMatch?.winnerTeam||null;
 const winningPlayers=winningTeam?renderMatch.players.filter(p=>p.team===winningTeam):[];
 const endAchievements=winner&&renderMatch?achievementsFor(renderMatch,winner.id):[];

 if(view==='menu')return <div className="dada3b-shell dada3b-shell-v8" role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><div><small>Jeux 3B</small><strong>DADA 3B — Le Cercle des 8 Portes</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
  <main className="dada3b-setup dada3b-menu-setup"><section className="dada3b-setup-card dada3b-home-menu dada3b-home-menu-v8">
   <div className="dada3b-menu-hero dada3b-menu-hero-v8">
    <div className="dada3b-menu-copy"><span className="dada3b-kicker">APEX CLARTÉ</span><h2>Choisis. Lance. Joue.</h2><p>Le plateau t’indique directement le Totem actif, les déplacements possibles, les protections et les impacts.</p></div>
    <div className="dada3b-door-intro dada3b-door-intro-v8" data-intro={cosmeticLoadout?.intro_fx||'DADA_INTRO_EIGHT_DOORS'} aria-hidden="true">{COUNTRIES_3B.map(c=><i key={c.id} style={{'--door':c.accent}}><span>{c.crest}</span></i>)}</div>
   </div>
   <div className="dada3b-menu-primary dada3b-menu-primary-v8">
    <button className="dada3b-menu-cta dada3b-menu-play" onClick={()=>setView('local-setup')}><Play size={20}/><span><strong>Jouer</strong><small>Local & IA</small></span></button>
    <button className="dada3b-menu-cta" disabled={restored?.status!=='playing'} onClick={resumeLocal}><RotateCcw size={20}/><span><strong>Reprendre</strong><small>{restored?.status==='playing'?'Partie sauvegardée':'Aucune sauvegarde'}</small></span></button>
    <button className="dada3b-menu-cta" onClick={()=>{setView('online');setOnlineMode('quick');setOnlineStatus('');}}><Users size={20}/><span><strong>Multijoueur</strong><small>Rapide · privé · classé · 2v2</small></span></button>
    <button className="dada3b-menu-cta" onClick={()=>enterOnline('leaderboard')}><Shield size={20}/><span><strong>Classement</strong><small>Voir les meilleurs joueurs</small></span></button>
   </div>
   <details className="dada3b-menu-more dada3b-menu-more-v8"><summary>Plus d’options</summary><div>
    <button onClick={()=>enterOnline('join')}><strong>Rejoindre</strong><small>Entrer un code de salon</small></button>
    <button onClick={()=>enterOnline('spectate')}><strong>Spectateur</strong><small>Observer une partie</small></button>
    <button onClick={()=>{setView('cosmetics');loadCosmetics();}}><strong>Collection</strong><small>Totems · dés · traces</small></button>
    <div className="dada3b-feedback-options"><button aria-pressed={sound} onClick={()=>setSound(!sound)}>Son {sound?'ON':'OFF'}</button><button aria-pressed={haptic} onClick={()=>setHaptic(!haptic)}>Vibration {haptic?'ON':'OFF'}</button><button aria-pressed={voice} onClick={()=>setVoice(!voice)}>Voix {voice?'ON':'OFF'}</button></div>
   </div></details>
  </section></main>
 </div>;

 if(view==='cosmetics')return <div className="dada3b-shell" role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><button className="dada3b-icon-button" onClick={()=>setView('menu')}><ArrowLeft size={19}/></button><div><small>Inventaire 3B · DADA</small><strong>Collection & loadout</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
  <main className="dada3b-setup"><section className="dada3b-setup-card dada3b-cosmetics">
   <span className="dada3b-kicker">COSMÉTIQUE UNIQUEMENT · 0 AVANTAGE GAMEPLAY</span><h2>Personnalise ton Cercle.</h2>
   <p>Les objets débloqués restent dans ton inventaire 3B. Les Totems nationaux ne s’affichent que lorsque tu joues le pays correspondant.</p>
   {!account.user?<div className="dada3b-event"><b>Compte 3B requis</b><br/>La collection permanente est liée à ton compte.</div>:
   !cosmetics?<button className="dada3b-primary" onClick={loadCosmetics}>Charger ma collection</button>:
   <>{cosmetics.season&&<section className="dada3b-season-card" data-status={cosmetics.season.status}><span className="dada3b-kicker">{cosmetics.season.status==='active'?'SAISON ACTIVE':'SAISON EN PRÉPARATION'}</span><h3>{cosmetics.season.label}</h3><p>{cosmetics.season.status==='draft'?'Aucune date n’est publiée. Les règles compétitives restent identiques.':'Rotation visuelle des huit nations en cours.'}</p><div>{cosmetics.season.rotation.map(stop=>{const country=countryFor(stop.country);return <span key={stop.country}>{country?.flag} {country?.name} · {stop.value}</span>;})}</div></section>}<div className="dada3b-cosmetic-groups">{Object.entries(COSMETIC_SLOT_LABELS).map(([slot,label])=><section key={slot}><h3>{label}</h3><div className="dada3b-cosmetic-grid">{cosmetics.catalog.filter(item=>item.slot===slot).map(item=>{const equipped=cosmetics.loadout?.[slot]===item.code,canClaim=!item.owned&&item.ruleCode&&currentXp>=item.xpRequired;return <article key={item.code} data-rarity={item.rarity} data-owned={item.owned}><div><b>{item.name}</b><small>{item.collection} · {item.rarity}{item.value?' · '+item.value:''}</small></div><p>{item.description}</p><footer>{item.owned?<button className={equipped?'dada3b-secondary':'dada3b-primary'} disabled={equipped} onClick={()=>equipCosmetic(slot,item.code)}>{equipped?'Équipé':'Équiper'}</button>:item.ruleCode?<button className="dada3b-secondary" disabled={!canClaim} onClick={()=>claimCosmetic(item.ruleCode)}>{canClaim?'Réclamer':item.xpRequired.toLocaleString('fr-FR')+' XP requis'}</button>:<span>Verrouillé</span>}</footer></article>;})}</div></section>)}</div></>}
   <p role="status">{cosmeticStatus}</p>
  </section></main>
 </div>;

 if(view==='local-setup')return <div className="dada3b-shell" role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><button className="dada3b-icon-button" onClick={()=>setView('menu')}><ArrowLeft size={19}/></button><div><small>Configuration locale</small><strong>2 à 8 joueurs · humains + IA</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
  <main className="dada3b-setup"><section className="dada3b-setup-card">
   <span className="dada3b-kicker">TOTEMS 3B</span><h2>Compose ton Cercle.</h2>
   <div className="dada3b-country-grid">{COUNTRIES_3B.map(c=><SeatCard key={c.id} country={c} seat={seats.find(s=>s.countryId===c.id)} teamMode={rules.teamMode} onChange={next=>updateSeat(c.id,next)}/>)}</div>
   <details className="dada3b-settings dada3b-settings-collapsed"><summary><span>Règles avancées</span><small>Sanctuaires · Bouclier · timer · plateau</small></summary><div className="dada3b-rule-grid">
    <RuleToggle checked={rules.safeCells} onChange={v=>updateRule('safeCells',v)} label="Sanctuaires" detail="Les huit Portes de départ protègent les Totems."/>
    <RuleToggle checked={rules.barricades} onChange={v=>updateRule('barricades',v)} label="Bouclier 3B" detail="Deux Totems alliés forment une barricade."/>
    <RuleToggle checked={rules.captureRequired} onChange={v=>updateRule('captureRequired',v)} label="Capture obligatoire" detail="Une capture disponible doit être jouée."/>
    <RuleToggle checked={rules.bonusOnCapture} onChange={v=>updateRule('bonusOnCapture',v)} label="Bonus capture" detail="Une capture donne un nouveau tour."/>
    <RuleToggle checked={rules.tripleSixPenalty} onChange={v=>updateRule('tripleSixPenalty',v)} label="Trois 6" detail="Le troisième 6 consécutif déclenche la surcharge Matrix."/>
    <RuleToggle checked={rules.teamMode} onChange={setTeamMode} label="2v2 local" detail="Deux équipes de deux pays. Les alliés ne peuvent pas se capturer."/>
   </div><div className="dada3b-select-grid">
    <label className="dada3b-field"><span>Totems</span><select value={rules.piecesPerPlayer} onChange={e=>updateRule('piecesPerPlayer',Number(e.target.value))}>{[2,3,4].map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="dada3b-field"><span>Timer</span><select value={rules.timerSeconds} onChange={e=>updateRule('timerSeconds',Number(e.target.value))}>{[0,20,30,45].map(v=><option key={v} value={v}>{v?v+' s':'Libre'}</option>)}</select></label>
    <label className="dada3b-field"><span>Durée max</span><select value={rules.maxDurationMinutes} onChange={e=>updateRule('maxDurationMinutes',Number(e.target.value))}>{[0,10,20,30,45,60].map(v=><option key={v} value={v}>{v?v+' min':'Libre'}</option>)}</select></label>
    <label className="dada3b-field"><span>Plateau</span><select value={rules.boardTheme} onChange={e=>updateRule('boardTheme',e.target.value)}>{BOARD_THEMES.map(v=><option key={v} value={v}>{v==='nexus'?'Nexus 3B':countryFor(v)?.name||v}</option>)}</select></label>
   </div></details>
   <div className="dada3b-launch"><span>{activeSeats.length} pays actifs · {activeSeats.filter(s=>s.type==='human').length} humain(s) · {activeSeats.filter(s=>s.type==='bot').length} IA{rules.teamMode?' · OR '+activeSeats.filter(s=>s.team==='A').length+' / MATRIX '+activeSeats.filter(s=>s.team==='B').length:''}</span><button className="dada3b-primary" disabled={rules.teamMode?activeSeats.length!==4:activeSeats.length<2} onClick={beginLocal}>Ouvrir le Cercle</button></div>
  </section></main>
 </div>;

 if(view==='online'&&!onlineRoom)return <div className="dada3b-shell" role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><button className="dada3b-icon-button" onClick={()=>setView('menu')}><ArrowLeft size={19}/></button><div><small>Multijoueur sécurisé</small><strong>{onlineMode==='ranked'?'Classé':onlineMode==='quick'?'Jeu rapide':onlineMode==='team2v2'?'2v2 équipes':onlineMode==='spectate'?'Spectateur':onlineMode==='join'?'Rejoindre un salon':'Salon privé'}</strong></div><button className="dada3b-icon-button" onClick={onClose}><X size={20}/></button></header>
  <main className="dada3b-setup"><section className="dada3b-setup-card dada3b-online-setup">
   <div className="dada3b-online-tabs" role="tablist" aria-label="Modes multijoueur">
    {[['quick','Rapide'],['private','Privé'],['join','Rejoindre'],['ranked','Classé'],['team2v2','2v2']].map(([mode,label])=><button key={mode} aria-pressed={onlineMode===mode} onClick={()=>{setOnlineMode(mode);setOnlineStatus('');}}>{label}</button>)}
   </div>
   {!account.user&&<div className="dada3b-event"><b>Compte 3B requis</b><br/>Connecte-toi pour jouer en ligne.</div>}
   {onlineMode==='leaderboard'?<><h2>Classement DADA 3B</h2><button className="dada3b-primary" disabled={!account.user||onlineBusy} onClick={async()=>{const d=await onlineAction('leaderboard');if(d?.leaderboard)setLeaderboard(d.leaderboard);}}>Actualiser</button><div className="dada3b-leaderboard">{leaderboard.map(r=><div key={r.rank}><b>#{r.rank} {r.handle}</b><span>{r.rating} · {r.wins} V / {r.losses} D</span></div>)}</div></>:
   <><CountryPicker value={onlineCountry} onChange={setOnlineCountry}/>
    {['join','spectate'].includes(onlineMode)&&<label className="dada3b-field"><span>Code du salon</span><input value={roomCode} maxLength={6} onChange={e=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} placeholder="ABC234"/></label>}
    {onlineMode==='private'&&<><RuleToggle checked={rules.teamMode} onChange={v=>{updateRule('teamMode',v);if(v)setMaxPlayers(4);}} label="Salon 2v2" detail="Deux équipes de deux. OR contre MATRIX."/><label className="dada3b-field"><span>Nombre maximum</span><select value={rules.teamMode?4:maxPlayers} disabled={rules.teamMode} onChange={e=>setMaxPlayers(Number(e.target.value))}>{[2,3,4,5,6,7,8].map(v=><option key={v}>{v}</option>)}</select></label></>}
    <button className="dada3b-primary" disabled={!account.user||onlineBusy} onClick={()=>onlineMode==='private'?onlineAction('create',{mode:'private',countryId:onlineCountry,maxPlayers:rules.teamMode?4:maxPlayers,rules}):onlineMode==='join'?onlineAction('join',{code:roomCode,countryId:onlineCountry}):onlineMode==='spectate'?onlineAction('spectate',{code:roomCode}):onlineAction('queue',{mode:onlineMode,countryId:onlineCountry,rules})}>{onlineBusy?'Connexion…':onlineMode==='private'?'Créer le salon':onlineMode==='join'?'Rejoindre':onlineMode==='spectate'?'Observer':'Chercher un adversaire'}</button>
   </>}
   <p role="status">{onlineStatus}</p>
  </section></main>
 </div>;

 if(onlineRoom?.status==='waiting')return <div className="dada3b-shell" role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><button className="dada3b-icon-button" onClick={leaveOnline}><ArrowLeft size={19}/></button><div><small>{onlineRoom.mode==='team2v2'||onlineRoom.rules?.teamMode?'2V2 OR / MATRIX':'Salon privé'} · {onlineRoom.players.length}/{onlineRoom.maxPlayers}</small><strong>Code {onlineRoom.code}</strong></div><button className="dada3b-icon-button" onClick={()=>navigator.clipboard?.writeText(onlineRoom.code)}><Copy size={18}/></button></header>
  <main className="dada3b-setup"><section className="dada3b-setup-card"><span className="dada3b-kicker">EN ATTENTE</span><h2>Rassemble les nations.</h2><div className="dada3b-lobby-list">{onlineRoom.players.map((p,i)=>{const c=countryFor(p.countryId);return <div key={i} style={{'--country':c.accent}}><b>{c.flag} {p.name}{p.isSelf?' · TOI':''}{p.team?' · '+TEAM_LABELS[p.team]:''}</b><span>{p.ready?'PRÊT':'EN ATTENTE'}</span></div>;})}</div>
   <div className="dada3b-victory-actions">{selfOnline&&<button className="dada3b-secondary" disabled={onlineBusy} onClick={()=>onlineAction('ready',{room:onlineRoom.id,ready:!selfOnline.ready})}>{selfOnline.ready?'Annuler prêt':'Je suis prêt'}</button>}{onlineRoom.isHost&&<button className="dada3b-primary" disabled={onlineBusy||(onlineRoom.rules?.teamMode?onlineRoom.players.length!==4:onlineRoom.players.length<2)||onlineRoom.players.some(p=>!p.ready)} onClick={()=>onlineAction('start',{room:onlineRoom.id})}>Ouvrir le Cercle</button>}<button className="dada3b-secondary" onClick={leaveOnline}>Quitter</button></div><p role="status">{onlineStatus}</p>
  </section></main>
 </div>;

 if(!renderMatch)return null;
 const isOnline=Boolean(onlineRoom);
 const timeLeft=deadlineMs===null?null:Math.ceil(deadlineMs/1000);
 const focus=renderMatch.lastEvent?.sanctuary?'sanctuary':renderMatch.lastEvent?.type||'';
 const boardPieceAction=piece=>isOnline?onlineAction('move',{room:onlineRoom.id,revision:onlineRoom.revision,piece}):chooseLocal(piece);
 const fallbackBoard=<Board match={renderMatch} legal={currentLegal} motion={motion} blast={blast} onPiece={boardPieceAction} focusEvent={focus} loadout={cosmeticLoadout} cosmeticsByCountry={cosmeticsByCountry}/>;
 const ownsTurn=isOnline?selfTurn:turnPlayer?.type!=='bot';
 const turnLabel=turnPlayer?.type==='bot'?'IA':ownsTurn?'À TOI':'ADVERSE';
 return <div className="dada3b-shell dada3b-shell-v8" data-theme={renderMatch.rules?.boardTheme||'nexus'} role="dialog" aria-modal="true">
  <header className="dada3b-topbar"><div><small>{isOnline?(onlineRoom.mode==='ranked'?'CLASSÉ':onlineRoom.mode.toUpperCase()):'LOCAL'} · Manche {renderMatch.round}</small><strong>DADA 3B · {turnCountry?.name||''}</strong></div><div className="dada3b-top-actions"><button className="dada3b-render-toggle" aria-pressed={threeD&&!threeFailed} onClick={()=>{if(threeFailed){setThreeFailed(false);setThreeD(true);}else setThreeD(v=>!v);}}>{threeD&&!threeFailed?'3D APEX':'2,5D'}</button>{timeLeft!==null&&<span className="dada3b-timer" data-low={timeLeft<=7}>{timeLeft}s</span>}{isOnline&&<span className="dada3b-live"><Wifi size={14}/> LIVE</span>}<button className="dada3b-icon-button" onClick={()=>isOnline?leaveOnline():setView('menu')}><X size={20}/></button></div></header>
  <div className="dada3b-arena"><div className="dada3b-board-wrap">{threeD&&!threeFailed?<Dada3DErrorBoundary fallback={fallbackBoard} onFail={()=>setThreeFailed(true)}><React.Suspense fallback={fallbackBoard}><Dada3BThree match={renderMatch} legal={currentLegal} motion={motion} blast={blast} onPiece={boardPieceAction} focusEvent={focus} loadout={cosmeticLoadout} cosmeticsByCountry={cosmeticsByCountry} onUnsupported={()=>setThreeFailed(true)}/></React.Suspense></Dada3DErrorBoundary>:fallbackBoard}<div className="dada3b-board-turn-chip" style={{'--country':turnCountry?.accent||'#6fe7f8'}}><span>TOUR</span><strong>{turnCountry?.flag} {turnCountry?.name}</strong><em data-own={ownsTurn}>{turnLabel}</em></div></div>
   <aside className="dada3b-sidebar"><section className="dada3b-turn-card" style={{'--country':turnCountry?.accent||'#c7a66a'}}><div className="dada3b-turn-line"><div><span className="dada3b-kicker">Tour actuel</span><strong>{turnCountry?.flag} {turnCountry?.name}</strong><small>{turnCountry?.guardian} · {turnCountry?.value}{turnPlayer?.type==='bot'?' · IA '+(turnPlayer.aiLevel||''):''}</small></div></div>
    <PremiumDice value={shownDice} rolling={(busy||onlineBusy)&&renderMatch.pendingRoll===null} skin={cosmeticLoadout?.dice_skin||'DADA_DICE_CORE'} country={turnCountry?.accent} pending={Boolean(renderMatch.pendingRoll)} adverse={Boolean(isOnline&&!selfTurn)} onClick={()=>isOnline?onlineAction('roll',{room:onlineRoom.id,revision:onlineRoom.revision}):rollLocal(false)} disabled={busy||onlineBusy||renderMatch.status!=='playing'||renderMatch.pendingRoll!==null||(isOnline?!selfTurn:turnPlayer?.type==='bot')}/>
    {isOnline&&selfOnline?.botTakeover&&<button className="dada3b-secondary" onClick={()=>onlineAction('reconnect',{room:onlineRoom.id})}>Reprendre ma place</button>}
   </section>
   <section className="dada3b-event" aria-live="polite"><b>Transmission 3B</b><br/>{isOnline?(renderMatch.lastEvent?.text||onlineStatus):notice}</section>
   <details className="dada3b-tactical-panel"><summary>Progression & pouvoirs</summary><div className="dada3b-tactical-content"><section className="dada3b-roster"><h3>Progression</h3>{renderMatch.players.map((p,i)=>{const c=countryFor(p.countryId),home=p.pieces.filter(x=>x.steps===FINISH_STEP).length,stable=p.pieces.filter(x=>x.steps===STABLE).length;return <div className="dada3b-roster-row" key={c.id} style={{'--country':c.accent}}><span className="dada3b-roster-dot"/><div><strong>{i===renderMatch.turn?'› ':''}{c.flag} {c.name}</strong><small>{stable} écurie · {p.stats.captures} captures · {p.stats.barricadesFormed} boucliers{p.team?' · '+TEAM_LABELS[p.team]:''}</small></div><span>{home}/{renderMatch.rules.piecesPerPlayer}</span></div>;})}</section><PowerDeck match={renderMatch} focus={focus}/></div></details>
   <details className="dada3b-history"><summary>Historique & statistiques</summary>{(renderMatch.history||[]).slice(-8).reverse().map(e=><p key={e.id}>{e.text}</p>)}</details>
   <div className="dada3b-rules"><Shield size={13}/> Sanctuaires {renderMatch.rules.safeCells?'ON':'OFF'} · Bouclier {renderMatch.rules.barricades?'ON':'OFF'} · 3×6 {renderMatch.rules.tripleSixPenalty?'ON':'OFF'}{renderMatch.rules.teamMode?' · 2v2 OR/MATRIX':''}</div>
   </aside>
  </div>
  {tutorial&&<Tutorial step={tutorialStep} setStep={setTutorialStep} onClose={()=>setTutorial(false)}/>}
  {winner&&<div className="dada3b-victory"><section className="dada3b-victory-card" style={{'--country':winner.accent}}><span className="dada3b-kicker">{renderMatch.endedReason==='time'?'TEMPS ÉCOULÉ':'NEXUS COMPLÉTÉ'} · Score {winningTeam?teamScoreFor(renderMatch,winningTeam):scoreFor(renderMatch,winner.id)}</span><h2>{winningTeam?'Équipe '+TEAM_LABELS[winningTeam]:winner.flag+' '+winner.name}</h2><p>{winningTeam?winningPlayers.map(p=>countryFor(p.countryId).flag+' '+countryFor(p.countryId).name).join(' + ')+' remportent le Cercle ensemble.':winner.guardian+' scelle '+winner.value+'. '+(renderMatch.players.find(p=>p.countryId===winner.id)?.stats.captures||0)+' capture(s).'}</p>{endAchievements.length>0&&<div className="dada3b-achievements">{endAchievements.map(a=><span key={a.id}>✓ {a.title}</span>)}</div>}<div className="dada3b-victory-actions">{!isOnline&&lastSeats&&<button className="dada3b-primary" onClick={replay}><RotateCcw size={17}/> Rejouer</button>}<button className="dada3b-secondary" onClick={()=>isOnline?leaveOnline():setView('menu')}>Retour aux modes</button></div></section></div>}
 </div>;
}
