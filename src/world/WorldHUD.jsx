import React,{memo,useEffect,useState,useMemo} from 'react';
import {Menu,BookOpen,Map,ArrowUp,MessageCircle,DoorOpen,Sparkles,Swords,Trees,Mountain,Wheat} from 'lucide-react';
import {CompanionPortrait} from './Companions.jsx';
import {countryById,cardById} from './catalog.js';
import {chapterObjective} from './chapters.js';
import {Compass,MiniMap,DetailedMap} from './Cartography.jsx';
import {HERITAGE} from './heritage.js';
import {landscapeItems} from './terrain.js';
import {frontierState} from './frontier.js';
import {levelFor} from './rules.js';
import {compassHeading} from './settlements.js';
import './objective-hud.css';

const rotateGateStyle={position:'fixed',inset:0,zIndex:1200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:28,textAlign:'center',background:'radial-gradient(circle at 50% 38%,#17384a 0,#081722 58%,#040b11 100%)',color:'#f4f0e5'};
const rotatePhoneStyle={width:92,height:54,border:'2px solid #e5c990',borderRadius:14,boxShadow:'0 0 35px #e5c99030',transform:'rotate(0deg)',display:'grid',placeItems:'center',fontSize:11,letterSpacing:2,color:'#e5c990'};

export const WorldHUD=memo(function WorldHUD({snapshot,save,panel,onPanel,onInteract,onGuide,loaded}){
 const country=countryById[snapshot.region],near=snapshot.near,home=frontierState(save,snapshot.region);
 const mapItems=useMemo(()=>landscapeItems(snapshot.region,save),[snapshot.region,save]);
 const objective=useMemo(()=>chapterObjective(save,snapshot.region),[save,snapshot.region]);
 const [arrival,setArrival]=useState(false),[hint,setHint]=useState(()=>{try{return !localStorage.getItem('3b-world-intro-seen');}catch{return true;}});
 const [portraitTouch,setPortraitTouch]=useState(false),[immersiveError,setImmersiveError]=useState('');
 useEffect(()=>{if(!loaded)return;setArrival(true);const timer=setTimeout(()=>setArrival(false),3800);return()=>clearTimeout(timer);},[snapshot.region,loaded]);
 useEffect(()=>{if(!loaded)return;const timer=setTimeout(()=>{setHint(false);try{localStorage.setItem('3b-world-intro-seen','1');}catch{}},6500);return()=>clearTimeout(timer);},[loaded]);
 useEffect(()=>{
  if(typeof window==='undefined'||!window.matchMedia)return;
  const orientation=window.matchMedia('(orientation: portrait)'),touch=window.matchMedia('(pointer: coarse)');
  const update=()=>setPortraitTouch(orientation.matches&&touch.matches&&window.innerHeight>window.innerWidth);
  update();orientation.addEventListener?.('change',update);touch.addEventListener?.('change',update);window.addEventListener('resize',update);
  return()=>{orientation.removeEventListener?.('change',update);touch.removeEventListener?.('change',update);window.removeEventListener('resize',update);};
 },[]);
 useEffect(()=>()=>{
  try{screen.orientation?.unlock?.();}catch{}
  try{const full=document.fullscreenElement;if(full?.classList?.contains('world-shell'))document.exitFullscreen?.().catch?.(()=>{});}catch{}
 },[]);
 async function enterLandscape(){
  setImmersiveError('');
  const shell=document.querySelector('.world-shell');
  try{if(!document.fullscreenElement&&shell?.requestFullscreen)await shell.requestFullscreen({navigationUI:'hide'});}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}
  catch{setImmersiveError('Le téléphone ne permet pas de verrouiller l’orientation ici. Tourne-le simplement à l’horizontale.');}
 }
 const Icon=near?.type==='portal'?DoorOpen:['story','echo','kais'].includes(near?.type)?MessageCircle:['guardian','patrol','training'].includes(near?.type)?Swords:['passport','archives'].includes(near?.type)?BookOpen:near?.type==='transit'?Map:Sparkles;
 const name=near?.type==='story'?near.name.split(' · ')[0]:near?.id==='hub'?'Nexus':near?.type==='beacon'?(near.done?'Souvenir retrouvé':'Recueillir'):near?.type==='guardian'?'Défier le gardien':near?.name;
 const bearing=snapshot.waypoint?Math.atan2(snapshot.waypoint.x-snapshot.position.x,snapshot.position.z-snapshot.waypoint.z)*180/Math.PI-compassHeading(snapshot.camera?.yaw):0;
 return <>
  {portraitTouch&&<div style={rotateGateStyle} role="dialog" aria-modal="true" aria-label="Passer le Monde du 3B en paysage">
   <div style={rotatePhoneStyle}>3B WORLD</div>
   <span style={{fontSize:10,letterSpacing:3,color:'#e5c990'}}>MODE JEU</span>
   <h2 style={{font:'400 28px/1.15 Georgia,serif',margin:'2px 0 0'}}>Tourne ton téléphone</h2>
   <p style={{maxWidth:360,margin:0,color:'#b6c5c7',fontSize:13,lineHeight:1.6}}>Le Monde du 3B est conçu en paysage : joystick à gauche, caméra à droite et davantage de ville visible autour de ton personnage.</p>
   <button onClick={enterLandscape} style={{minHeight:48,padding:'11px 20px',borderRadius:12,border:'1px solid #f4deb0',background:'linear-gradient(120deg,#f3deb0,#c4a46b)',color:'#15232c',fontWeight:800}}>Passer en plein écran paysage</button>
   {immersiveError&&<small style={{maxWidth:360,color:'#d2c5a8'}}>{immersiveError}</small>}
  </div>}
  <div className={'play-hud'+(snapshot.waypoint&&snapshot.remaining>7?' has-waypoint':'')+(panel?' is-hidden':'')} aria-hidden={panel?true:undefined}>
   <div className="play-top"><button className="play-button" aria-label="Journal et objectif" title="Journal et objectif" onClick={()=>onPanel('journal')}><BookOpen size={20}/></button><span className="play-region">{country?.name||'Nexus · Cité Origine'}</span><div><button className="play-button" aria-label="Ouvrir la carte" title="Carte" onClick={()=>onPanel('atlas')}><Map size={20}/></button><button className="play-button" aria-label="Pause et options" title="Pause" onClick={()=>onPanel('pause')}><Menu size={23}/></button></div></div>
   {country&&<button className="play-supplies" aria-label={home.wood+' bois, '+home.stone+' pierre, '+home.food+' provisions. Ouvrir mon refuge'} title="Provisions et refuge" onClick={()=>onPanel('camp')}><span><Trees size={15}/>{home.wood}</span><span><Mountain size={15}/>{home.stone}</span><span><Wheat size={15}/>{home.food}</span></button>}
   <Compass heading={snapshot.heading} waypoint={snapshot.waypoint} position={snapshot.position}/>
   <div className="world-district">{snapshot.district||country?.name||'Nexus · Cité Origine'}</div>
   {loaded&&!arrival&&objective&&<button className="play-objective-chip" onClick={()=>onPanel('journal')} aria-label={'Objectif : '+objective.title+'. Récompense : '+objective.reward}><small>OBJECTIF</small><strong>{objective.title}</strong><span>{objective.reward}</span></button>}
   <MiniMap region={snapshot.region} items={mapItems} position={snapshot.position} heading={snapshot.heading} camera={snapshot.camera} waypoint={snapshot.waypoint} onOpen={()=>onPanel('atlas')}/>
   {arrival&&loaded&&<div className="play-arrival" key={snapshot.region}><span>LES HUIT PORTES</span><h1>{country?.title||'Nexus · Cité Origine'}</h1><i/>{country&&<p className="arrival-landmark">{HERITAGE[country.id]?.name}</p>}</div>}
   <button className="play-profile" aria-label={(save.adventure.avatar.name||'Voyageur')+', niveau '+levelFor(save.xp)+'. Ouvrir l’équipe'} title="Équipe et progression" onClick={()=>onPanel('team')}><span>{(save.adventure.avatar.name||'V').slice(0,1).toUpperCase()}</span><small>{levelFor(save.xp)}</small></button>
   <button className="play-button play-arena" aria-label="Arène en ligne" title="Arène en ligne" onClick={()=>onPanel('arena')}><Swords size={21}/></button>
   {snapshot.companion&&<button className="play-companion" aria-label={cardById[snapshot.companion]?.name+' · ouvrir les compagnons'} onClick={()=>onPanel('collection')}><CompanionPortrait id={snapshot.companion}/><span><small>À tes côtés</small><strong>{cardById[snapshot.companion]?.name}</strong></span></button>}
   {snapshot.waypoint&&snapshot.remaining>7&&<button className="play-bearing" aria-label={'Repère : '+snapshot.waypoint.name+', '+snapshot.remaining+' mètres. Rejoindre automatiquement.'} title="Rejoindre le repère" onClick={onGuide}><ArrowUp size={18} style={{transform:`rotate(${bearing}deg)`}}/><small>{snapshot.remaining} m</small></button>}
   {near&&<button key={near.id} className="play-interaction" onClick={onInteract}><Icon size={20}/><span>{name}</span><kbd>E</kbd></button>}
   {hint&&!near&&!snapshot.moving&&!arrival&&<div className="play-first-hint">Pouce gauche : avancer · pouce droit : caméra</div>}
  </div>
 </>;
});

export const WorldMap=DetailedMap;
