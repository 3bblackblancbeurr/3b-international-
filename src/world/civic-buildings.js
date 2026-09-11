import * as THREE from 'three';
import {REGIONS} from './settlements.js';

// 3B public architecture frames existing playable services. Ground-level
// entrances remain outside solid footprints; the workshop courtyard is open.
export function addCivicBuildings({region,field,root,shape,box,cylinder,geo,mat,owned,occlusion}){
 const trim=mat('#e4d8c0'),stone=mat(REGIONS[region].paving),glass=mat('#36565e',{metalness:.32,roughness:.25}),gold=mat('#c4a76e',{metalness:.65,roughness:.38}),light=mat('#f0d6a0',{emissive:'#f0d6a0',emissiveIntensity:.45});
 for(const m of [trim,stone,glass,gold,light])occlusion.apply(m);
 const b=(material,x,y,z,w,h,d)=>shape(box,material,x,y,z,w,h,d);
 function sign(label,x,y,z,width){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#17333b';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#cbb383';ctx.lineWidth=3;ctx.strokeRect(7,7,498,114);ctx.fillStyle='#f5e9d4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 45px sans-serif';ctx.fillText(label,256,65,465);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;owned.push(texture);const material=new THREE.MeshStandardMaterial({map:texture,roughness:.55});occlusion.apply(material);owned.push(material);shape(geo(new THREE.PlaneGeometry(width,width/4)),material,x,y,z);
 }
 for(const s of field.civic){const {x,z,width:w,depth:d}=s,y=field.height(x,z),h=s.kind==='archives'?17:8.3;
  b(stone,x,y+h/2,z,w,h,d);b(trim,x,y+.24,z,w+.25,.48,d+.25);
  const front=z+d/2;
  // Deep window reveals, continuous glazed strips and external fins create a
  // contemporary service facade distinct from surrounding heritage homes.
  for(let floor=0;floor<(s.kind==='archives'?3:1);floor++){
   const yy=y+2.8+floor*5.3;b(glass,x,yy,front+.1,w-.85,3.8,.18);
   for(let i=0;i<Math.floor(w/1.5);i++)b(trim,x-w/2+.55+i*1.5,yy,front+.28,.1,4,.25);
   b(gold,x,yy-2.03,front+.35,w-.4,.1,.2);
  }
  for(const side of [-1,1])b(trim,x+side*(w/2-.22),y+h/2,front+.3,.35,h,.7);
  b(trim,x,y+h,z,w+.75,.45,d+.8);b(gold,x,y+h+.27,front,w+.7,.12,.25);
  if(s.kind==='archives'){
   if(['france','italie','estonie','turquie','espagne'].includes(region)){
    const roofMaterial=mat(region==='france'?'#455b70':region==='turquie'?'#8d6757':'#a76149');occlusion.apply(roofMaterial);
    const roof=geo(new THREE.CylinderGeometry(region==='estonie'?0:.55,1,1,4));roof.rotateY(Math.PI/4);
    shape(roof,roofMaterial,x,y+h+2.3,z,(w+1)/Math.SQRT2,4.2,(d+1)/Math.SQRT2);
    if(region==='france')for(const dx of [-4,0,4]){b(trim,x+dx,y+h+1.6,front-.4,1.8,2.2,1.6);b(glass,x+dx,y+h+1.6,front+.45,1.2,1.5,.12);}
   }else{
    for(const side of [-1,1])b(trim,x+side*(w/2-.1),y+h+.8,z,.3,1.4,d);
    for(const dz of [-d/2,d/2])b(trim,x,y+h+.8,z+dz,w,1.4,.3);
    const dome=geo(new THREE.SphereGeometry(1,20,10,0,Math.PI*2,0,Math.PI/2));shape(dome,region==='tunisie'?trim:glass,x,y+h+.3,z,3,2.4,3);
    const screen=mat(region==='tunisie'?'#24769c':region==='maroc'?'#54776b':'#597974');occlusion.apply(screen);
    for(const dx of [-4,0,4])for(let j=0;j<6;j++){const tile=b(screen,x+dx,y+2+j*.72,front+.38,.55,.55,.1);tile.rotation.z=Math.PI/4;}
   }
   for(const xx of [-5.5,5.5])b(trim,x+xx,y+3.4,front+1.4,.55,6.8,.55);
   b(trim,x,y+6.95,front+1.1,w+.1,.35,3);sign('3B · MÉMOIRES',x,y+7.85,front+.39,10);
   for(const xx of [-4.7,4.7])b(light,x+xx,y+4.6,front+.4,.12,2.3,.08);
  }else{
   b(trim,x,y+6.5,front+1.1,w+.7,.24,2.6);
   for(const xx of [-1.2,1.2]){b(gold,x+xx,y+2.8,front+.43,.08,4.3,.08);}
  }
 }
 for(const a of field.anchors.filter(a=>a.type==='atelier'&&field.civic.some(s=>s.anchor===a))){
  const y=field.height(a.x,a.z);b(trim,a.x,y+8.25,a.z-4,21,.6,2.3);sign('3B · ATELIER',a.x,y+8.25,a.z-2.82,9);
  for(const side of [-1,1]){b(gold,a.x+side*5.45,y+3.75,a.z-3,.16,7.5,.16);b(light,a.x+side*5.3,y+5.8,a.z-2.8,.13,2,.13);}
 }
}
