import {useMemo,useRef,useState} from 'react';
import {ExternalLink,Maximize2,Play,ShieldCheck,Trophy} from 'lucide-react';
import {WORLD_FINALS,WORLD_FINAL_SPORTS,safeWorldFinalVideoId} from '../../shared/sport-finals.js';

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
 return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1${originParam}`;
}

export default function SportFinals(){
 const[sport,setSport]=useState('Tous');
 const[selectedId,setSelectedId]=useState(WORLD_FINALS[0].id);
 const[mediaConsent,setMediaConsent]=useState(readConsent);
 const frameRef=useRef(null);
 const filtered=useMemo(()=>WORLD_FINALS.filter(item=>sport==='Tous'||item.sport===sport),[sport]);
 const selected=filtered.find(item=>item.id===selectedId)||filtered[0]||WORLD_FINALS[0];
 const src=mediaConsent?embedUrl(selected.videoId):'';

 function activate(){
  try{window.localStorage.setItem(MEDIA_CONSENT_KEY,'accepted');}catch{/* Storage can be unavailable in private mode. */}
  setMediaConsent(true);
 }
 function revoke(){
  try{window.localStorage.removeItem(MEDIA_CONSENT_KEY);}catch{/* Storage can be unavailable in private mode. */}
  setMediaConsent(false);
 }
 async function fullscreen(){
  try{
   await frameRef.current?.requestFullscreen?.();
   try{await window.screen?.orientation?.lock?.('landscape');}catch{/* Optional browser capability. */}
  }catch{/* Fullscreen can be denied by the browser. */}
 }

 return <div className="sport-finals-view">
  <header className="sport-finals-hero">
   <div><p className="eyebrow">GRANDES FINALES · À LA DEMANDE</p><h2>Les finales, séparées du H24.</h2><p>Choisis uniquement des finales officielles : Coupes du monde, championnats du monde, Coupe Davis et finales olympiques. Rien ne se lance en continu et rien ne modifie la chaîne Sport H24.</p></div>
   <div className="sport-finals-badge"><Trophy size={21}/><span>SÉLECTION 3B</span><strong>100 % FINALES</strong></div>
  </header>

  <div className="sport-finals-filter" role="group" aria-label="Filtrer les grandes finales par sport">
   {WORLD_FINAL_SPORTS.map(name=><button type="button" key={name} aria-pressed={sport===name} onClick={()=>setSport(name)}>{name}</button>)}
  </div>

  <section className="sport-finals-player-shell">
   <div className="sport-finals-player-head">
    <div><span>{selected.sport} · {selected.year}</span><strong>{selected.title}</strong><small>{selected.competition} · {selected.source}</small></div>
    <button type="button" onClick={fullscreen} disabled={!mediaConsent}><Maximize2 size={16}/>Plein écran</button>
   </div>
   <div ref={frameRef} className="sport-finals-frame">
    {!mediaConsent?<div className="sport-finals-consent"><ShieldCheck size={38}/><strong>Activer le lecteur officiel</strong><p>La vidéo YouTube n’est chargée qu’après ton accord. Ce choix est le même que dans le Direct Sport et reste révocable.</p><a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a><button type="button" onClick={activate}><Play size={17}/>Activer et regarder</button></div>:
     <iframe key={selected.videoId} src={src} title={`${selected.competition} · ${selected.title}`} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>}
   </div>
   <div className="sport-finals-player-foot">
    <span><Trophy size={15}/>{selected.format}</span>
    <span>Vidéo publiée par {selected.source}</span>
    {mediaConsent&&<button type="button" onClick={revoke}>Désactiver les lecteurs</button>}
    <a href={`https://www.youtube.com/watch?v=${selected.videoId}`} target="_blank" rel="noopener noreferrer">Ouvrir la source officielle <ExternalLink size={14}/></a>
   </div>
  </section>

  <div className="sport-finals-grid">
   {filtered.map(item=><button type="button" key={item.id} className={'sport-final-card '+(item.id===selected.id?'is-active':'')} aria-pressed={item.id===selected.id} onClick={()=>setSelectedId(item.id)}>
    <span>{item.sport} · {item.year}</span><strong>{item.title}</strong><small>{item.competition}</small><em>{item.format} · {item.source}</em>
   </button>)}
  </div>

  <p className="muted-copy sport-finals-note">La disponibilité dépend du diffuseur et du pays. Si l’intégration est refusée, le bouton « Ouvrir la source officielle » reste disponible. Aucune copie ni aucun flux piraté n’est utilisé.</p>
 </div>;
}
