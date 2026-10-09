import React, {useEffect, useRef, useState} from 'react';
import {Camera} from 'lucide-react';
import {Button} from '../../design-system/index.jsx';
import {goldMasterTokens, worldArtMaterials} from '../../design-system/tokens.js';
import {INVISIBLE_REALMS} from './catalog.js';

export default function InvisiblePortal({opened,realm='france',value='Justice',onExplore}) {
 const host=useRef(null),[fallback,setFallback]=useState(false);
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
 return <div className="invisible-portal">
  <div className={'invisible-portal-stage'+(opened?' is-opened':'')}>
   <div ref={host} className="invisible-portal-canvas" aria-hidden="true"/>
   {fallback&&<div className="invisible-portal-fallback" aria-hidden="true"><span>3B</span></div>}
   <div className="invisible-portal-label"><span>{'ROYAUME · '+(INVISIBLE_REALMS.find(item=>item.id===realm)?.name||realm).toUpperCase()}</span><strong>{opened?'Le passage est ouvert':value+' retrouve sa lumière'}</strong></div>
  </div>
  <div className="invisible-camera-tools"><Button data-testid="portal-explore-world" variant="ghost" onClick={onExplore} disabled={!onExplore}><Camera size={16} aria-hidden="true"/>Voir avec ma caméra</Button><span className="invisible-small">Ouvrir le monde en plein écran</span></div>
 </div>;
}
