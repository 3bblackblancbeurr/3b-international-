import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {createLivingLibrary,createLivingActor} from '../world/living.js';
import {countryById,cardById} from '../world/catalog.js';

export function ArenaStage({state,side=0,cardId,avatar,focus='body',pose='idle',angle=null}){
 const ref=useRef(null),liveState=useRef({state,side,cardId,avatar,focus,pose,angle}),[error,setError]=useState('');liveState.current={state,side,cardId,avatar,focus,pose,angle};
 useEffect(()=>{
  const canvas=ref.current;let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setError('La 3D est indisponible sur ce navigateur. Les commandes restent accessibles.');return;}
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
  const stands=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4;const p=mesh(new THREE.CylinderGeometry(.25,.36,2.1,8),material('#32454b'));p.position.set(Math.cos(angle)*6.7,1,Math.sin(angle)*6.7);const lamp=mesh(new THREE.IcosahedronGeometry(.12,1),material('#d6bc83',{emissive:'#d6bc83',emissiveIntensity:1}));lamp.position.copy(p.position).y=2.2;stands.push(p,lamp);}
  let assetEpoch=0;let actors=[],ids=[],lastRevision='',at=performance.now(),raf,elapsed=0,impact=10,who=0,rot=.0,lastAngle=null,pointer=null,disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}}
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
  const down=e=>{pointer={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);};const move=e=>{if(pointer?.id===e.pointerId){rot+=(e.clientX-pointer.x)*.007;pointer.x=e.clientX;}};const up=()=>{pointer=null;};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  function tick(now){if(disposed)return;raf=requestAnimationFrame(tick);const dt=Math.min(.05,(now-at)/1000);at=now;if(document.hidden)return;elapsed+=dt;impact+=dt;
   const s=liveState.current,solo=!!s.cardId||!!s.avatar,next=s.cardId?[s.cardId]:s.avatar?['avatar:'+JSON.stringify(s.avatar)]:s.state?.sides.map(x=>x.cards[x.active].id)||[];
   for(const stand of stands)stand.visible=!solo;if(next.join('|')!==ids.join('|')){const epoch=++assetEpoch;actors.forEach(a=>{scene.remove(a.object);a.dispose();});ids=next;actors=next.map((id,index)=>{const a=createLivingActor(library,{...(s.avatar?{avatar:s.avatar}:{card:id}),onError:message=>{if(!disposed&&epoch===assetEpoch)setError(message);},onLoad:()=>{if(!disposed&&epoch===assetEpoch)setError('');}});a.object.position.set(solo?0:index===s.side?-1.45:1.45,0,0);a.object.rotation.y=solo?0:index===s.side?.65:-.65;scene.add(a.object);return a;});}
   const revision=s.state?String(s.state.round)+'-'+s.state.winner:'';
   if(s.state?.last&&revision!==lastRevision){lastRevision=revision;who=s.state.last.side;const kind=s.state.last.type;impact=kind==='strike'?0:10;if(['strike','power','relic'].includes(kind))actors[who]?.action(kind==='strike'?'Attack':'Cast');if(s.state.last.damage>0)actors[1-who]?.action(s.state.winner===who?'Death':'Hit');}
   if(s.angle!==lastAngle){if(s.angle!==null)rot=s.angle;lastAngle=s.angle;}
   for(const [i,a] of actors.entries()){a.update(dt,0,1,solo&&s.pose==='walk'?dt*1.6:0);a.object.rotation.y=solo?rot:i===s.side?.7:-.7;if(!solo){const x=i===s.side?-1.45:1.45;a.object.position.x=x+(i===who&&!reduced?Math.sin(Math.min(1,impact/.65)*Math.PI)*.5*(x<0?1:-1):0);}}
   const intro=!solo&&!reduced?Math.max(0,1-elapsed/2.5):0,zoom=solo?(s.focus==='face'?1.35:3.4):5.2+intro*1.5,orbit=solo?0:rot*.2;camera.position.set(Math.sin(orbit)*zoom,solo?(s.focus==='face'?1.68:1.8):2.15+intro*.5,Math.cos(orbit)*zoom);camera.lookAt(0,solo&&s.focus==='face'?1.57:.95,0);renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();actors.forEach(a=>a.dispose());library.dispose();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
 },[]);
 return <><canvas ref={ref} className="arena-stage" aria-label={cardId?'Modèle 3D de '+cardById[cardId].name+'. Glisse pour tourner.':avatar?'Aperçu 3D de ton personnage. Glisse pour tourner.':'Duel 3D des personnages. Les commandes de combat sont sous la scène.'}/>{error&&<p className="arena-model-error" role="status">{error}</p>}</>;
}
