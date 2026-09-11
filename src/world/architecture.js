import * as THREE from 'three';
import {surfaceTexture} from './surfaces.js';

// Regional silhouettes and construction details, shared then batched by material.
export function createArchitecture(){
 const geometries=[],materials=new Map(),plaster=surfaceTexture('plaster');
 const geo=g=>(geometries.push(g),g);
 const box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,16));
 const sphere=geo(new THREE.SphereGeometry(1,20,12)),roof=geo(new THREE.ConeGeometry(1,1,4));
 const archShape=new THREE.Shape();archShape.moveTo(-.65,0);archShape.lineTo(-.65,1);archShape.absarc(0,1,.65,Math.PI,0,true);archShape.lineTo(.65,0);archShape.closePath();
 const arch=geo(new THREE.ShapeGeometry(archShape));
 const material=(color,metalness=0)=>{const key=color+metalness;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,map:metalness?null:plaster,bumpMap:metalness?null:plaster,bumpScale:.045,roughness:metalness?.38:.88,metalness}));return materials.get(key);};
 const styles={
  france:['#d9d1b9','#536477','#344e60','#eeead7'],italie:['#c9ad78','#9e634d','#49604f','#e3d3af'],
  estonie:['#745c45','#354c4b','#b4d2c4','#a8aca0'],turquie:['#cbbfac','#899695','#407b88','#e3d6b9'],
  algerie:['#c9b68b','#a78c61','#416f61','#ece0bb'],tunisie:['#e3e3cf','#d5d6c7','#366988','#f6efdb'],
  maroc:['#b48563','#92674c','#57877e','#d9b887'],espagne:['#cbb581','#a6684e','#566c66','#e5d5b0'],
 };
 function building(region,variant=0,{urban=true}={}){
  let [wall,top,wood,trim]=styles[region]||styles.france;const g=new THREE.Group();
  if(region==='algerie')wall=urban?['#ebe2cd','#d7d9c7','#e0d8c4'][variant%3]:'#c1a78b';
  if(region==='estonie'&&urban){wall=['#e0d2b1','#b9c5be','#d3b9a5','#d2c18e'][variant%4];top='#906754';}
  if(region==='italie')wall=['#d8bc91','#c8a288','#dcc8a1','#bd9f84'][variant%4];
  if(region==='maroc')wall=['#c89779','#b78069','#d4a48b'][variant%3];
  if(region==='turquie'&&variant%5!==0){wall=['#c6b39c','#b79888','#c2c4b1'][variant%3];top='#936c57';}
  function m(geometry,color,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(geometry,material(color));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
  const b=(color,x,y,z,sx,sy,sz)=>m(box,color,x,y,z,sx,sy,sz);
  const h=(region==='france'?6.2:region==='maroc'?5.8:region==='estonie'?5.4:4.6)*(urban?(variant%3===0?1.22:1):.78);
  b(wall,0,h/2,0,7,h,5.5);b(trim,0,.2,0,7.5,.4,6);
  const door=m(arch,wood,0,0,2.77,1.2,1.5,1);door.castShadow=false;
  for(const x of [-2.2,2.2])for(const y of region==='france'?[1.8,4.5]:[2.5]){
   b(trim,x,y,2.8,1.25,1.65,.14);b(wood,x,y,2.9,.94,1.36,.1);b(trim,x,y,2.99,.07,1.4,.08);
   if(region==='france'||region==='italie'||region==='espagne'){b(wood,x-.7,y,2.87,.27,1.65,.12);b(wood,x+.7,y,2.87,.27,1.65,.12);}
  }
  // Windows on the rear and sides keep villages readable from every camera.
  for(const y of region==='france'?[1.8,4.5]:[2.5]){
   for(const x of [-2.2,2.2]){b(trim,x,y,-2.8,1.22,1.6,.12);b(wood,x,y,-2.9,.9,1.3,.08);b(trim,x,y,-2.96,.06,1.3,.06);}
   for(const side of [-1,1])for(const z of [-1.5,1.4]){b(trim,side*3.55,y,z,.12,1.6,1.1);b(wood,side*3.63,y,z,.08,1.3,.82);}
  }
  if(['france','italie','estonie','espagne'].includes(region)||(region==='turquie'&&variant%5!==0)||(region==='algerie'&&!urban)){
   const r=m(roof,top,0,h+1.35,0,5.5,2.7,4.5);r.rotation.y=Math.PI/4;
   b(trim,0,h+.07,0,7.5,.24,6);
   b(wall,2.3,h+1.8,-1.1,.6,2.2,.7);
   if(region==='france'){for(const x of [-2,0,2]){b(wall,x,h+1.0,2.05,.75,1.1,.65);b(wood,x,h+1.0,2.4,.46,.67,.08);}for(const y of [3.6,5.8])b(trim,0,y,2.87,7.2,.18,.22);}
   if(region==='estonie'){if(!urban)for(let i=1;i<8;i++)b('#493d34',0,i*.49,2.84,7,.045,.09);else{b(trim,0,h-1.2,2.85,7.15,.15,.16);const peak=m(roof,wall,0,h+.9,2.75,3,1.9,.2);peak.rotation.y=Math.PI/4;}for(const x of [-3.3,3.3])b(trim,x,h/2,2.87,.18,h,.12);}
   if(region==='italie'||region==='espagne'){for(let i=0;i<12;i++){const x=-3.7+i*.67;const tile=b('#b17d57',x,h+.1,2.6,.23,.19,.6);tile.rotation.x=.2;}for(const x of [-2.2,2.2]){b(top,x,1.43,3.1,1.7,.24,.6);b('#5c734d',x,1.7,3.1,1.3,.35,.45);}}
  }else{
   b(top,0,h+.1,0,7.45,.3,5.9);
   for(const x of [-3.5,3.5])b(wall,x,h+.6,0,.3,1.1,5.9);for(const z of [-2.8,2.8])b(wall,0,h+.6,z,7,1.1,.3);
   if(region==='turquie'||region==='tunisie'&&variant%7===0){m(sphere,top,0,h+.12,-.2,2.45,2.4,2.45);m(cylinder,trim,0,h+2.5,-.2,.14,.7,.14);m(sphere,'#c2ad70',0,h+2.9,-.2,.2);}
   if(region==='maroc'||region==='algerie'){if(variant%6===0)for(const x of [-3.3,3.3]){b(wall,x,h/2+.35,-1,1.0,h+.7,2);for(let i=0;i<3;i++)b(trim,x-.4+i*.4,h+.9,-1,.21,.35,2);}for(const x of [-2.2,0,2.2])m(arch,wood,x,.2,2.9,1.05,1.3,1);}
  }
  if(region==='tunisie'){b(wood,0,h-.14,2.87,7.2,.23,.17);for(const x of [-2.2,2.2]){b(wood,x,1.6,3.1,1.6,.22,.5);b('#72955f',x,1.86,3.1,1.2,.35,.3);}m(arch,wood,0,.1,2.95,1.3,1.55,1);}
  if(variant%2&&region!=='estonie'){for(const x of [-3,3])m(cylinder,trim,x,1.9,4.4,.17,3.8,.17);b(top,0,3.9,3.9,7.2,.16,3.1);}
  if(urban&&['france','italie','turquie','espagne'].includes(region)){const y=h*.63;b(trim,0,y,3,5.6,.2,.7);for(let i=0;i<12;i++)b('#465454',-2.55+i*.46,y+.48,3.36,.045,.9,.05);b('#465454',0,y+.92,3.36,5.6,.07,.06);}
  if(urban&&variant%3===0){const awning=b(['#7b9894','#b28668','#b4a478'][variant%3],0,2.8,3.5,3.3,.12,1.6);awning.rotation.x=-.12;b(trim,0,3.22,2.97,2.8,.45,.15);for(const x of [-1.2,1.2])m(cylinder,wood,x,.5,3.8,.35,1,.35);}
  if(!urban){b(wood,0,1,3.1,2,1.8,.15);for(const x of [-2.5,2.5])m(cylinder,wood,x,.45,3.6,.42,.9,.42);}
  return g;
 }
 return{building,dispose(){plaster?.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
