import {useEffect,useMemo,useRef,useState} from 'react';
import {Maximize2,Minimize2,Play,ShieldCheck,Trophy} from 'lucide-react';
import {WORLD_FINALS,WORLD_FINAL_SPORTS,safeWorldFinalVideoId} from '../../shared/sport-finals.js';
import './sport-finals-local.css';

const MEDIA_CONSENT_KEY='3b-sport-media-consent-v1';

function readConsent(){
 if(typeof window==='undefined')return false;
 try{return window.localStorage.getItem(MEDIA_CONSENT_KEY)==='accepted';}
 catch{return false;}
}

function embedUrl(videoId){
 const id=safeWorldFinalVideoId(videoId);
 if(!id)return '';
 const origin=typeof window!=='undefined'&&/^https?:\/\//i.test(window.location.origin)?window.location.origin:'';
 const originParam=origin?`&origin=${encodeURIComponent(origin)}`:'';
 return `https://www.youtube-nocookie.com/embed/${id}?controls=1&fs=0&disablekb=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=0${originParam}`;
}

export default function SportFinals(){
 const[sport,setSport]=useState('Tous');
 const[selectedId,setSelectedId]=useState(WORLD_FINALS[0].id);
 const[mediaConsent,setMediaConsent]=useState(readConsent);
 const[privacyOpen,setPrivacyOpen]=useState(false);
 const[landscape,setLandscape]=useState(false);
 const[fullscreen,setFullscreen]=useState(false);
 const[appFullscreen,setAppFullscreen]=useState(false);
 const shellRef=useRef(null);

 const filtered=useMemo(()=>WORLD_FINALS.filter(item=>sport==='Tous'||item.sport===sport),[sport]);
 const selected=filtered.find(item=>item.id===selectedId)||filtered[0]||WORLD_FINALS[0];
 const src=mediaConsent?embedUrl(selected.videoId):'';
 const expanded=fullscreen||appFullscreen;

 useEffect(()=>{
  const sync=()=>{
   const active=mediaConsent&&window.innerWidth<=1000&&window.innerWidth>window.innerHeight;
   setLandscape(active);
   document.documentElement.classList.toggle('sport-finals-landscape-open',active);
  };
  sync();
  window.addEventListener('resize',sync);
  window.screen?.orientation?.addEventListener?.('change',sync);
  return()=>{
   window.removeEventListener('resize',sync);
   window.screen?.orientation?.removeEventListener?.('change',sync);
   document.documentElement.classList.remove('sport-finals-landscape-open');
   try{window.screen?.orientation?.unlock?.();}catch{/* Orientation locking is optional. */}
  };
 },[mediaConsent]);

 useEffect(()=>{
  const sync=()=>setFullscreen(document.fullscreenElement===shellRef.current);
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);

 useEffect(()=>{
  document.documentElement.classList.toggle('sport-finals-app-fullscreen-open',appFullscreen);
  return()=>document.documentElement.classList.remove('sport-finals-app-fullscreen-open');
 },[appFullscreen]);

 useEffect(()=>()=>{
  document.documentElement.classList.remove('sport-finals-landscape-open','sport-finals-app-fullscreen-open');
  try{window.screen?.orientation?.unlock?.();}catch{/* Orientation locking is optional. */}
  if(document.fullscreenElement===shellRef.current){
   try{document.exitFullscreen?.().catch?.(()=>{});}catch{/* Fullscreen may already be closed. */}
  }
 },[]);

 function activate(){
  try{window.localStorage.setItem(MEDIA_CONSENT_KEY,'accepted');}catch{/* Storage can be unavailable in private mode. */}
  setMediaConsent(true);
 }

 async function revoke(){
  try{window.localStorage.removeItem(MEDIA_CONSENT_KEY);}catch{/* Storage can be unavailable in private mode. */}
  if(document.fullscreenElement===shellRef.current){
   try{await document.exitFullscreen();}catch{/* Fullscreen may already be closed. */}
  }
  setAppFullscreen(false);
  setLandscape(false);
  document.documentElement.classList.remove('sport-finals-landscape-open','sport-finals-app-fullscreen-open');
  try{window.screen?.orientation?.unlock?.();}catch{/* Orientation locking is optional. */}
  setMediaConsent(false);
 }

 async function toggleFullscreen(){
  if(expanded){
   if(document.fullscreenElement===shellRef.current){
    try{await document.exitFullscreen();}catch{/* Fullscreen may already be closed. */}
   }
   setAppFullscreen(false);
   document.documentElement.classList.remove('sport-finals-app-fullscreen-open');
   try{window.screen?.orientation?.unlock?.();}catch{/* Orientation locking is optional. */}
   return;
  }

  const request=shellRef.current?.requestFullscreen;
  if(typeof request==='function'){
   try{
    await request.call(shellRef.current);
    try{await window.screen?.orientation?.lock?.('landscape');}catch{/* Orientation locking is optional. */}
    return;
   }catch{/* The app-local fallback below works when native fullscreen is denied. */}
  }

  setAppFullscreen(true);
  document.documentElement.classList.add('sport-finals-app-fullscreen-open');
 }

 function selectFinal(id){
  setSelectedId(id);
  window.setTimeout(()=>shellRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'}),0);
 }

 const shellClass=['sport-finals-player-shell',landscape?'is-landscape':'',fullscreen?'is-fullscreen':'',appFullscreen?'is-app-fullscreen':''].filter(Boolean).join(' ');

 return <div className="sport-finals-view">
  <header className="sport-finals-hero">
   <div><p className="eyebrow">GRANDES FINALES · À LA DEMANDE</p><h2>Les finales restent dans 3B.</h2><p>Choisis une finale officielle et regarde-la directement dans l’application. Aucun bouton ne t’envoie vers YouTube, le navigateur ou une autre application.</p></div>
   <div className="sport-finals-badge"><Trophy size={21}/><span>SÉLECTION 3B</span><strong>100 % FINALES</strong></div>
  </header>

  <div className="sport-finals-filter" role="group" aria-label="Filtrer les grandes finales par sport">
   {WORLD_FINAL_SPORTS.map(name=><button type="button" key={name} aria-pressed={sport===name} onClick={()=>setSport(name)}>{name}</button>)}
  </div>

  <section ref={shellRef} className={shellClass} aria-label="Lecteur Grandes finales 3B">
   <div className="sport-finals-player-head">
    <div><span>{selected.sport} · {selected.year}</span><strong>{selected.title}</strong><small>{selected.competition} · {selected.source}</small></div>
    <div className="sport-finals-head-actions">
     <span className="sport-finals-local-only">DANS 3B</span>
     <button type="button" onClick={toggleFullscreen} disabled={!mediaConsent} aria-label={expanded?'Quitter le grand écran':'Afficher en grand écran'}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{expanded?'Réduire':'Grand écran'}</span></button>
    </div>
   </div>

   <div className="sport-finals-frame">
    {!mediaConsent?<div className="sport-finals-consent"><ShieldCheck size={38}/><strong>Activer le lecteur intégré</strong><p>La vidéo officielle est chargée à l’intérieur de 3B. Les ouvertures de fenêtre, le mode image dans l’image et les sorties vers YouTube sont bloqués dans ce lecteur.</p><button type="button" className="sport-finals-privacy-toggle" onClick={()=>setPrivacyOpen(value=>!value)}>Confidentialité</button>{privacyOpen&&<div className="sport-finals-privacy-panel" role="note">YouTube reçoit uniquement les données techniques nécessaires à la lecture après ton activation. Tu peux désactiver le lecteur à tout moment sous la vidéo.</div>}<button type="button" onClick={activate}><Play size={17}/>Activer et regarder ici</button></div>:
     <iframe key={selected.videoId} src={src} title={`${selected.competition} · ${selected.title}`} allow="autoplay; encrypted-media" sandbox="allow-scripts allow-same-origin" loading="lazy" referrerPolicy="no-referrer"/>}
   </div>

   <div className="sport-finals-player-foot">
    <span><Trophy size={15}/>{selected.format}</span>
    <span>Vidéo officielle publiée par {selected.source}</span>
    <span className="sport-finals-stay-local">Lecture intégrée · aucune sortie de l’application</span>
    {mediaConsent&&<button type="button" onClick={revoke}>Désactiver le lecteur</button>}
   </div>
  </section>

  <div className="sport-finals-grid">
   {filtered.map(item=><button type="button" key={item.id} className={'sport-final-card '+(item.id===selected.id?'is-active':'')} aria-pressed={item.id===selected.id} onClick={()=>selectFinal(item.id)}>
    <span>{item.sport} · {item.year}</span><strong>{item.title}</strong><small>{item.competition}</small><em>{item.format} · {item.source}</em>
   </button>)}
  </div>

  <p className="muted-copy sport-finals-note">Tout reste local dans l’interface 3B. Tourne le téléphone pour remplir automatiquement l’écran ; le bouton « Grand écran » utilise le plein écran natif ou un grand écran interne de secours, sans ouvrir une autre application.</p>
 </div>;
}
