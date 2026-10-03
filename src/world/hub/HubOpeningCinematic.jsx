import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {HUB_SCALE,HUB_PLATFORM} from './platform-layout.js';
import {createHubPlatform} from './platform-scene.js';
import {createLivingLibrary,createLivingActor} from '../living.js';
import {HUB_OPENING_SHOTS,openingFrame} from './opening-sequence.js';
import './platform.css';

export function HubOpeningCinematic({avatar,onDone}){
 const canvas=useRef(null),playback=useRef({elapsed:0,paused:false,reduced:false}),finishRef=useRef(onDone),done=useRef(false);
 const [elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[error,setError]=useState(''),[voice,setVoice]=useState(false);
 finishRef.current=onDone;playback.current={...playback.current,paused,reduced};const frame=openingFrame(elapsed);
 const finish=()=>{if(done.current)return;done.current=true;window.speechSynthesis?.cancel();finishRef.current?.();};
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  if(!voice||paused||!window.speechSynthesis)return;const utterance=new SpeechSynthesisUtterance(frame.line);utterance.lang='fr-FR';utterance.rate=.94;window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);return()=>window.speechSynthesis.cancel();
 },[frame.id,voice,paused]);
 useEffect(()=>{
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas:canvas.current,antialias:false,powerPreference:'low-power'});}catch{setError('La scène 3D est indisponible. Tu peux lire l’histoire et continuer.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#7895ae');scene.fog=new THREE.Fog('#7895ae',350,1100);
  const camera=new THREE.PerspectiveCamera(58,1,.2,1600),look=new THREE.Vector3(),platform=createHubPlatform({seals:[]}),library=createLivingLibrary();scene.add(platform.root);
  scene.add(new THREE.HemisphereLight('#deefff','#344459',2));const sun=new THREE.DirectionalLight('#ffe6be',2.5);sun.position.set(-120,180,90);scene.add(sun);
  const hero=createLivingActor(library,{avatar,scale:2.2,onError:()=>setError('Le personnage est encore en chargement. Tu peux continuer.')});hero.object.position.set(0,0,HUB_PLATFORM.spawn.z);hero.object.rotation.y=.4;scene.add(hero.object);
  // Two residents accompany the arrival; they use the same living-character models.
  const residents=[[-22,43],[24,44]].map(([x,z],i)=>{const a=createLivingActor(library,{avatar:{body:i?'femme':'homme',style:'voyageur',color:i+1},scale:2});a.object.position.set(x*HUB_SCALE,0,z*HUB_SCALE);scene.add(a.object);return a;});
  const resize=()=>{const {width,height}=canvas.current.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}};
  const ro=new ResizeObserver(resize);ro.observe(canvas.current);resize();let raf,last=performance.now(),report=0;
  function tick(now){
   raf=requestAnimationFrame(tick);const dt=Math.min(80,Math.max(0,now-last));last=now;
   const state=playback.current;if(!document.hidden&&!state.paused&&!state.reduced)state.elapsed+=dt;
   const f=openingFrame(state.elapsed),t=state.reduced?.5:f.progress,ease=t*t*(3-2*t);
   camera.position.set(...f.from).lerp(new THREE.Vector3(...f.to),ease);look.set(...f.look);camera.lookAt(look);
   platform.updateDistrict(camera,HUB_PLATFORM.spawn);platform.tick(state.elapsed/1000);hero.update(state.paused||state.reduced?0:dt/1000);for(const a of residents)a.update(state.paused||state.reduced?0:dt/1000);
   renderer.render(scene,camera);if(now-report>80){report=now;setElapsed(state.elapsed);}if(f.done&&!done.current){done.current=true;finishRef.current?.();}
  }
  raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);ro.disconnect();hero.dispose();residents.forEach(a=>a.dispose());library.dispose();platform.dispose();renderer.dispose();};
 },[avatar]);
 const next=()=>{if(frame.index===HUB_OPENING_SHOTS.length-1){finish();return;}const time=HUB_OPENING_SHOTS.slice(0,frame.index+1).reduce((n,s)=>n+s.duration,0);playback.current.elapsed=time;setElapsed(time);};
 return <section className="hub-opening" aria-label="Ouverture du Monde du 3B" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();finish();}}}>
  <canvas ref={canvas} aria-label="Cinématique animée sur la plateforme du Cercle Brisé"/>
  <header><span>3B INTERNATIONAL</span><small>DE ZÉRO À L’INTERNATIONAL</small></header>
  <div className="hub-opening-caption" key={frame.id}><small>{frame.index+1} / {HUB_OPENING_SHOTS.length}</small><h2>{frame.title}</h2><p>{frame.line}</p>{error&&<p role="status">{error}</p>}</div>
  <footer><button onClick={finish}>Passer et jouer</button><button aria-pressed={voice} onClick={()=>setVoice(v=>!v)}>Narration {voice?'activée':'désactivée'}</button><button aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'Reprendre':'Pause'}</button><button onClick={next}>{frame.index===HUB_OPENING_SHOTS.length-1?'Entrer dans le monde':'Suite'}</button></footer>
 </section>;
}
