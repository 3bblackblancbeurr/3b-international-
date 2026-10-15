import React,{useEffect,useMemo,useRef,useState} from 'react';
import {cinematicCssVars} from './cinematic-director.js';
import './cinematic-director.css';
import {createCinematicClock} from './cinematic-clock.js';
import narrationManifest from './narration-manifest.json';

const clamp=v=>Math.max(0,Math.min(1,v));
export function CinematicOverlay({presentation,onDone,onSkip,audioDirector,sceneDirector}){
 const [elapsed,setElapsed]=useState(0),[userPaused,setUserPaused]=useState(false),[loading,setLoading]=useState(false),[recorded,setRecorded]=useState(false),[replay,setReplay]=useState(0);
 const clock=useRef(null),done=useRef(onDone);done.current=onDone;
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const finished=useRef(false),root=useRef(null),duration=presentation?.duration||5000;
 const progress=clamp(elapsed/duration);
 const phase=progress<.16?'ignite':progress<.72?'reveal':'handoff';
 const particles=useMemo(()=>Array.from({length:24},(_,i)=>i),[presentation?.key]);

 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);
  media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  if(!presentation)return;
  let raf,live=true,spoken=false,hasRecording=false;
  const timeline=createCinematicClock(duration);clock.current=timeline;
  finished.current=false;setElapsed(0);setUserPaused(false);setRecorded(false);
  timeline.hold('loading',!!presentation.narration);timeline.hold('hidden',document.hidden);
  setLoading(!!presentation.narration);
  audioDirector?.stopSpeech?.();audioDirector?.state?.(presentation.audioState);
  sceneDirector?.playCinematicShot?.(presentation.kind,presentation.context,duration,{controlled:true});
  const visibility=()=>{
   timeline.hold('hidden',document.hidden);
   audioDirector?.pauseSpeech?.(timeline.paused);
   if(hasRecording)audioDirector?.syncNarration?.(timeline.elapsed(),timeline.paused);
   sceneDirector?.setCinematicFrame?.(timeline.elapsed(),timeline.paused);
  };
  document.addEventListener('visibilitychange',visibility);
  if(presentation.narration)Promise.resolve(audioDirector?.prepareNarration?.(presentation.narration)).then(ready=>{
   if(!live)return;
   hasRecording=!!ready;setRecorded(hasRecording);setLoading(false);timeline.hold('loading',false);
  },()=>{if(live){setLoading(false);timeline.hold('loading',false);}});
  const tick=()=>{
   if(!live||finished.current)return;
   const value=timeline.elapsed();setElapsed(value);
   sceneDirector?.setCinematicFrame?.(value,timeline.paused);
   if(!timeline.paused&&!spoken){
    spoken=true;audioDirector?.cinematic?.(presentation.kind);
    // Recorded clips fail silently to the complete transcript, never to a late second voice.
    if(!presentation.narration)audioDirector?.speak?.(presentation.kind==='world-opening'?'Huit héritages. Un lien à retrouver. Bienvenue dans le Monde du trois B.':presentation.title+'. '+presentation.detail,{character:presentation.voiceCharacter});
   }
   if(hasRecording)audioDirector?.syncNarration?.(value,timeline.paused);
   if(value>=duration){finished.current=true;timeline.stop();audioDirector?.stopSpeech?.();done.current?.();return;}
   raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
  root.current?.querySelector('button')?.focus({preventScroll:true});
  return()=>{live=false;timeline.stop();cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);audioDirector?.stopSpeech?.();sceneDirector?.skipCinematic?.();if(clock.current===timeline)clock.current=null;};
 },[presentation,audioDirector,sceneDirector,replay,duration]);
 const togglePause=()=>{
  const value=!userPaused;setUserPaused(value);clock.current?.hold('user',value);
  const paused=clock.current?.paused??value;
  audioDirector?.pauseSpeech?.(paused);
  if(recorded)audioDirector?.syncNarration?.(clock.current?.elapsed()||0,paused);
  sceneDirector?.setCinematicFrame?.(clock.current?.elapsed()||0,paused);
 };
 if(!presentation)return null;
 const complete=skip=>{if(finished.current)return;finished.current=true;clock.current?.stop();audioDirector?.stopSpeech?.();(skip?onSkip:onDone)?.();};
 return <section key={replay} ref={root} data-paused={userPaused||loading} className={`world-cinematic-director tier-${presentation.tier} recipe-${presentation.recipe} phase-${phase}`} style={cinematicCssVars(presentation)} role="dialog" aria-modal="true" aria-label={presentation.title} onKeyDownCapture={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();complete(true);}if(event.key==='Tab'){const items=[...root.current.querySelectorAll('button,a[href]')].filter(item=>!item.disabled),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}}>
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
    {presentation.guardianTeaser&&<div className="cinema-world-guardian-identity" aria-label="Identité du Gardien">
     <span><small>Arme</small><strong>{presentation.guardianTeaser.weapon}</strong></span>
     <span><small>Résonance</small><strong>{presentation.guardianTeaser.resonance}</strong></span>
     <span><small>Totem</small><strong>{presentation.guardianTeaser.totem}</strong></span>
    </div>}
   </div>
   <div className="cinema-world-signature"><span>Ce n’est pas une marque.</span><strong>C’est un héritage.</strong></div>
  </div>
  <div className="cinema-world-progress" aria-hidden="true"><i style={{transform:`scaleX(${progress})`}}/></div>
  <div className="cinema-world-actions">
   <span className="cinema-playback-status" role="status">{loading?'Préparation de la narration…':userPaused?'En pause':recorded?'Narration française':'Récit à l’écran'}</span>
   <button type="button" onClick={togglePause} aria-pressed={userPaused}>{userPaused?'Reprendre':'Pause'}</button>
   <button type="button" onClick={()=>setReplay(value=>value+1)}>Rejouer</button>
   <button type="button" onClick={()=>complete(true)}>Passer</button>
   {recorded&&<a className="cinema-voice-credit" href={narrationManifest.attributionUrl} target="_blank" rel="noopener noreferrer">{narrationManifest.attribution}</a>}
  </div>
 </section>;
}
