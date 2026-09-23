import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ExternalLink,Maximize2,Minimize2,RefreshCw} from 'lucide-react';
import {KEY_RACE_URL} from './catalog.js';
import './key-race-original.css';

const KEY_RACE_ORIGIN=new URL(KEY_RACE_URL).origin;

export default function KeyRaceOriginal({onClose}){
 const shellRef=useRef(null);
 const readyFrameRef=useRef(0);
 const[loaded,setLoaded]=useState(false);
 const[reloadKey,setReloadKey]=useState(0);
 const[fullscreen,setFullscreen]=useState(false);

 useEffect(()=>{
  const previousOverflow=document.body.style.overflow;
  const previousOverscroll=document.body.style.overscrollBehavior;
  document.body.style.overflow='hidden';
  document.body.style.overscrollBehavior='none';
  document.body.classList.add('threeb-key-race-active');

  const links=[
   ['preconnect',KEY_RACE_ORIGIN,'anonymous'],
   ['dns-prefetch',KEY_RACE_ORIGIN,''],
  ].map(([rel,href,crossOrigin])=>{
   const link=document.createElement('link');
   link.rel=rel;
   link.href=href;
   if(crossOrigin)link.crossOrigin=crossOrigin;
   link.dataset.threebKeyRace='1';
   document.head.appendChild(link);
   return link;
  });

  const syncFullscreen=()=>setFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener('fullscreenchange',syncFullscreen);

  return()=>{
   cancelAnimationFrame(readyFrameRef.current);
   document.removeEventListener('fullscreenchange',syncFullscreen);
   links.forEach(link=>link.remove());
   document.body.classList.remove('threeb-key-race-active');
   document.body.style.overflow=previousOverflow;
   document.body.style.overscrollBehavior=previousOverscroll;
  };
 },[]);

 const markLoaded=useCallback(()=>{
  cancelAnimationFrame(readyFrameRef.current);
  readyFrameRef.current=requestAnimationFrame(()=>{
   readyFrameRef.current=requestAnimationFrame(()=>setLoaded(true));
  });
 },[]);

 const reload=useCallback(()=>{
  cancelAnimationFrame(readyFrameRef.current);
  setLoaded(false);
  setReloadKey(value=>value+1);
 },[]);

 const toggleFullscreen=useCallback(async()=>{
  try{
   if(document.fullscreenElement) await document.exitFullscreen?.();
   else await shellRef.current?.requestFullscreen?.({navigationUI:'hide'});
  }catch{
   try{await shellRef.current?.requestFullscreen?.();}catch{
    // Le jeu reste jouable même si le navigateur refuse le plein écran.
   }
  }
 },[]);

 return <section ref={shellRef} className="key-race-original-shell" aria-label="La course des 8 clés" data-ready={loaded?'true':'false'}>
  <div className="key-race-original-ambient" aria-hidden="true"/>

  <header className="key-race-original-bar">
   <button type="button" className="key-race-original-icon" onClick={onClose} aria-label="Retour aux Jeux 3B">
    <ArrowLeft size={21}/>
   </button>
   <div className="key-race-original-title">
    <span>3B INTERNATIONAL · ORIGINAL</span>
    <strong>La course des 8 clés</strong>
   </div>
   <span className="key-race-original-status" aria-hidden="true"><i/> MODE FLUIDE</span>
   <div className="key-race-original-actions">
    <button type="button" className="key-race-original-icon" onClick={reload} aria-label="Recharger le jeu">
     <RefreshCw size={19}/>
    </button>
    <button type="button" className="key-race-original-icon" onClick={toggleFullscreen} aria-label={fullscreen?'Quitter le plein écran':'Plein écran'}>
     {fullscreen?<Minimize2 size={19}/>:<Maximize2 size={19}/>}
    </button>
   </div>
  </header>

  <div className="key-race-original-stage" aria-busy={!loaded}>
   <div className="key-race-original-corners" aria-hidden="true"><i/><i/><i/><i/></div>
   {!loaded&&<div className="key-race-original-loader" role="status" aria-live="polite">
    <span className="key-race-original-loader-ring" aria-hidden="true"/>
    <strong>Ouverture de la Porte France…</strong>
    <small>Jeu original conservé · affichage 3B optimisé pour téléphone, tablette et PC.</small>
   </div>}
   <iframe
    key={reloadKey}
    className={loaded?'key-race-original-frame is-ready':'key-race-original-frame'}
    src={KEY_RACE_URL}
    title="3B — La course des 8 clés"
    loading="eager"
    allow="autoplay; fullscreen"
    allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin"
    onLoad={markLoaded}
   />
  </div>

  <div className="key-race-original-fallback">
   <span><b>JEU ORIGINAL 3B</b> · règles, score et progression conservés</span>
   <a href={KEY_RACE_URL} target="_blank" rel="noopener noreferrer">
    Fenêtre séparée <ExternalLink size={15}/>
   </a>
  </div>
 </section>;
}
