import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createLivingLibrary,createLivingActor,avatarModelKey} from '../world/living.js';
import {countryById,cardById} from '../world/catalog.js';
import {AVATAR_PATHS} from '../world/avatar-rules.js';
import {COMPANIONS} from '../world/arsenal.js';

export function ArenaStage({state,side=0,cardId,avatar,focus='body',pose='idle',angle=null,cinematic=null,weaponState='preview',lighting='studio',showAura=false,showCompanion=false}){
 const ref=useRef(null),liveState=useRef({state,side,cardId,avatar,focus,pose,angle,cinematic,weaponState,lighting,showAura,showCompanion}),[error,setError]=useState('');liveState.current={state,side,cardId,avatar,focus,pose,angle,cinematic,weaponState,lighting,showAura,showCompanion};
 useEffect(()=>{
  const canvas=ref.current;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{setError('La 3D est indisponible sur ce navigateur. Les commandes restent accessibles.');return;}
  const library=createLivingLibrary(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,90),geometry=[],materials=[];
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  scene.background=avatar?null:new THREE.Color('#101c27');scene.fog=new THREE.Fog('#101c27',13,29);
  const hemi=new THREE.HemisphereLight('#ecf6ff','#a0aa92',3.2);scene.add(hemi);
  const light=new THREE.DirectionalLight('#ffe7b5',4);light.position.set(-4,7,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-6,right:6,top:5,bottom:-5});light.shadow.normalBias=.035;scene.add(light);
  const rim=new THREE.DirectionalLight('#74c6e7',3);rim.position.set(4,3,-5);scene.add(rim);
  const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.67,metalness:.2,...extra});materials.push(m);return m;};
  const mesh=(g,m)=>{geometry.push(g);const o=new THREE.Mesh(g,m);o.receiveShadow=true;scene.add(o);return o;};
  const auraGeo=new THREE.TorusGeometry(.78,.018,6,64),auraMat=new THREE.MeshBasicMaterial({color:'#efd58f',transparent:true,opacity:.34,depthWrite:false}),aura=new THREE.Mesh(auraGeo,auraMat);geometry.push(auraGeo);materials.push(auraMat);aura.rotation.x=Math.PI/2;aura.position.y=.045;aura.visible=false;scene.add(aura);
  const auraLight=new THREE.PointLight('#efd58f',0,3.6);auraLight.position.set(0,.55,0);scene.add(auraLight);
  const floor=mesh(new THREE.CylinderGeometry(7,7.15,.20,64),material('#233941'));floor.position.y=-.13;floor.visible=!avatar;
  for(const r of [3.2,5.4,6.5]){const o=mesh(new THREE.TorusGeometry(r,.018,5,80),material('#aa915e',{metalness:.8}));o.rotation.x=Math.PI/2;o.position.y=.005;o.visible=!avatar;}
  const stands=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4;const p=mesh(new THREE.CylinderGeometry(.25,.36,2.1,8),material('#32454b'));p.position.set(Math.cos(angle)*6.7,1,Math.sin(angle)*6.7);const lamp=mesh(new THREE.IcosahedronGeometry(.12,1),material('#d6bc83',{emissive:'#d6bc83',emissiveIntensity:1}));lamp.position.copy(p.position).y=2.2;stands.push(p,lamp);}
  let lastFilm='',lastPreviewPose='',lastLighting='',lastCompanion='';let assetEpoch=0;let actors=[],ids=[],lastRevision='',at=performance.now(),raf,elapsed=0,impact=10,who=0,rot=.0,lastAngle=null,pointer=null,disposed=false,previewZoom=1,pinchDistance=null,wolf=null,wolfMixer=null,wolfPromise=null,wolfMaterials=[];const touchPoints=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}}
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const pinch=()=>{const pts=[...touchPoints.values()];return pts.length>1?Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y):null;};
  const down=e=>{if(liveState.current.cinematic)return;touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});pointer={id:e.pointerId,x:e.clientX};if(touchPoints.size>1)pinchDistance=pinch();canvas.setPointerCapture(e.pointerId);};
  const move=e=>{if(!touchPoints.has(e.pointerId))return;touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size>1){const next=pinch();if(pinchDistance&&next)previewZoom=Math.max(.7,Math.min(1.55,previewZoom*(pinchDistance/next)));pinchDistance=next;return;}if(pointer?.id===e.pointerId){rot+=(e.clientX-pointer.x)*.007;pointer.x=e.clientX;}};
  const up=e=>{touchPoints.delete(e.pointerId);pointer=touchPoints.size?[...touchPoints.entries()].map(([id,p])=>({id,x:p.x}))[0]:null;pinchDistance=pinch();};
  const wheel=e=>{if(!liveState.current.avatar)return;e.preventDefault();previewZoom=Math.max(.7,Math.min(1.55,previewZoom+e.deltaY*.001));};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
  function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);const dt=liveState.current.cinematic?.paused||liveState.current.cinematic?.reduced?0:Math.min(.05,(now-at)/1000);at=now;if(document.hidden)return;elapsed+=dt;impact+=dt;
   const s=liveState.current,film=s.cinematic,solo=!!s.cardId||!!s.avatar,next=s.cardId?[s.cardId]:s.avatar?['avatar:'+avatarModelKey(s.avatar)]:s.state?.sides.map(x=>x.cards[x.active].id)||[];
   if(s.avatar&&s.lighting!==lastLighting){lastLighting=s.lighting;const modes={studio:{bg:'#0b131b',hemi:3.2,key:4,rim:3},sun:{bg:'#9fb9c8',hemi:3.8,key:5.2,rim:1.2},night:{bg:'#050914',hemi:1.5,key:1.8,rim:4.4},rain:{bg:'#172632',hemi:2.1,key:2.4,rim:3.5}},m=modes[s.lighting]||modes.studio;scene.background=new THREE.Color(m.bg);hemi.intensity=m.hemi;light.intensity=m.key;rim.intensity=m.rim;}
   if(s.avatar){const path=AVATAR_PATHS[s.avatar.path]||AVATAR_PATHS.lumiere;auraMat.color.set(path.color);auraLight.color.set(path.color);aura.visible=!!s.showAura;auraLight.intensity=s.showAura?1.2:0;if(aura.visible){const pulse=1+Math.sin(elapsed*2.2)*.045;aura.scale.setScalar(pulse);aura.rotation.z+=dt*.18;}}
   if(s.avatar&&s.showCompanion&&!wolfPromise&&!wolf){wolfPromise=library.load('/world/origins/wolf.glb').then(asset=>{if(disposed)return;wolf=asset.scene.clone(true);wolf.scale.setScalar(1.15);wolf.position.set(.82,0,.08);wolf.rotation.y=-.28;wolf.traverse(o=>{if(o.isMesh&&o.material){o.material=Array.isArray(o.material)?o.material.map(m=>{const n=m.clone();wolfMaterials.push(n);return n;}):o.material.clone();if(!Array.isArray(o.material))wolfMaterials.push(o.material);}});scene.add(wolf);wolfMixer=new THREE.AnimationMixer(wolf);const clip=asset.animations.find(a=>/Idle/i.test(a.name))||asset.animations[0];if(clip)wolfMixer.clipAction(clip).play();}).catch(()=>{wolfPromise=null;});}
   if(wolf){wolf.visible=!!s.avatar&&!!s.showCompanion;wolfMixer?.update(dt);if(s.avatar?.companion!==lastCompanion){lastCompanion=s.avatar.companion;const tint=COMPANIONS.find(x=>x.id===lastCompanion)?.color||'#9da6ad';for(const m of wolfMaterials)if(m.color)m.color.set(tint);}}
   for(const stand of stands)stand.visible=!solo;if(next.join('|')!==ids.join('|')){const epoch=++assetEpoch;actors.forEach(a=>{scene.remove(a.object);a.dispose();});ids=next;actors=next.map((id,index)=>{const a=createLivingActor(library,{...(s.avatar?{avatar:s.avatar,weaponState:s.weaponState}:{card:id}),onError:message=>{if(!disposed&&epoch===assetEpoch)setError(message);},onLoad:()=>{if(!disposed&&epoch===assetEpoch)setError('');}});a.object.position.set(solo?0:index===s.side?-1.45:1.45,0,0);a.object.rotation.y=solo?0:index===s.side?.65:-.65;scene.add(a.object);return a;});}
   if(s.avatar&&actors[0]){actors[0].setAvatar?.(s.avatar);actors[0].setWeaponDrawn?.(s.weaponState==='preview');if(s.pose!==lastPreviewPose){if(s.pose==='attack')actors[0].action('Attack');else if(s.pose==='cast')actors[0].action('Cast');lastPreviewPose=s.pose;}}
   const revision=s.state?String(s.state.round)+'-'+s.state.winner:'';
   if(s.state?.last&&revision!==lastRevision){lastRevision=revision;who=s.state.last.side;const kind=s.state.last.type;impact=kind==='strike'?0:10;if(['strike','power','relic'].includes(kind))actors[who]?.action(kind==='strike'?'Attack':'Cast');if(s.state.last.damage>0)actors[1-who]?.action(s.state.winner===who?'Death':'Hit');}
   if(film&&film.id!==lastFilm){lastFilm=film.id;if(!film.reduced)actors[0]?.action(film.action||'Idle');}if(s.angle!==lastAngle){if(s.angle!==null)rot=s.angle;lastAngle=s.angle;}
   for(const [i,a] of actors.entries()){const previewTravel=solo&&s.avatar?(s.pose==='run'?dt*5.6:s.pose==='walk'?dt*1.7:0):0;a.update(dt,0,1,previewTravel);a.object.rotation.y=solo?rot:i===s.side?.7:-.7;if(!solo){const x=i===s.side?-1.45:1.45;a.object.position.x=x+(i===who&&!reduced?Math.sin(Math.min(1,impact/.65)*Math.PI)*.5*(x<0?1:-1):0);}}
   const intro=!solo&&!reduced?Math.max(0,1-elapsed/2.5):0,zoom=solo?(s.focus==='face'?1.35:3.4)*previewZoom:5.2+intro*1.5,orbit=solo?0:rot*.2;camera.position.set(Math.sin(orbit)*zoom,solo?(s.focus==='face'?1.68:1.8):2.15+intro*.5,Math.cos(orbit)*zoom);let targetX=0,targetY=solo&&s.focus==='face'?1.57:.95;
   if(film){const f=film.camera,progress=film.reduced?0:film.progress,range=f==='portrait'?1.8:f==='equipment'?2.7:f==='departure'?4+progress:3.6;camera.position.set(film.reduced?0:Math.sin((progress-.5)*.35)*range,f==='portrait'?1.75:1.8,range);targetY=f==='portrait'?1.55:1;}
   else if(!solo&&(s.state?.winner===0||s.state?.winner===1)){targetX=s.state.winner===s.side?-1.45:1.45;camera.position.set(targetX*.5,2,4.5);}
   camera.lookAt(targetX,targetY,0);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();actors.forEach(a=>a.dispose());library.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);wolfMaterials.forEach(m=>m.dispose());};
 },[]);
 return <><canvas ref={ref} className="arena-stage" aria-label={cardId?'Modèle 3D de '+cardById[cardId].name+'. Glisse pour tourner.':avatar?'Aperçu 3D de ton personnage. Glisse pour tourner.':'Duel 3D des personnages. Les commandes de combat sont sous la scène.'}/>{error&&<p className="arena-model-error" role="status">{error}</p>}</>;
}
