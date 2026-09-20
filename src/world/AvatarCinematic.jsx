import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArenaStage} from '../arena/ArenaStage.jsx';
import {characterSequence,frameAt} from './cinematic-script.js';
import {COUNTRIES} from './catalog.js';
import './cinematics.css';

export function AvatarCinematic({avatar,onDone,sequence:suppliedSequence}){
 const sequence=useMemo(()=>suppliedSequence||characterSequence({avatar}),[avatar,suppliedSequence]);
 const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const done=useRef(false),callback=useRef(onDone),root=useRef(null);callback.current=onDone;
 const frame=frameAt(sequence,elapsed);
 const finish=()=>{if(!done.current){done.current=true;callback.current?.();}};
 useEffect(()=>{root.current?.closest('dialog')?.scrollTo({top:0});},[]);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(paused||reduced||done.current)return;
  let raf,last=performance.now(),pending=0;
  const tick=now=>{const delta=Math.min(100,Math.max(0,now-last));last=now;if(!document.hidden)pending+=delta;if(pending>=50){const d=pending;pending=0;setElapsed(v=>v+d);}if(!done.current)raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[paused,reduced]);
 useEffect(()=>{if(frame?.done)finish();},[frame?.done]);
 const next=()=>{if(frame.index===frame.count-1){finish();return;}setElapsed(sequence.shots.slice(0,frame.index+1).reduce((sum,shot)=>sum+shot.duration,0));};
 if(!frame)return null;
 const isBlack=frame.id==='blackout',showCountries=frame.id==='eight-worlds',signature=frame.id==='signature';
 return <section ref={root} className={`avatar-cinematic cinema-shot-${frame.id} cinema-effect-${frame.effect||'none'}`} aria-label={sequence.title} onKeyDownCapture={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}}}>
  <div className="cinema-viewport"><ArenaStage avatar={avatar} cinematic={{...frame,reduced,paused}}/><div className="cinema-shade" aria-hidden="true"/></div>
  <div className="cinema-letterbox-avatar cinema-letterbox-avatar-top" aria-hidden="true"/><div className="cinema-letterbox-avatar cinema-letterbox-avatar-bottom" aria-hidden="true"/>
  <div className="cinema-fx" aria-hidden="true"><i className="cinema-fx-scan"/><i className="cinema-fx-rain"/><i className="cinema-fx-gold"/><i className="cinema-fx-gate"/></div>
  {!isBlack&&<header className="cinema-header"><span>3B INTERNATIONAL</span><p>{sequence.title}</p></header>}
  {showCountries&&<div className="cinema-country-montage" aria-hidden="true">{COUNTRIES.map((country,index)=><span key={country.id} style={{'--i':index,'--country':country.color}}>{country.name}</span>)}</div>}
  {!isBlack&&!signature&&frame.title&&<div className="cinema-caption" aria-live="polite" aria-atomic="true" key={frame.id}><span className="cinema-chapter">{String(frame.index+1).padStart(2,'0')} / {String(frame.count).padStart(2,'0')}</span><h3>{frame.title}</h3>{frame.line&&<p>{frame.line}</p>}</div>}
  {signature&&<div className="cinema-signature" aria-live="polite"><small>LE MONDE DU 3B</small><h3>3B INTERNATIONAL</h3><p>Ce n’est pas une marque.</p><strong>C’est un héritage.</strong></div>}
  <div className="cinema-progress" aria-hidden="true"><i style={{transform:`scaleX(${frame.totalProgress})`}}/></div>
  <footer className="cinema-controls"><button type="button" onClick={finish}>Passer</button><button type="button" onClick={()=>setReduced(v=>!v)} aria-pressed={reduced}>{reduced?'Animation':'Lecture'}</button>{reduced?<button type="button" onClick={next}>{frame.index===frame.count-1?'Entrer dans le monde':'Suite'}</button>:<button type="button" onClick={()=>setPaused(v=>!v)} aria-pressed={paused}>{paused?'Reprendre':'Pause'}</button>}</footer>
 </section>;
}
