import React,{memo,useEffect,useState,useMemo} from 'react';
import {Menu,BookOpen,Map,ArrowUp,MessageCircle,DoorOpen,Sparkles,Swords} from 'lucide-react';
import {CompanionPortrait} from './Companions.jsx';
import {countryById,cardById} from './catalog.js';
import {Compass,MiniMap,DetailedMap} from './Cartography.jsx';
import {landscapeItems} from './terrain.js';
import {levelFor} from './rules.js';
import {compassHeading} from './settlements.js';

export const WorldHUD=memo(function WorldHUD({snapshot,save,panel,onPanel,onInteract,onGuide,loaded}){
 const country=countryById[snapshot.region],near=snapshot.near;
 const mapItems=useMemo(()=>landscapeItems(snapshot.region,save),[snapshot.region,save]);
 const [arrival,setArrival]=useState(false),[hint,setHint]=useState(()=>{try{return !localStorage.getItem('3b-world-intro-seen');}catch{return true;}});
 useEffect(()=>{if(!loaded)return;setArrival(true);const timer=setTimeout(()=>setArrival(false),3800);return()=>clearTimeout(timer);},[snapshot.region,loaded]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{setHint(false);try{localStorage.setItem('3b-world-intro-seen','1');}catch{}},6500);return()=>clearTimeout(timer);},[loaded]);
 const Icon=near?.type==='portal'?DoorOpen:near?.type==='story'||near?.type==='echo'?MessageCircle:near?.type==='guardian'?Swords:Sparkles;
 const name=near?.type==='story'?near.name.split(' · ')[0]:near?.id==='hub'?'Nexus':near?.type==='beacon'?(near.done?'Souvenir retrouvé':'Recueillir'):near?.type==='guardian'?'Défier le gardien':near?.name;
 const bearing=snapshot.waypoint?Math.atan2(snapshot.waypoint.x-snapshot.position.x,snapshot.position.z-snapshot.waypoint.z)*180/Math.PI-compassHeading(snapshot.camera?.yaw):0;
 return <div className={'play-hud'+(snapshot.waypoint&&snapshot.remaining>7?' has-waypoint':'')+(panel?' is-hidden':'')} aria-hidden={panel?true:undefined}>
  <div className="play-top"><button className="play-button" aria-label="Journal et objectif" title="Journal et objectif" onClick={()=>onPanel('journal')}><BookOpen size={20}/></button><span className="play-region">{country?.name||'Le Nexus'}</span><div><button className="play-button" aria-label="Ouvrir la carte" title="Carte" onClick={()=>onPanel('atlas')}><Map size={20}/></button><button className="play-button" aria-label="Pause et options" title="Pause" onClick={()=>onPanel('pause')}><Menu size={23}/></button></div></div>
  <Compass yaw={snapshot.camera?.yaw} waypoint={snapshot.waypoint} position={snapshot.position}/>
  <div className="world-district">{snapshot.district||country?.name||'Le Nexus'}</div>
  <MiniMap region={snapshot.region} items={mapItems} position={snapshot.position} camera={snapshot.camera} waypoint={snapshot.waypoint} onOpen={()=>onPanel('atlas')}/>
  {arrival&&loaded&&<div className="play-arrival" key={snapshot.region}><span>LES HUIT PORTES</span><h1>{country?.title||'Le Val des huit portes'}</h1><i/></div>}
  <button className="play-profile" aria-label={(save.adventure.avatar.name||'Voyageur')+', niveau '+levelFor(save.xp)+'. Ouvrir l’équipe'} title="Équipe et progression" onClick={()=>onPanel('team')}><span>{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</span><small>{levelFor(save.xp)}</small></button>
  <button className="play-button play-arena" aria-label="Arène en ligne" title="Arène en ligne" onClick={()=>onPanel('arena')}><Swords size={21}/></button>
  {snapshot.companion&&<button className="play-companion" aria-label={cardById[snapshot.companion]?.name+' · ouvrir les compagnons'} onClick={()=>onPanel('collection')}><CompanionPortrait id={snapshot.companion}/><span><small>À tes côtés</small><strong>{cardById[snapshot.companion]?.name}</strong></span></button>}
  {snapshot.waypoint&&snapshot.remaining>7&&<button className="play-bearing" aria-label={'Repère : '+snapshot.waypoint.name+', '+snapshot.remaining+' mètres. Rejoindre automatiquement.'} title="Rejoindre le repère" onClick={onGuide}><ArrowUp size={18} style={{transform:`rotate(${bearing}deg)`}}/><small>{snapshot.remaining} m</small></button>}
  {near&&<button key={near.id} className="play-interaction" onClick={onInteract}><Icon size={20}/><span>{name}</span><kbd>E</kbd></button>}
  {hint&&!near&&!snapshot.moving&&!arrival&&<div className="play-first-hint">Glisse à gauche pour avancer · à droite pour regarder</div>}
 </div>;
});

export const WorldMap=DetailedMap;
