import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createLivingLibrary,createLivingActor} from '../world/living.js';
import {cardById} from '../world/catalog.js';
import {AVATAR_PATHS} from '../world/avatar-rules.js';

export function ArenaStage({state,side=0,cardId,avatar,cinematic}){
 const ref=useRef(null),liveState=useRef({state,side,cardId,avatar,cinematic}),[error,setError]=useState('');liveState.current={state,side,cardId,avatar,cinematic};
 useEffect(()=>{
  const canvas=ref.current;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setError('La 3D est indisponible sur ce navigateur. Les textes et les commandes restent accessibles.');return;}
  const library=createLivingLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,110),geometry=[],materials=[];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.background=new THREE.Color('#07111d');scene.fog=new THREE.FogExp2('#07111d',.026);
  scene.add(new THREE.HemisphereLight('#dceeff','#07101b',2.15));
  const light=new THREE.DirectionalLight('#ffe1a6',4.4);light.position.set(-4,7,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-6,right:6,top:5,bottom:-5});light.shadow.normalBias=.035;scene.add(light);
  const rim=new THREE.DirectionalLight('#65cfff',3.5);rim.position.set(4,3,-5);scene.add(rim);
  const bluePulse=new THREE.PointLight('#52cfff',0,14,2);bluePulse.position.set(2.8,3,-2.2);scene.add(bluePulse);
  const goldPulse=new THREE.PointLight('#e2c27d',0,12,2);goldPulse.position.set(-2.4,2.2,-1.6);scene.add(goldPulse);
  const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.18,...extra});materials.push(m);return m;};
  const mesh=(g,m,parent=scene)=>{geometry.push(g);const o=new THREE.Mesh(g,m);o.receiveShadow=true;parent.add(o);return o;};
  const floor=mesh(new THREE.CylinderGeometry(7,7.15,.20,64),material('#162936',{roughness:.32,metalness:.14}));floor.position.y=-.13;
  for(const r of [3.2,5.4,6.5]){const o=mesh(new THREE.TorusGeometry(r,.018,5,80),material('#aa915e',{metalness:.82,roughness:.28}));o.rotation.x=Math.PI/2;o.position.y=.005;}
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;const p=mesh(new THREE.CylinderGeometry(.25,.36,2.1,8),material('#263c48'));p.position.set(Math.cos(angle)*6.7,1,Math.sin(angle)*6.7);const lamp=mesh(new THREE.IcosahedronGeometry(.12,1),material('#d6bc83',{emissive:'#d6bc83',emissiveIntensity:1.2,roughness:.2}));lamp.position.copy(p.position).y=2.2;}
  const portal=new THREE.Group();portal.position.set(0,2.25,-1.85);scene.add(portal);
  const portalMat=material('#55cfff',{emissive:'#38bfff',emissiveIntensity:2.4,metalness:.72,roughness:.18,transparent:true,opacity:.18});
  const portalGold=material('#e0c17c',{emissive:'#b88d38',emissiveIntensity:1.4,metalness:.86,roughness:.2,transparent:true,opacity:.12});
  mesh(new THREE.TorusGeometry(2.65,.048,10,128),portalMat,portal);
  const inner=mesh(new THREE.TorusGeometry(2.28,.022,8,112),portalGold,portal);inner.rotation.z=.21;
  for(let i=0;i<8;i++){const shard=mesh(new THREE.BoxGeometry(.055,.42,.055),i%2?portalMat:portalGold,portal),angle=i*Math.PI/4;shard.position.set(Math.cos(angle)*2.46,Math.sin(angle)*2.46,0);shard.rotation.z=angle;shard.rotation.y=.35;}
  portal.visible=false;
  const particleGeometry=new THREE.BufferGeometry(),particlePositions=new Float32Array(96*3);
  for(let i=0;i<96;i++){particlePositions[i*3]=(Math.random()-.5)*10;particlePositions[i*3+1]=Math.random()*6-.5;particlePositions[i*3+2]=(Math.random()-.5)*6-1;}
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));geometry.push(particleGeometry);
  const particleMat=new THREE.PointsMaterial({color:'#d9c083',size:.035,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(particleMat);
  const particles=new THREE.Points(particleGeometry,particleMat);particles.visible=false;scene.add(particles);
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
    const shot=({
     blackout:{radius:4.8,y:2.1,focus:1.1,from:0,to:0,fov:38},
     scan:{radius:2.72,y:1.64,focus:1.34,from:-.08,to:.06,fov:31},
     portrait:{radius:3.15,y:1.76,focus:1.28,from:-.18,to:.12,fov:34},
     orbit:{radius:4.25,y:2.0,focus:1.12,from:-.46,to:.34,fov:40},
     portal:{radius:5.15,y:2.25,focus:1.22,from:.32,to:-.22,fov:44},
     worlds:{radius:6.4,y:2.75,focus:1.18,from:-.28,to:.28,fov:48},
     traversal:{radius:4.05,y:1.86,focus:1.15,from:.5,to:-.48,fov:54},
     reveal:{radius:7.25,y:3.2,focus:1.12,from:-.12,to:.12,fov:50},
     signature:{radius:5.85,y:2.5,focus:1.16,from:.08,to:-.08,fov:42},
     handoff:{radius:5.05,y:2.18,focus:1.12,from:-.04,to:0,fov:38},
    })[film.camera]||{radius:4.5,y:2.1,focus:1.1,from:0,to:0,fov:38};
    const angle=reduced?0:shot.from+(shot.to-shot.from)*smooth,radius=shot.radius*(portrait?1.1:1),verticalLift=film.camera==='traversal'&&!reduced?Math.sin(p*Math.PI)*.35:0;
    desired.set(Math.sin(angle)*radius,shot.y+verticalLift,Math.cos(angle)*radius);target.set(0,shot.focus,0);
    const fovBlend=reduced?1:1-Math.exp(-rawDt*4.5);camera.fov+=((shot.fov||38)-camera.fov)*fovBlend;camera.updateProjectionMatrix();
    rim.color.set(AVATAR_PATHS[s.avatar?.path]?.color||'#65cfff');
    const gate=['portal','worlds','warp','world','signature'].includes(film.effect);
    portal.visible=gate;particles.visible=film.effect!=='blackout';portal.rotation.z+=dt*(film.effect==='warp'?.34:.08);inner.rotation.z-=dt*.13;
    const pulse=.5+.5*Math.sin(elapsed*2.2);portalMat.opacity=gate?.22+pulse*.22:.04;portalGold.opacity=gate?.16+pulse*.16:.03;particleMat.opacity=film.effect==='warp'?.68:film.effect==='world'?.52:.28;particles.rotation.y+=dt*.025;particles.position.y=Math.sin(elapsed*.35)*.12;
    bluePulse.intensity=gate?2.3+pulse*2.1:.35;goldPulse.intensity=gate?1.6+pulse*1.4:.25;renderer.toneMappingExposure=film.effect==='portal'||film.effect==='warp'?1.38:film.effect==='world'?1.3:1.22;
   }else if(!solo&&!reduced&&(s.state?.winner===0||s.state?.winner===1)){
    // Presentation only: do not pause a live match or alter its server deadline.
    const x=s.state.winner===s.side?-1.45:1.45,p=Math.min(1,resultAge/5),angle=(x<0?-.12:.12)*p;
    target.set(x*.65,1,0);desired.set(x*.65+Math.sin(angle)*5,2.05,Math.cos(angle)*5);
   }
   const blend=reduced?1:1-Math.exp(-rawDt*5);camera.position.lerp(desired,blend);look.lerp(target,blend);camera.lookAt(look);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();actors.forEach(a=>a.dispose());portal.removeFromParent();particles.removeFromParent();library.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[]);
 return <><canvas ref={ref} className="arena-stage" aria-label={cinematic?'Mise en scène 3D de ton personnage personnalisé.':cardId?'Modèle 3D de '+(cardById[cardId]?.name||'ton personnage')+'. Glisse pour tourner.':avatar?'Aperçu 3D de ton personnage. Glisse pour tourner.':'Duel 3D des personnages. Les commandes de combat sont sous la scène.'}/>{error&&<p className="arena-model-error" role="status">{error}</p>}</>;
}
