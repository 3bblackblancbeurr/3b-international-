import React,{memo,useEffect,useState} from 'react';
import {Menu,BookOpen,Map,ArrowUp,MessageCircle,DoorOpen,Sparkles,Swords} from 'lucide-react';
import {countryById} from './catalog.js';
import {levelFor} from './rules.js';

export const WorldHUD=memo(function WorldHUD({snapshot,save,panel,onPanel,onInteract,onGuide,loaded}){
 const country=countryById[snapshot.region],near=snapshot.near;
 const [arrival,setArrival]=useState(false),[hint,setHint]=useState(()=>{try{return !localStorage.getItem('3b-world-intro-seen');}catch{return true;}});
 useEffect(()=>{if(!loaded)return;setArrival(true);const timer=setTimeout(()=>setArrival(false),3800);return()=>clearTimeout(timer);},[snapshot.region,loaded]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{setHint(false);try{localStorage.setItem('3b-world-intro-seen','1');}catch{}},6500);return()=>clearTimeout(timer);},[loaded]);
 const Icon=near?.type==='portal'?DoorOpen:near?.type==='story'||near?.type==='echo'?MessageCircle:near?.type==='guardian'?Swords:Sparkles;
 const name=near?.type==='story'?near.name.split(' · ')[0]:near?.id==='hub'?'Nexus':near?.type==='beacon'?(near.done?'Souvenir retrouvé':'Recueillir'):near?.type==='guardian'?'Défier le gardien':near?.name;
 const bearing=snapshot.waypoint?Math.atan2(snapshot.waypoint.x-snapshot.position.x,snapshot.position.z-snapshot.waypoint.z)*180/Math.PI:0;
 return <div className={'play-hud'+(snapshot.waypoint&&snapshot.remaining>7?' has-waypoint':'')+(panel?' is-hidden':'')} aria-hidden={panel?true:undefined}>
  <div className="play-top"><button className="play-button" aria-label="Journal et objectif" title="Journal et objectif" onClick={()=>onPanel('journal')}><BookOpen size={20}/></button><span className="play-region">{country?.name||'Le Nexus'}</span><div><button className="play-button" aria-label="Ouvrir la carte" title="Carte" onClick={()=>onPanel('atlas')}><Map size={20}/></button><button className="play-button" aria-label="Pause et options" title="Pause" onClick={()=>onPanel('pause')}><Menu size={23}/></button></div></div>
  {arrival&&loaded&&<div className="play-arrival" key={snapshot.region}><span>LES HUIT PORTES</span><h1>{country?.title||'Le Val des huit portes'}</h1><i/></div>}
  <button className="play-profile" aria-label={(save.adventure.avatar.name||'Voyageur')+', niveau '+levelFor(save.xp)+'. Ouvrir l’équipe'} title="Équipe et progression" onClick={()=>onPanel('team')}><span>{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</span><small>{levelFor(save.xp)}</small></button>
  <button className="play-button play-arena" aria-label="Arène en ligne" title="Arène en ligne" onClick={()=>onPanel('arena')}><Swords size={21}/></button>
  {snapshot.waypoint&&snapshot.remaining>7&&<button className="play-bearing" aria-label={'Repère : '+snapshot.waypoint.name+', '+snapshot.remaining+' mètres. Rejoindre automatiquement.'} title="Rejoindre le repère" onClick={onGuide}><ArrowUp size={18} style={{transform:`rotate(${bearing}deg)`}}/><small>{snapshot.remaining} m</small></button>}
  {near&&<button key={near.id} className="play-interaction" onClick={onInteract}><Icon size={20}/><span>{name}</span><kbd>E</kbd></button>}
  {hint&&!near&&!snapshot.moving&&!arrival&&<div className="play-first-hint">Glisse à gauche pour avancer · à droite pour regarder</div>}
 </div>;
});

export function WorldMap({items,position,onSelect}){
 return <div className="play-map"><svg viewBox="-143 -143 286 286" role="group" aria-label="Carte des lieux et position de ton personnage"><defs><radialGradient id="map-ground"><stop stopColor="#45665d"/><stop offset="1" stopColor="#152f34"/></radialGradient></defs><rect x="-143" y="-143" width="286" height="286" fill="url(#map-ground)"/>{[30,55,80,108,130].map((r,i)=><ellipse key={r} cx={Math.sin(i)*13} cy={Math.cos(i)*11} rx={r} ry={r*.86} fill="none" stroke="#d1dac613" strokeWidth=".7" transform={'rotate('+i*31+')'}/>)}{items.map(item=><g key={item.id} role="button" tabIndex={0} aria-label={'Placer un repère : '+item.name} onClick={()=>onSelect(item)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(item);}}}><circle cx={item.x} cy={item.z} r="8" fill="#082125" stroke={item.done?'#6e8b7e':item.color} strokeWidth="1"/><text x={item.x} y={item.z+2.5} textAnchor="middle" fill="#f2e5c8" fontSize="7">{item.type==='portal'?'◇':item.type==='story'?'✧':item.type==='guardian'?'♜':'·'}</text><title>{item.name}</title></g>)}<circle cx={position.x} cy={position.z} r="3" fill="#fff4cf"/><circle cx={position.x} cy={position.z} r="5" fill="none" stroke="#fff4cf" strokeWidth=".5"/><text x="0" y="-132" fill="#e0d7b7" fontSize="6" textAnchor="middle">N</text></svg><p>Choisis un lieu pour poser un repère. Explore librement.</p></div>;
}
