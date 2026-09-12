import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createLivingLibrary,createLivingActor} from '../world/living.js';
import {cardById} from '../world/catalog.js';
import {AVATAR_PATHS} from '../world/avatar-rules.js';

export function ArenaStage({state,side=0,cardId,avatar,cinematic}){
 const ref=useRef(null),liveState=useRef({state,side,cardId,avatar,cinematic}),[error,setError]=useState('');liveState.current={state,side,cardId,avatar,cinematic};
 useEffect(()=>{
  const canvas=ref.current;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setError('La 3D est indisponible sur ce navigateur. Les textes et les commandes restent accessibles.');return;}
  const library=createLivingLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,90),geometry=[],materials=[];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene.background=new THREE.Color('#101c27');scene.fog=new THREE.Fog('#101c27',13,29);
  scene.add(new THREE.HemisphereLight('#ecf6ff','#a0aa92',3.2));
  const light=new THREE.DirectionalLight('#ffe7b5',4);light.position.set(-4,7,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-6,right:6,top:5,bottom:-5});light.shadow.normalBias=.035;scene.add(light);
  const rim=new THREE.DirectionalLight('#74c6e7',3);rim.position.set(4,3,-5);scene.add(rim);
  const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.67,metalness:.2,...extra});materials.push(m);return m;};
  const mesh=(g,m)=>{geometry.push(g);const o=new THREE.Mesh(g,m);o.receiveShadow=true;scene.add(o);return o;};
  const floor=mesh(new THREE.CylinderGeometry(7,7.15,.20,64),material('#233941'));floor.position.y=-.13;
  for(const r of [3.2,5.4,6.5]){const o=mesh(new THREE.TorusGeometry(r,.018,5,80),material('#aa915e',{metalness:.8}));o.rotation.x=Math.PI/2;o.position.y=.005;}
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;const p=mesh(new THREE.CylinderGeometry(.25,.36,2.1,8),material('#32454b'));p.position.set(Math.cos(angle)*6.7,1,Math.sin(angle)*6.7);const lamp=mesh(new THREE.IcosahedronGeometry(.12,1),material('#d6bc83',{emissive:'#d6bc83',emissiveIntensity:1}));lamp.position.copy(p.position).y=2.2;}
  let actors=[],ids=[],lastRevision='',at=performance.now(),raf,elapsed=0,impact=10,who=0,rot=0,pointer=null,disposed=false;
  let lastFilm='',lastRound=null,lastWinner=null,introAge=0,resultAge=0;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const target=new THREE.Vector3(0,.95,0),desired=new THREE.Vector3(0,2.1,4.5),look=new THREE.Vector3(0,.95,0);
  camera.position.copy(desired);
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}}
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const down=e=>{if(liveState.current.cinematic)return;pointer={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);};const move=e=>{if(pointer?.id===e.pointerId){rot+=(e.clientX-pointer.x)*.007;pointer.x=e.clientX;}};const up=()=>{pointer=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);const rawDt=Math.min(.05,Math.max(0,(now-at)/1000));at=now;if(document.hidden)return;
   const s=liveState.current,film=s.cinematic,reduced=media.matches||film?.reduced,dt=film?.paused?0:rawDt;
   elapsed+=dt;impact+=dt;
   const solo=!!s.cardId||!!s.avatar,next=s.cardId?[s.cardId]:s.avatar?['avatar:'+JSON.stringify(s.avatar)]:s.state?.sides.map(x=>x.cards[x.active].id)||[];
   if(next.join('|')!==ids.join('|')){actors.forEach(a=>{scene.remove(a.object);a.dispose();});ids=next;actors=next.map((id,index)=>{const a=createLivingActor(library,{...(s.avatar?{avatar:s.avatar}:{card:id}),onError:setError});a.object.position.set(solo?0:index===s.side?-1.45:1.45,0,0);a.object.rotation.y=solo?0:index===s.side?.65:-.65;scene.add(a.object);return a;});lastFilm='';}
   if(s.state){
    const reset=lastRound===null||s.state.round<lastRound||(lastWinner!==null&&s.state.winner===null);
    if(reset){introAge=0;resultAge=0;lastRevision='';}
    if(s.state.winner!==null&&lastWinner===null)resultAge=0;
    introAge+=dt;if(s.state.winner!==null)resultAge+=dt;
    lastRound=s.state.round;lastWinner=s.state.winner;
   }else{lastRound=null;lastWinner=null;}
   const revision=s.state?String(s.state.round)+'-'+s.state.winner:'';
   if(s.state?.last&&revision!==lastRevision){lastRevision=revision;who=s.state.last.side;const kind=s.state.last.type;impact=kind==='strike'?0:10;if(['strike','power','relic'].includes(kind))actors[who]?.action(kind==='strike'?'Attack':'Cast');if(s.state.last.damage>0)actors[1-who]?.action(s.state.winner===who?'Death':'Hit');}
   if(film&&film.id!==lastFilm){lastFilm=film.id;if(!reduced)actors[0]?.action(film.action||'Idle');}
   for(const [i,a] of actors.entries()){a.update(reduced&&film?0:dt);a.object.rotation.y=solo?(film?0:rot):i===s.side?.7:-.7;if(!solo){const x=i===s.side?-1.45:1.45;a.object.position.x=x+(i===who&&!reduced?Math.sin(Math.min(1,impact/.65)*Math.PI)*.5*(x<0?1:-1):0);}}
   const intro=!solo&&!reduced&&!s.state?.last?Math.max(0,1-introAge/3.5):0,zoom=solo?4.5:5.2+intro*2,orbit=solo?0:rot*.2;
   desired.set(Math.sin(orbit)*zoom,solo?2.1:2.15+intro*.7,Math.cos(orbit)*zoom);target.set(0,.95,0);
   if(film){
    // Different framings of the saved avatar, not pre-rendered stock characters.
    const p=Math.max(0,Math.min(1,film.progress||0)),smooth=p*p*(3-2*p),portrait=camera.aspect<.85;
    const shot=({portrait:{radius:3.05,y:1.75,focus:1.23,from:-.16,to:.13},full:{radius:5.25,y:2.2,focus:1.12,from:-.38,to:.15},equipment:{radius:3.8,y:1.7,focus:.98,from:.38,to:.05},power:{radius:4.65,y:1.95,focus:1.1,from:.3,to:-.3},departure:{radius:6.3,y:2.9,focus:1.1,from:-.16,to:0}})[film.camera]||{radius:4.5,y:2.1,focus:1.1,from:0,to:0};
    const angle=reduced?0:shot.from+(shot.to-shot.from)*smooth,radius=shot.radius*(portrait?1.12:1);
    desired.set(Math.sin(angle)*radius,shot.y,Math.cos(angle)*radius);target.set(0,shot.focus,0);
    rim.color.set(AVATAR_PATHS[s.avatar?.path]?.color||'#74c6e7');
   }else if(!solo&&!reduced&&(s.state?.winner===0||s.state?.winner===1)){
    // Presentation only: do not pause a live match or alter its server deadline.
    const x=s.state.winner===s.side?-1.45:1.45,p=Math.min(1,resultAge/5),angle=(x<0?-.12:.12)*p;
    target.set(x*.65,1,0);desired.set(x*.65+Math.sin(angle)*5,2.05,Math.cos(angle)*5);
   }
   const blend=reduced?1:1-Math.exp(-rawDt*5);camera.position.lerp(desired,blend);look.lerp(target,blend);camera.lookAt(look);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();actors.forEach(a=>a.dispose());library.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[]);
 return <><canvas ref={ref} className="arena-stage" aria-label={cinematic?'Mise en scène 3D de ton personnage personnalisé.':cardId?'Modèle 3D de '+(cardById[cardId]?.name||'ton personnage')+'. Glisse pour tourner.':avatar?'Aperçu 3D de ton personnage. Glisse pour tourner.':'Duel 3D des personnages. Les commandes de combat sont sous la scène.'}/>{error&&<p className="arena-model-error" role="status">{error}</p>}</>;
}
