import React,{memo,useEffect,useState,useMemo} from 'react';
import {Menu,BookOpen,Map,ArrowUp,MessageCircle,DoorOpen,Sparkles,Swords,Trees,Mountain,Wheat} from 'lucide-react';
import {CompanionPortrait} from './Companions.jsx';
import {countryById,cardById} from './catalog.js';
import {Compass,MiniMap,DetailedMap} from './Cartography.jsx';
import {HERITAGE} from './heritage.js';
import {worldRuntimeItems} from './runtime-items.js';
import {WEATHER_LABELS} from './world-weather.js';
import {frontierState} from './frontier.js';
import {levelFor} from './rules.js';
import {compassHeading} from './settlements.js';
import {contextActions} from './interaction-system.js';
import {controlLabel} from './control-bindings.js';

export const WorldHUD=memo(function WorldHUD({snapshot,save,panel,onPanel,onInteract,onContextAction,onGuide,loaded,controls}){
 const country=countryById[snapshot.region],near=snapshot.near,home=frontierState(save,snapshot.region);
 const mapItems=useMemo(()=>worldRuntimeItems(snapshot.region,save),[snapshot.region,save]);
 const [arrival,setArrival]=useState(false),[actionMenu,setActionMenu]=useState(false),[hint,setHint]=useState(()=>{try{return !localStorage.getItem('3b-world-intro-seen');}catch{return true;}});
 useEffect(()=>{if(!loaded)return;setArrival(true);const timer=setTimeout(()=>setArrival(false),3800);return()=>clearTimeout(timer);},[snapshot.region,loaded]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{setHint(false);try{localStorage.setItem('3b-world-intro-seen','1');}catch{}},6500);return()=>clearTimeout(timer);},[loaded]);
 useEffect(()=>setActionMenu(false),[near?.id]);
 const actions=near?contextActions(near,{save,region:snapshot.region}):[],primary=actions[0];
 const Icon=primary?.category==='combat'?Swords:primary?.category==='social'?MessageCircle:primary?.category==='traversal'||near?.type==='portal'?DoorOpen:Sparkles;
 const name=primary?.label||near?.name,extraActions=Math.max(0,actions.length-1);
 const bearing=snapshot.waypoint?Math.atan2(snapshot.waypoint.x-snapshot.position.x,snapshot.position.z-snapshot.waypoint.z)*180/Math.PI-compassHeading(snapshot.camera?.yaw):0;
 const triggerAction=id=>{if(!near)return;if(onContextAction)onContextAction(near,id);else onInteract();setActionMenu(false);};
 return <div className={'play-hud'+(snapshot.waypoint&&snapshot.remaining>7?' has-waypoint':'')+(panel?' is-hidden':'')} aria-hidden={panel?true:undefined}>
  <div className="play-top"><button className="play-button" aria-label="Journal et objectif" title="Journal et objectif" onClick={()=>onPanel('journal')}><BookOpen size={20}/></button><span className="play-region">{country?.name||'Cité des Huit Héritages'}</span><div><button className="play-button" aria-label="Ouvrir la carte" title="Carte" onClick={()=>onPanel('atlas')}><Map size={20}/></button><button className="play-button" aria-label="Pause et options" title="Pause" onClick={()=>onPanel('pause')}><Menu size={23}/></button></div></div>
  {country&&<button className="play-supplies" aria-label={home.wood+' bois, '+home.stone+' pierre, '+home.food+' provisions. Ouvrir mon refuge'} title="Provisions et refuge" onClick={()=>onPanel('camp')}><span><Trees size={15}/>{home.wood}</span><span><Mountain size={15}/>{home.stone}</span><span><Wheat size={15}/>{home.food}</span></button>}
  <Compass heading={snapshot.heading} waypoint={snapshot.waypoint} position={snapshot.position}/>
  <div className="world-district">{snapshot.district||country?.name||'Cité des Huit Héritages'}{snapshot.time&&<small> · {snapshot.time.phase} · {String(Math.floor(snapshot.time.hour)).padStart(2,'0')}:{String(Math.floor((snapshot.time.hour%1)*60)).padStart(2,'0')}{snapshot.weather?' · '+(WEATHER_LABELS[snapshot.weather]||snapshot.weather):''}</small>}</div>
  {snapshot.region==='hub'&&snapshot.hubEvolution&&<div className="hub-evolution-chip" aria-label={'Évolution de la Cité : '+snapshot.hubEvolution.label+', '+snapshot.hubEvolution.restored+' héritages restaurés sur '+snapshot.hubEvolution.total}><small>CITÉ · ÉVOLUTION {snapshot.hubEvolution.stage}/4</small><strong>{snapshot.hubEvolution.label}</strong><span>{snapshot.hubEvolution.restored}/{snapshot.hubEvolution.total} héritages restaurés</span></div>}
  <MiniMap region={snapshot.region} items={mapItems} position={snapshot.position} heading={snapshot.heading} camera={snapshot.camera} waypoint={snapshot.waypoint} onOpen={()=>onPanel('atlas')}/>
  {arrival&&loaded&&<div className="play-arrival" key={snapshot.region}><span>LES HUIT PORTES</span><h1>{country?.title||'Cité des Huit Héritages'}</h1><i/>{country&&<p className="arrival-landmark">{HERITAGE[country.id]?.name}</p>}</div>}
  <button className="play-profile" aria-label={(save.adventure.avatar.name||'Voyageur')+', niveau '+levelFor(save.xp)+'. Ouvrir l’équipe'} title="Équipe et progression" onClick={()=>onPanel('team')}><span>{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</span><small>{levelFor(save.xp)}</small></button>
  <button className="play-button play-arena" aria-label="Arène en ligne" title="Arène en ligne" onClick={()=>onPanel('arena')}><Swords size={21}/></button>
  {snapshot.companion&&<button className="play-companion" aria-label={cardById[snapshot.companion]?.name+' · ouvrir les compagnons'} onClick={()=>onPanel('collection')}><CompanionPortrait id={snapshot.companion}/><span><small>À tes côtés</small><strong>{cardById[snapshot.companion]?.name}</strong></span></button>}
  {snapshot.waypoint&&snapshot.remaining>7&&<button className="play-bearing" aria-label={'Repère : '+snapshot.waypoint.name+', '+snapshot.remaining+' mètres. Rejoindre automatiquement.'} title="Rejoindre le repère" onClick={onGuide}><ArrowUp size={18} style={{transform:`rotate(${bearing}deg)`}}/><small>{snapshot.remaining} m</small></button>}
  {near&&<div className="play-interaction-cluster" key={near.id}><button className="play-interaction" onClick={()=>triggerAction(primary?.id)} aria-label={name||'Interagir'} title={name||'Interagir'}><Icon size={20}/><span>{name}</span><kbd>{controlLabel(controls,'interact')}</kbd></button>{extraActions>0&&<button className="play-interaction-more" aria-expanded={actionMenu} aria-label={extraActions+' autres actions'} onClick={()=>setActionMenu(value=>!value)}>•••</button>}{actionMenu&&extraActions>0&&<div className="play-context-actions" role="menu" aria-label={'Actions pour '+(near.name||'cet élément')}>{actions.slice(1).map(action=><button role="menuitem" key={action.id} onClick={()=>triggerAction(action.id)}><span>{action.label}</span><small>{action.caption}</small></button>)}</div>}</div>}
  {hint&&!near&&!snapshot.moving&&!arrival&&<div className="play-first-hint">Glisse à gauche pour avancer · à droite pour regarder</div>}
 </div>;
});

export const WorldMap=DetailedMap;
