import React,{useEffect,useMemo,useRef,useState} from 'react';
import {X,Play,RotateCcw,Target,Shield,Trash2,ChevronRight,BookOpen} from 'lucide-react';
import {NATIONS,UNIT_TYPES,EXCHANGES,MAX_ORDERS} from './constants.js';
import {SECTORS} from './board.js';
import {createPowerGame,unitsIn,gameScore,snapshotPowerGame} from './state.js';
import {queueMove,queueExchange,queueReinforcement,queueMegaMissile,cancelOrder,legalTargets,resolveTurn} from './engine.js';
import {BOARD_W,BOARD_H,renderPowerBoard} from './render.js';
import './power3b.css';

const eventWeight={victory:9,flag:8,mega:7,battle:5,stalemate:4,exchange:3,reinforce:2};
export default function Power3B({saved,onCheckpoint,onClose}){
 const canvas=useRef(null),scrollRef=useRef(null);
 const[game,setGame]=useState(()=>saved?createPowerGame({snapshot:saved}):createPowerGame({nation:0}));
 const[started,setStarted]=useState(false),[nation,setNation]=useState(game.humanNation),[difficulty,setDifficulty]=useState(game.difficulty||'veteran');
 const[sectorId,setSectorId]=useState('hq'+game.humanNation),[unitIds,setUnitIds]=useState([]),[mode,setMode]=useState('move'),[notice,setNotice]=useState('');
 const[cinematic,setCinematic]=useState(null),[rules,setRules]=useState(false);
 const human=game.humanNation,me=game.nations[human],myOrders=game.orders.filter(o=>o.nation===human),committedPower=game.orders.filter(o=>o.nation===human).reduce((sum,o)=>sum+(o.cost||0),0),availablePower=Math.max(0,me.power-committedPower);
 const selectedUnits=unitIds.map(id=>game.units.find(u=>u.id===id)).filter(Boolean);
 const legal=useMemo(()=>selectedUnits.length?SECTORS.map(s=>s.id).filter(id=>selectedUnits.every(u=>legalTargets(game,u.id).includes(id))):[],[game,unitIds]);
 const sectorUnits=unitsIn(game,sectorId),mySectorUnits=sectorUnits.filter(u=>u.nation===human&&u.type!=='flag');
 const commit=(fn,message='Ordre enregistré.')=>{try{const next=structuredClone(game);fn(next);setGame(next);setNotice(message);}catch(error){setNotice(error.message||'Ordre impossible.');}};
 const checkpoint=(g,record=false)=>onCheckpoint?.({score:gameScore(g),won:g.winner===human,snapshot:()=>snapshotPowerGame(g)},'power3b',record);
 const newGame=()=>{const next=createPowerGame({nation,difficulty,seed:196});setGame(next);setSectorId('hq'+nation);setUnitIds([]);setMode('move');setStarted(true);setNotice('Commandement actif. Programme jusqu’à 5 ordres.');};
 const close=()=>{checkpoint(game,false);onClose();};
 const resolve=()=>{if(cinematic)return;const next=resolveTurn(game);setGame(next);setUnitIds([]);setMode('move');setSectorId('hq'+human);checkpoint(next,next.winner!==null);
  const best=[...(next.lastResolution?.events||[])].sort((a,b)=>(eventWeight[b.type]||0)-(eventWeight[a.type]||0))[0];if(best)setCinematic(best);else setNotice('Aucun conflit cette manche. Les positions sont maintenues.');
 };
 useEffect(()=>{if(!cinematic)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const ms=reduced?350:cinematic.type==='victory'?3200:['flag','mega'].includes(cinematic.type)?2400:1450;const t=setTimeout(()=>setCinematic(null),ms);return()=>clearTimeout(t);},[cinematic]);
 useEffect(()=>{const c=canvas.current;if(!c)return;const ctx=c.getContext('2d');renderPowerBoard(ctx,game,{sectorId,unitIds,legalTargets:mode==='move'?legal:mode==='mega'?SECTORS.map(s=>s.id):[]});},[game,sectorId,unitIds,legal,mode]);
 useEffect(()=>{const key=e=>{if(e.key==='Escape')close();if((e.key==='Enter'||e.key===' ')&&started&&!cinematic){e.preventDefault();resolve();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const canvasTap=e=>{if(cinematic||game.winner!==null)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*BOARD_W,y=(e.clientY-r.top)/r.height*BOARD_H;
  let target=null,best=90;for(const s of SECTORS){const d=Math.hypot(x-s.x,y-s.y);if(d<best){best=d;target=s;}}if(!target)return;
  if(mode==='mega'){commit(next=>queueMegaMissile(next,human,target.id),'Méga-missile programmé sur '+target.name+'.');setMode('move');return;}
  if(unitIds.length&&target.id!==sectorId){commit(next=>queueMove(next,human,unitIds,target.id),'Déplacement programmé vers '+target.name+'.');setUnitIds([]);setSectorId(target.id);return;}
  setSectorId(target.id);setUnitIds([]);
 };
 const toggleUnit=id=>{const u=game.units.find(x=>x.id===id);if(!u||u.nation!==human||game.orders.some(o=>o.unitIds?.includes(id)))return;setUnitIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);setMode('move');};
 const exchangeOptions=EXCHANGES.filter(r=>mySectorUnits.filter(u=>u.type===r.from&&!game.orders.some(o=>o.unitIds?.includes(u.id))).length>=r.count);
 const resume=()=>{setStarted(true);setSectorId('hq'+human);setNotice('Partie restaurée.');};
 const reset=()=>{setStarted(false);setNation(human);setNotice('Nouvelle campagne prête à être configurée.');};
 return <div className="power3b-shell" role="dialog" aria-modal="true" aria-label="Power 3B">
  <header className="power3b-header"><button onClick={close} aria-label="Quitter Power 3B"><X/></button><div><span>JEU 3B · STRATÉGIE TOTALE</span><strong>POWER <b>3B</b></strong></div><div className="power3b-header-actions"><button onClick={()=>setRules(true)}><BookOpen size={18}/>Règles</button><button onClick={reset}><RotateCcw size={18}/>Nouvelle</button></div></header>
  {!started&&<div className="power3b-intro"><div className="power3b-intro-card"><span>8 NATIONS · TERRE · MER · AIR</span><h2>Prends le commandement.</h2><p>Programme jusqu’à cinq ordres secrets par manche, augmente la puissance de ton armée et capture les QG adverses avec ton infanterie.</p>
   <div className="power3b-nations">{NATIONS.map(n=><button key={n.id} className={nation===n.id?'selected':''} style={{'--nation':n.primary}} onClick={()=>setNation(n.id)}><i>{n.code}</i><strong>{n.name}</strong><small>{n.value}</small></button>)}</div>
   <label className="power3b-difficulty">Commandement IA <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="normal">Stratège</option><option value="veteran">Vétéran</option><option value="elite">Élite</option></select></label>
   <button className="power3b-primary" onClick={saved?resume:newGame}><Play size={19}/>{saved?'Reprendre la campagne':'Lancer Power 3B'}</button>
   {saved&&<button className="power3b-text" onClick={newGame}>Commencer une nouvelle campagne avec ces réglages</button>}
  </div></div>}
  {started&&<><div className="power3b-status"><div><span>Nation</span><strong style={{color:NATIONS[human].primary}}>{NATIONS[human].name} · {NATIONS[human].value}</strong></div><div><span>Manche</span><strong>{game.round}</strong></div><div><span>Power disponible</span><strong>{availablePower} / {me.power}</strong></div><div><span>Ordres</span><strong>{myOrders.length} / {MAX_ORDERS}</strong></div><div><span>QG capturés</span><strong>{me.flagsCaptured} / 7</strong></div></div>
   <div className="power3b-main">
    <section className="power3b-board-panel"><div className="power3b-board-scroll" ref={scrollRef}><canvas ref={canvas} width={BOARD_W} height={BOARD_H} onClick={canvasTap} aria-label="Plateau stratégique Power 3B"/></div><p className="power3b-board-hint">{mode==='mega'?'CIBLAGE MÉGA-MISSILE · touche un secteur':unitIds.length?'UNITÉS SÉLECTIONNÉES · touche un secteur lumineux pour programmer le déplacement':'Touche un secteur pour inspecter ses unités.'}</p></section>
    <aside className="power3b-command">
     <div className="power3b-command-title"><span>SECTEUR</span><strong>{SECTORS.find(s=>s.id===sectorId)?.name}</strong></div>
     <div className="power3b-units">{sectorUnits.length?sectorUnits.map(u=><button key={u.id} disabled={u.nation!==human||u.type==='flag'||game.orders.some(o=>o.unitIds?.includes(u.id))} className={unitIds.includes(u.id)?'selected':''} onClick={()=>toggleUnit(u.id)}><i style={{'--nation':NATIONS[u.nation].primary}}>{UNIT_TYPES[u.type].icon}</i><span><strong>{UNIT_TYPES[u.type].name}</strong><small>{NATIONS[u.nation].code} · puissance {UNIT_TYPES[u.type].strength}</small></span></button>):<p>Aucune unité dans ce secteur.</p>}</div>
     <div className="power3b-actions"><h3>ORDRES SPÉCIAUX</h3>
      {exchangeOptions.map(r=><button key={r.to} disabled={myOrders.length>=5} onClick={()=>commit(next=>queueExchange(next,human,sectorId,r.to))}>Échanger {r.count} {UNIT_TYPES[r.from].name} → {UNIT_TYPES[r.to].name}</button>)}
      <div className="power3b-reinforce">{['infantry','tank','fighter','destroyer'].map(type=><button key={type} disabled={myOrders.length>=5||availablePower<UNIT_TYPES[type].cost||me.reserve[type]-myOrders.filter(o=>o.type==='reinforce'&&o.unitType===type).length<1} onClick={()=>commit(next=>queueReinforcement(next,human,type))}>+ {UNIT_TYPES[type].name}<small>{UNIT_TYPES[type].cost} Power</small></button>)}</div>
      <button className={mode==='mega'?'armed':''} disabled={myOrders.length>=5||availablePower<100} onClick={()=>setMode(mode==='mega'?'move':'mega')}><Target size={18}/> Méga-missile <small>100 Power · usage unique</small></button>
     </div>
    </aside>
   </div>
   <section className="power3b-orders"><div className="power3b-orders-head"><div><span>ORDRES PROGRAMMÉS</span><strong>{myOrders.length} / 5</strong></div><button className="power3b-resolve" disabled={cinematic||game.winner!==null} onClick={resolve}><Shield size={18}/> EXÉCUTER LA MANCHE <ChevronRight size={18}/></button></div>
    <div className="power3b-order-list">{myOrders.length?myOrders.map((o,i)=><div key={o.id}><b>{i+1}</b><span><strong>{orderTitle(o)}</strong><small>{orderDetail(o)}</small></span><button onClick={()=>commit(next=>cancelOrder(next,human,o.id),'Ordre annulé.')} aria-label="Annuler cet ordre"><Trash2 size={16}/></button></div>):<p>Programme tes mouvements, échanges ou renforts. Tu peux exécuter la manche avec moins de cinq ordres.</p>}</div>
   </section>
   <p className="power3b-notice" role="status">{notice}</p>
  </>}
  {rules&&<div className="power3b-modal"><div><button className="power3b-modal-close" onClick={()=>setRules(false)}><X/></button><span>RÈGLES POWER 3B</span><h2>Le système classique, étendu à huit nations.</h2><ol><li>Programme au maximum 5 ordres. Une pièce ne reçoit qu’un ordre.</li><li>Déplace des forces ou échange plusieurs pièces contre une unité supérieure.</li><li>Les huit commandements exécutent leurs ordres dans la même manche.</li><li>Dans un secteur disputé, les puissances s’additionnent. Le plus fort capture les pièces ennemies ; en cas d’égalité, les unités engagées se replient.</li><li>Un territoire conquis rapporte du Power. Le Power permet de déployer des renforts.</li><li>À 100 Power, tu peux programmer un Méga-missile : toutes les unités du secteur visé sont détruites, puis le missile disparaît.</li><li>Un QG doit être pris par une Infanterie ou un Régiment. Le dernier commandement actif gagne.</li></ol></div></div>}
  {cinematic&&<div className={'power3b-cinematic '+cinematic.type} onClick={()=>setCinematic(null)}><div className="power3b-cine-lines"/><div className="power3b-cine-core">{cinematic.type==='mega'&&<div className="power3b-shockwave"/>}<span>{cinematic.type==='victory'?'3B · VICTOIRE':'RÉSOLUTION · MANCHE '+(game.round-1)}</span><h2>{cinematic.title}</h2><p>{cinematic.detail}</p><small>Toucher pour continuer</small></div></div>}
  {started&&game.winner!==null&&!cinematic&&<div className="power3b-end"><div><span>FIN DE CAMPAGNE</span><h2>{game.winner===human?'Victoire de '+NATIONS[human].name:NATIONS[game.winner].name+' prend le contrôle'}</h2><p>Score stratégique : {gameScore(game)} · {me.flagsCaptured} QG capturés.</p><button className="power3b-primary" onClick={reset}><RotateCcw/>Nouvelle campagne</button><button className="power3b-text" onClick={close}>Retour aux Jeux 3B</button></div></div>}
 </div>;
}
function orderTitle(o){if(o.type==='move')return'Déplacement';if(o.type==='exchange')return'Échange';if(o.type==='reinforce')return'Renfort';return'Méga-missile';}
function orderDetail(o){if(o.type==='move')return o.from+' → '+o.target+' · '+o.unitIds.length+' unité(s)';if(o.type==='exchange')return UNIT_TYPES[o.fromType].name+' → '+UNIT_TYPES[o.toType].name;if(o.type==='reinforce')return UNIT_TYPES[o.unitType].name+' au '+o.sectorId;return'Cible : '+o.target;}
