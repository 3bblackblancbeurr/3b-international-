import React,{useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {fitWeapon} from '../weapon-model.js';
import {getWeapon} from '../arsenal.js';
import {unlockedForm} from '../arsenal-progression.js';
import WeaponEmblem from './WeaponEmblem.jsx';

/** One renderer for the selected item; collection tiles remain inexpensive illustrations. */
export default function WeaponShowroom({draft,xp=0}){
 const host=useRef(null),[failed,setFailed]=useState(false),w=getWeapon(draft.weapon),tier=unlockedForm(draft.weaponForm,xp);
 useEffect(()=>{
  const el=host.current;if(!el)return;setFailed(false);
  let renderer,weapon,observer,raf=0,disposed=false,visible=!document.hidden;
  const owned=[],scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,50),rig=new T.Group();
  let dragging=false,lastX=0,lastY=0,yaw=-.35,pitch=.12;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{
   renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
   try{const environment=pmrem.fromScene(room,.025,.1,100,{size:128});owned.push(environment);scene.environment=environment.texture;scene.environmentIntensity=1;}finally{room.dispose();pmrem.dispose();}
   el.appendChild(renderer.domElement);scene.add(rig);
   // The same equipment and unlocked form as the live character; no fictional stats.
   const holder=new T.Group(),hand=new T.Group();hand.name='hand_r';holder.add(hand);rig.add(holder);
   weapon=fitWeapon(holder,{...draft,weaponForm:tier});
   const root=holder.getObjectByName('3B-equipped-'+w.id);root.rotation.set(0,0,-.38);
   holder.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(holder),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
   holder.position.sub(center);const radius=Math.max(.3,size.length()/2);
   scene.add(new T.HemisphereLight('#dcefff','#182031',.9));
   for(const [color,intensity,x,y,z] of [['#fff1d4',3.5,3,4,4],['#83caff',2.5,-3,1,-2],['#ffffff',1.5,0,-2,3]]){const light=new T.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);}
   const floorGeo=new T.CircleGeometry(radius*1.8,64),floorMat=new T.MeshStandardMaterial({color:'#102031',metalness:.75,roughness:.3});owned.push(floorGeo,floorMat);
   const floor=new T.Mesh(floorGeo,floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-size.y/2-.12;scene.add(floor);
   const resize=()=>{const width=Math.max(1,el.clientWidth),height=Math.max(1,el.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;const distance=radius/Math.sin(camera.fov*Math.PI/360)*Math.max(1,1/camera.aspect)*1.12;camera.position.set(0,.08,distance);camera.lookAt(0,0,0);camera.updateProjectionMatrix();draw();};
   const draw=()=>{if(disposed||!visible)return;rig.rotation.set(pitch,yaw,0);renderer.render(scene,camera);};
   const down=e=>{if(e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;el.setPointerCapture(e.pointerId);};
   const move=e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.012;pitch=T.MathUtils.clamp(pitch+(e.clientY-lastY)*.008,-.65,.65);lastX=e.clientX;lastY=e.clientY;draw();};
   const up=()=>{dragging=false;};
   const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){yaw=-.35;pitch=.12;}else if(e.key==='ArrowLeft')yaw-=.15;else if(e.key==='ArrowRight')yaw+=.15;else pitch=T.MathUtils.clamp(pitch+(e.key==='ArrowUp'?-.1:.1),-.65,.65);draw();};
   const visibility=()=>{visible=!document.hidden;if(visible)draw();};
   el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);el.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
   const contextLost=e=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
   observer=new ResizeObserver(resize);observer.observe(el);resize();
   let previous=0;const tick=now=>{if(disposed)return;raf=requestAnimationFrame(tick);if(now-previous<50||!visible)return;previous=now;if(!reduced&&!dragging)weapon.update(now/1000);draw();};raf=requestAnimationFrame(tick);
   return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);for(const [type,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['keydown',key]])el.removeEventListener(type,fn);weapon.dispose();owned.forEach(a=>a.dispose());renderer.dispose();renderer.domElement.remove();};
  }catch{setFailed(true);disposed=true;cancelAnimationFrame(raf);observer?.disconnect();weapon?.dispose();owned.forEach(a=>a.dispose());renderer?.dispose();renderer?.domElement.remove();}
 },[w.id,tier]);
 return <figure className="weapon-showroom" style={{'--weapon-color':w.color}}><div className="weapon-showroom-stage" data-failed={failed} ref={host} tabIndex={0} role="img" aria-label={w.name+' en trois dimensions. Glisser ou utiliser les flèches pour tourner.'}>{failed&&<WeaponEmblem weapon={w}/>}</div><figcaption><span>{w.country.toUpperCase()} · FORME {tier+1}</span><strong>{w.name}</strong><small>{failed?'Illustration de l’arme':'Glisse pour inspecter · flèches au clavier · Home pour recentrer'}</small></figcaption></figure>;
}
