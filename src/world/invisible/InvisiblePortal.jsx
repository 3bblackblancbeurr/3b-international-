import React, {useEffect, useRef, useState} from 'react';
import {Camera, CameraOff} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {goldMasterTokens, worldArtMaterials} from '../../design-system/tokens.js';
import {INVISIBLE_REALMS} from './catalog.js';

export default function InvisiblePortal({opened,realm='france',value='Justice'}) {
 const host=useRef(null),video=useRef(null),stream=useRef(null),cameraTicket=useRef(0),[camera,setCamera]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[fallback,setFallback]=useState(false);
 useEffect(()=>{
  let alive=true,dispose=()=>{};
  import('three').then(THREE=>{
   if(!alive||!host.current)return;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,container=host.current;
   let renderer;
   try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setClearColor(0,0);container.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),view=new THREE.PerspectiveCamera(38,1,.1,80);view.position.set(0,.2,7.4);
   const root=new THREE.Group();scene.add(root);
   const gold=new THREE.MeshStandardMaterial({color:goldMasterTokens.colors.champagne,metalness:.85,roughness:.28,emissive:goldMasterTokens.colors.champagneDeep,emissiveIntensity:.13});
   const blue=new THREE.MeshBasicMaterial({color:worldArtMaterials.monumentEmission,transparent:true,opacity:.7});
   const ringGeometry=new THREE.TorusGeometry(1.55,.11,14,96),ring=new THREE.Mesh(ringGeometry,gold);root.add(ring);
   const innerGeometry=new THREE.TorusGeometry(1.36,.025,8,96),inner=new THREE.Mesh(innerGeometry,blue);root.add(inner);
   const glyphGeometry=new THREE.OctahedronGeometry(.06),glyphs=[];
   for(let i=0;i<16;i++){const glyph=new THREE.Mesh(glyphGeometry,blue),a=i/16*Math.PI*2;glyph.position.set(Math.cos(a)*1.78,Math.sin(a)*1.78,0);glyph.rotation.z=a;root.add(glyph);glyphs.push(glyph);}
   const veilGeometry=new THREE.CircleGeometry(1.3,64),veilMaterial=new THREE.MeshBasicMaterial({color:goldMasterTokens.colors.matrix,transparent:true,opacity:.055,side:THREE.DoubleSide}),veil=new THREE.Mesh(veilGeometry,veilMaterial);root.add(veil);
   const particlePositions=new Float32Array(72*3);for(let i=0;i<72;i++){const angle=i*2.399,rad=1.05*Math.sqrt(i/72);particlePositions[i*3]=Math.cos(angle)*rad;particlePositions[i*3+1]=Math.sin(angle)*rad;particlePositions[i*3+2]=Math.sin(i)*.5;}
   const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));const particleMaterial=new THREE.PointsMaterial({size:.018,color:goldMasterTokens.colors.champagneHighlight,transparent:true,opacity:.7}),particles=new THREE.Points(particleGeometry,particleMaterial);root.add(particles);
   scene.add(new THREE.AmbientLight(goldMasterTokens.colors.text,2));const light=new THREE.PointLight(goldMasterTokens.colors.champagneHighlight,50,12);light.position.set(2,3,4);scene.add(light);const lakeLight=new THREE.PointLight(goldMasterTokens.colors.matrix,20,10);lakeLight.position.set(-2,-1,3);scene.add(lakeLight);
   let frame=0,visible=true;const size=()=>{const width=container.clientWidth,height=container.clientHeight;renderer.setSize(width,height,false);view.aspect=width/Math.max(height,1);view.updateProjectionMatrix();renderer.render(scene,view);};
   const resize=new ResizeObserver(size);resize.observe(container);size();
   const animate=time=>{if(!alive||!visible||document.hidden)return;const t=time*.001;root.rotation.y=Math.sin(t*.3)*.12;inner.rotation.z=t*.07;particles.rotation.z=-t*.035;veilMaterial.opacity=.055+Math.sin(t*.6)*.025;renderer.render(scene,view);frame=requestAnimationFrame(animate);};
   const visibility=()=>{cancelAnimationFrame(frame);if(visible&&!document.hidden&&!reduced)frame=requestAnimationFrame(animate);};document.addEventListener('visibilitychange',visibility);if(!reduced&&!document.hidden)frame=requestAnimationFrame(animate);
   const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();});intersection.observe(container);
   dispose=()=>{cancelAnimationFrame(frame);resize.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);[ringGeometry,innerGeometry,glyphGeometry,veilGeometry,particleGeometry].forEach(g=>g.dispose());[gold,blue,veilMaterial,particleMaterial].forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  }).catch(()=>{if(alive)setFallback(true);});
  return()=>{alive=false;dispose();};
 },[]);
 function stopCamera(note='Caméra arrêtée.') {cameraTicket.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setCamera(false);setPending(false);setMessage(note);}
 useEffect(()=>{const hide=()=>{if(document.hidden)stopCamera('Caméra arrêtée lorsque l’application passe en arrière-plan.');};document.addEventListener('visibilitychange',hide);return()=>{cameraTicket.current++;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;document.removeEventListener('visibilitychange',hide);};},[]);
 useEffect(()=>{if(video.current&&stream.current){video.current.srcObject=stream.current;video.current.play().catch(()=>stopCamera('L’aperçu caméra est indisponible. Le portail reste visible.'));}},[camera]);
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){setMessage('La caméra est indisponible ici. Le portail reste visible.');return;}
  const ticket=++cameraTicket.current;setPending(true);setMessage('Autorisation caméra en attente…');
  try{const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(ticket!==cameraTicket.current||document.hidden){next.getTracks().forEach(track=>track.stop());return;}stream.current=next;setCamera(true);setPending(false);setMessage('Aperçu caméra avec portail superposé. Aucune image enregistrée ; aucun suivi spatial.');}
  catch{if(ticket===cameraTicket.current){setPending(false);setMessage('Caméra refusée ou indisponible. Tu peux utiliser le portail sans caméra.');}}
 }
 return <div className="invisible-portal">
  <div className={'invisible-portal-stage'+(opened?' is-opened':'')}>
   {camera&&<video ref={video} muted playsInline className="invisible-portal-camera" aria-label="Aperçu caméra local"/> /* gold-master-allow: transient MediaStream preview requires a video ref; shared VideoPlayer renders a saved media player. */}
   <div ref={host} className="invisible-portal-canvas" aria-hidden="true"/>
   {fallback&&<div className="invisible-portal-fallback" aria-hidden="true"><span>3B</span></div>}
   <div className="invisible-portal-label"><span>{'ROYAUME · '+(INVISIBLE_REALMS.find(item=>item.id===realm)?.name||realm).toUpperCase()}</span><strong>{opened?'Le passage est ouvert':value+' retrouve sa lumière'}</strong></div>
  </div>
  <div className="invisible-camera-tools"><Button variant="ghost" onClick={camera||pending?()=>stopCamera():startCamera}><span aria-hidden="true">{camera||pending?<CameraOff size={16}/>:<Camera size={16}/>}</span>{camera?'Arrêter la caméra':pending?'Annuler la demande':'Voir avec ma caméra'}</Button><span className="invisible-small">Superposition visuelle facultative</span></div>
  {message&&<p className="invisible-small" role="status">{message}</p>}
 </div>;
}
