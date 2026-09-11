import * as THREE from 'three';
import {surfaceTexture} from './surfaces.js';
import {buildingDimensions} from './building-scale.js';

// Human-scale regional facades. Geometry and materials are shared, then batched.
export function createArchitecture(occlusion){
 const geometries=[],materials=new Map(),plaster=surfaceTexture('plaster');
 const geo=g=>(geometries.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,12));
 const dome=geo(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2));
 const hip=geo(new THREE.CylinderGeometry(.6,1,1,4));hip.rotateY(Math.PI/4);
 const gable=geo(new THREE.CylinderGeometry(0,1,1,4));gable.rotateY(Math.PI/4);
 const archShape=new THREE.Shape();archShape.moveTo(-.5,0);archShape.lineTo(-.5,.68);archShape.absarc(0,.68,.5,Math.PI,0,true);archShape.lineTo(.5,0);archShape.closePath();
 const arch=geo(new THREE.ShapeGeometry(archShape)),ring=geo(new THREE.TorusGeometry(1,.07,5,28,Math.PI*1.7));
 const material=(color,metal=0)=>{const key=color+metal;if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color,map:metal?null:plaster,bumpMap:metal?null:plaster,bumpScale:.035,roughness:metal?.4:.86,metalness:metal});occlusion?.apply(m);materials.set(key,m);}return materials.get(key);};
 const styles={
  france:[['#e3d6be','#cbbda4','#ddd9ce'],'#4b5968','#354756','#f5e9d3'],
  italie:[['#e3bd90','#d5aa8d','#e3caab'],'#a86647','#596648','#f0d9b3'],
  estonie:[['#e3d3b5','#d1b19e','#bed0cc'],'#9c5546','#547473','#f0e5ce'],
  turquie:[['#d8baa3','#dfc9ae','#c3b2a3'],'#9c6650','#58767c','#f2e1c9'],
  algerie:[['#f0e6d0','#e9e4d8','#d9dbce'],'#d0c6b0','#486f6a','#fff0d6'],
  tunisie:[['#f7f1df','#eae8d9','#f4e9d5'],'#e7d5b0','#2374a0','#fff9e7'],
  maroc:[['#d3a07f','#c78b70','#dfa98d'],'#ad7b59','#456f63','#eed0a3'],
  espagne:[['#e9d5b1','#e5c697','#f0e3c6'],'#ac6347','#486e62','#fff0d0'],
 };
 function building(region,variant=0,{urban=true}={}){
  const [walls,top,wood,trim]=styles[region]||styles.france,wall=walls[variant%walls.length],d=buildingDimensions(region,variant,urban),{width:w,depth,height:h,storey,floors}=d;
  const g=new THREE.Group();g.userData.dimensions=d;
  function m(geometry,color,x,y,z,sx=1,sy=sx,sz=sx,parent=g,metal=0){const o=new THREE.Mesh(geometry,material(color,metal));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  const b=(color,x,y,z,sx,sy,sz,parent=g,metal=0)=>m(box,color,x,y,z,sx,sy,sz,parent,metal);
  b(wall,0,h/2,0,w,h,depth);b(trim,0,.25,0,w+.3,.5,depth+.3);
  for(let floor=1;floor<=floors;floor++)b(trim,0,storey*floor,0,w+.55,.25,depth+.5);
  for(let face=0;face<4;face++){
   const front=new THREE.Group();front.rotation.y=face*Math.PI/2;g.add(front);
   const span=face%2?depth:w,z=(face%2?w:depth)/2;
   for(let floor=0;floor<floors;floor++)for(const x of [-span*.32,0,span*.32]){
    if(face===0&&floor===0&&x===0)continue;
    const y=storey*floor+2.8;
    b(trim,x,y,z+.07,2.15,3.25,.18,front);b(wood,x,y,z+.19,1.8,2.95,.08,front);
    b('#718e95',x,y+.25,z+.24,1.4,2.05,.06,front);b(trim,x,y,z+.29,.09,2.9,.08,front);b(trim,x,y-.25,z+.29,1.8,.1,.08,front);
    b(trim,x,y-1.72,z+.24,2.4,.22,.6,front);
    if(['italie','espagne','estonie','tunisie'].includes(region))for(const side of [-1,1]){b(wood,x+side*1.23,y,z+.24,.46,3.15,.13,front);for(let j=0;j<5;j++)b(trim,x+side*1.23,y-1+j*.48,z+.32,.4,.035,.045,front);}
    if(floor>0&&face===0&&['france','turquie','espagne'].includes(region)){
     b(trim,x,y-1.72,z+.67,2.65,.2,1.3,front);
     for(let j=0;j<6;j++)b('#344445',x-1.1+j*.44,y-1,z+1.2,.065,1.2,.08,front,.45);
     b('#b89e67',x,y-.4,z+1.2,2.5,.08,.1,front,.4);
    }
   }
   for(const side of [-1,1])b(trim,side*(span/2-.22),h/2,z+.12,.4,h,.25,front);
  }
  // Even rural doors are taller than a standing avatar, with unchanged scale.
  m(arch,trim,0,.05,depth/2+.3,3.2,4.45,1);
  m(arch,wood,0,.05,depth/2+.34,d.doorWidth,d.doorHeight/1.18,1);
  b('#d4b778',.65,2.2,depth/2+.4,.1,.45,.08,g,.65);
  for(const x of [-.78,.78])b('#bfa575',x,1.9,depth/2+.41,.04,3.3,.03,g,.4);
  if(['maroc','algerie','tunisie'].includes(region)){
   b(top,0,h+.18,0,w+.5,.36,depth+.5);
   for(const x of [-w/2,w/2])b(wall,x,h+.85,0,.35,1.4,depth+.35);
   for(const z of [-depth/2,depth/2])b(wall,0,h+.85,z,w,1.4,.35);
   if(region==='maroc')for(let i=0;i<9;i++)b(trim,-w/2+i*w/8,h+1.65,depth/2,.55,.35,.45);
   if(region==='algerie'||region==='tunisie'){const shade=b('#c9ae81',-2,h+1.7,-1,4.5,.14,4.8);shade.rotation.z=.06;for(const x of [-4.2,.2])m(cylinder,wood,x,h+.8,-1,.09,1.8,.09);}
   if(region==='tunisie'&&variant%5===0)m(dome,trim,2,h+.35,-1,2.1,2.4,2.1);
  }else{
   m(region==='estonie'?gable:hip,top,0,h+1.9,0,(w+1.1)/Math.SQRT2,3.8,(depth+1.1)/Math.SQRT2);
   if(region==='france'){b(top,0,h+3.82,0,w*.6,.15,depth*.6);for(const x of [-3.8,0,3.8]){b(wall,x,h+1.5,depth/2-.55,1.7,2.1,1.2);b(wood,x,h+1.5,depth/2+.1,1.1,1.5,.1);b(trim,x,h+2.6,depth/2-.35,2,.18,1.6);}}
   if(region==='estonie')for(const side of [-1,1])m(gable,wall,0,h+1.5,side*(depth/2-.15),w/Math.SQRT2,3.4,.28);
   if(region==='turquie'&&variant%4===0)m(dome,'#7b9694',0,h+1.9,0,3.6,3.5,3.6);
   b(wall,3.3,h+2.2,-1.8,.85,3.6,.9);b(trim,3.3,h+4.05,-1.8,1.1,.24,1.2);
   if(['italie','espagne','turquie'].includes(region))for(let i=0;i<18;i++)m(cylinder,'#b97951',-w/2+i*w/17,h+.2,depth/2+.2,.18,.65,.18).rotation.x=Math.PI/2;
  }
  if(urban){
   const z=depth/2;
   b('#283e42',-3.8,2.1,z+.3,2.7,3.7,.15);b('#90a9a5',-3.8,2.5,z+.4,2.2,2.3,.07);
   const awning=b([wood,'#8b5550','#c3aa74'][variant%3],-3.3,5.1,z+1.2,4.9,.18,2.7);awning.rotation.x=.08;
   b(trim,-3.3,5.7,z+.3,4.4,.72,.15);
   for(let j=0;j<8;j++)b(variant%2?trim:'#d4b982',-5.35+j*.57,5.05,z+2.5,.27,.2,.13);
   // The Broken Circle is a manga symbol, never a substitute for the 3B logo.
   const emblem=m(ring,'#d3b26b',3.9,4.9,z+.38,.62,.62,.62,g,.55);emblem.rotation.z=.3;
   b('#1e3944',3.9,3.7,z+.24,1.15,3.6,.16);b('#80ccdd',3.9,2.8,z+.36,.12,.55,.04,g,.15);
   if(variant%3===0)for(const side of [-1,1]){m(cylinder,top,side*5.1,.7,z+1.2,.58,1.4,.58);m(dome,'#6d8760',side*5.1,1.35,z+1.2,.9,1.1,.9);}
  }
  return g;
 }
 return{building,dispose(){plaster?.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
