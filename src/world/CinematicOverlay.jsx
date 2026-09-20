import React,{useEffect,useMemo,useRef,useState} from 'react';
import {cinematicCssVars} from './cinematic-director.js';
import './cinematic-director.css';

const clamp=v=>Math.max(0,Math.min(1,v));
export function CinematicOverlay({presentation,onDone,onSkip}){
 const [elapsed,setElapsed]=useState(0);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const finished=useRef(false),root=useRef(null),duration=presentation?.duration||5000;
 const progress=clamp(elapsed/duration);
 const phase=progress<.16?'ignite':progress<.72?'reveal':'handoff';
 const particles=useMemo(()=>Array.from({length:24},(_,i)=>i),[presentation?.key]);
 useEffect(()=>{setElapsed(0);finished.current=false;},[presentation?.key]);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);
  media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  if(!presentation||reduced||finished.current)return;
  let raf,last=performance.now(),bucket=0;
  const tick=now=>{const delta=Math.min(100,Math.max(0,now-last));last=now;if(!document.hidden)bucket+=delta;if(bucket>=50){const d=bucket;bucket=0;setElapsed(v=>v+d);}if(!finished.current)raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[presentation?.key,reduced]);
 useEffect(()=>{if(progress>=1&&!finished.current){finished.current=true;onDone?.();}},[progress,onDone]);
 useEffect(()=>{root.current?.querySelector('button')?.focus({preventScroll:true});},[presentation?.key]);
 if(!presentation)return null;
 const complete=skip=>{if(finished.current)return;finished.current=true;(skip?onSkip:onDone)?.();};
 return <section ref={root} className={`world-cinematic-director tier-${presentation.tier} recipe-${presentation.recipe} phase-${phase}`} style={cinematicCssVars(presentation)} role="dialog" aria-modal="true" aria-label={presentation.title} onKeyDownCapture={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();complete(true);}}}>
  <div className="cinema-world-backdrop" aria-hidden="true">
   <div className="cinema-world-haze"/><div className="cinema-world-rain"/><div className="cinema-world-scan"/>
   <div className="cinema-world-orb"/><div className="cinema-world-gold"/>
   <div className="cinema-world-particles">{particles.map(i=><i key={i} style={{'--p':i,'--x':((i*37)%101)+'%','--delay':(-i*.19)+'s'}}/>)}</div>
  </div>
  {presentation.letterbox&&<><div className="cinema-letterbox cinema-letterbox-top"/><div className="cinema-letterbox cinema-letterbox-bottom"/></>}
  <div className="cinema-world-frame" aria-live="polite" aria-atomic="true">
   <div className="cinema-world-meta"><span>3B INTERNATIONAL</span><b>{presentation.countryName} · {presentation.value}</b></div>
   <div className="cinema-world-copy">
    <span className="cinema-world-kicker">{presentation.kicker}</span>
    <h2>{presentation.title}</h2>
    <p>{presentation.detail}</p>
   </div>
   <div className="cinema-world-signature"><span>Ce n’est pas une marque.</span><strong>C’est un héritage.</strong></div>
  </div>
  <div className="cinema-world-progress" aria-hidden="true"><i style={{transform:`scaleX(${progress})`}}/></div>
  <div className="cinema-world-actions">
   <button type="button" onClick={()=>complete(true)}>Passer</button>
   {reduced&&<button type="button" className="cinema-world-primary" onClick={()=>complete(false)}>{presentation.nextLabel||'Continuer'}</button>}
  </div>
 </section>;
}
