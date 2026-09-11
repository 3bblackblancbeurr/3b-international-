import * as THREE from 'three';
import {randomFor} from './terrain.js';

const UP=new THREE.Vector3(0,1,0);
export const FLORA_TYPES=['Tree','Olive','Pine','Cypress','Palm','Shrub'];
export const FLORA_PALETTES={
 hub:['#386941','#6e994e','#a3b968'],france:['#38643b','#648e48','#a2b45b'],
 italie:['#405f35','#728547','#a4ad6e'],estonie:['#294e42','#497258','#799471'],
 turquie:['#4f6642','#86955b','#b5b281'],algerie:['#466950','#839459','#b6ad72'],
 tunisie:['#496b52','#819770','#b7bd8a'],maroc:['#426953','#7b9060','#b9ac79'],espagne:['#536d4b','#8b9a70','#b9bd88'],
};

// Real silhouettes made of tapered branches and folded leaves, without opaque
// crown spheres or transparent billboards. Each species is shared by instances.
export function createPlantGeometry(type='Tree',seed=1,palette=FLORA_PALETTES.hub){
 const rng=randomFor(seed),wood=[],leaves=[],woodColors=[],leafColors=[],flex=[];
 const greens=palette.map(c=>new THREE.Color(c)),bark=new THREE.Color(type==='Olive'?'#847766':'#796047');
 const point=(x,y,z)=>new THREE.Vector3(x,y,z),tint=new THREE.Color();
 function triangle(target,colors,a,b,c,color,weights){for(const p of [a,b,c]){target.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b);if(weights)flex.push(weights);}}
 function branch(a,b,r0,r1){
  const axis=b.clone().sub(a).normalize(),side=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)>.95?point(1,0,0):UP).normalize(),front=new THREE.Vector3().crossVectors(axis,side);
  for(let i=0;i<7;i++){
   const p=(base,r,n)=>base.clone().addScaledVector(side,Math.cos(n/7*Math.PI*2)*r).addScaledVector(front,Math.sin(n/7*Math.PI*2)*r);
   const a0=p(a,r0,i),a1=p(a,r0,i+1),b0=p(b,r1,i),b1=p(b,r1,i+1);tint.copy(bark).multiplyScalar(.78+rng()*.42);
   triangle(wood,woodColors,a0,b0,a1,tint);triangle(wood,woodColors,a1,b0,b1,tint);
  }
 }
 function leaf(center,length,width,yaw,tilt,roll,color,weight=1){
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,yaw,roll));
  const v=(x,y,z)=>point(x,y,z).applyQuaternion(q).add(center);
  const a=v(0,-length/2,0),b=v(-width/2,0,0),c=v(0,0,width*.16),d=v(width/2,0,0),e=v(0,length/2,0);
  for(const t of [[a,c,b],[a,d,c],[b,c,e],[c,d,e]])triangle(leaves,leafColors,...t,color,weight);
 }
 function crown(center,rx,ry,rz,count,leafLength=.5,narrow=false){
  for(let i=0;i<count;i++){
   const a=rng()*Math.PI*2,h=rng()*2-1,r=Math.sqrt(1-h*h)*Math.cbrt(rng());
   const p=center.clone().add(point(Math.cos(a)*rx*r,h*ry,Math.sin(a)*rz*r));
   tint.copy(greens[Math.floor(rng()*greens.length)]).multiplyScalar(.87+rng()*.2);
   leaf(p,leafLength*(.7+rng()*.65),leafLength*(narrow?.23:.57),a,rng()*2.3-.6,rng()*Math.PI*2,tint,.4+p.y*.055);
  }
 }
 if(type==='Tree'||type==='Olive'){
  const olive=type==='Olive',h=olive?4.8:7.8,trunk=[point(0,0,0),point(-.15,h*.23,.1),point(.12,h*.48,0),point(-.15,h*.75,.12),point(.02,h,0)];
  for(let i=1;i<trunk.length;i++)branch(trunk[i-1],trunk[i],(olive?.4:.34)*(1-(i-1)*.2),.3*(1-i*.2));
  for(let i=0;i<11;i++){
   const a=i*2.399+seed,h0=h*(.29+i*.034),reach=(olive?2.3:2.65)*(1-i*.034),end=point(Math.cos(a)*reach,h0+h*.24+rng()*.7,Math.sin(a)*reach),fork=point(end.x*.55,h0+h*.12,end.z*.55);
   branch(point(0,h0,0),fork,.15,.075);branch(fork,end,.075,.018);
   for(const side of [-1,1]){const tip=end.clone().add(point(Math.cos(a+side)*.55,.4,Math.sin(a+side)*.55));branch(fork,tip,.045,.01);crown(tip,olive?1.05:1.25,olive?.62:.95,olive?1:1.15,olive?35:42,olive?.43:.59,olive);}
  }
  crown(trunk.at(-1),1.15,.8,1.15,75,olive?.45:.6,olive);
 }else if(type==='Pine'||type==='Cypress'){
  const pine=type==='Pine',h=pine?10:9;branch(point(0,0,0),point(.1,h,0),.3,.035);
  for(let row=0;row<7;row++)for(let i=0;i<(pine?7:5);i++){
   const a=i*2.399+row*.7,y=2.5+row*.86,r=(pine?2.9:1.05)*(1-row*.105),tip=point(Math.cos(a)*r,y+.3,Math.sin(a)*r);
   branch(point(0,y-.25,0),tip,.07*(1-row*.08),.01);
   crown(tip,pine?.82:.44,pine?.33:.78,pine?.82:.44,pine?27:21,pine?.36:.47,true);
  }
  crown(point(0,h-.3,0),.5,1,.5,45,.45,true);
 }else if(type==='Palm'){
  const h=7.2,at=t=>point(Math.sin(t*1.5)*.5,t*h,Math.sin(t*.8)*.23);
  for(let i=0;i<14;i++){const a=at(i/14),b=at((i+1)/14);branch(a,b,.27-i*.006,.255-i*.006);}
  const top=at(1);
  for(let i=0;i<11;i++){
   const a=i/11*Math.PI*2,dir=point(Math.cos(a),0,Math.sin(a)),side=point(-dir.z,0,dir.x),curve=t=>top.clone().addScaledVector(dir,t*3.7).add(point(0,Math.sin(t*Math.PI)*1.12-t*.95,0));
   for(let n=1;n<=9;n++){
    const t=n/10,p=curve(t);branch(curve((n-1)/10),p,.042*(1-t)+.009,.028*(1-t)+.004);
    for(const sign of [-1,1]){
     const length=Math.sin(t*Math.PI)*1.3+.22,tip=p.clone().addScaledVector(side,sign*length*.53).addScaledVector(dir,.15);tint.copy(greens[(n+i)%3]);
     leaf(tip,length,.18,a+sign*Math.PI/2,Math.PI/2+.18+t*.25,0,tint,.5+t*.55);
    }
   }
  }
 }else{
  for(let i=0;i<7;i++){const a=i*2.399,end=point(Math.cos(a)*.55,.55+rng()*.45,Math.sin(a)*.55);branch(point(0,0,0),end,.025,.007);crown(end,.45,.36,.4,12,.28,type==='Shrub'&&seed%2===0);}
 }
 function geometry(vertices,colors,weights){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(weights)g.setAttribute('plantFlex',new THREE.Float32BufferAttribute(weights,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
 return {wood:geometry(wood,woodColors),leaves:geometry(leaves,leafColors,flex)};
}

function windShader(material,time){
 material.onBeforeCompile=shader=>{
  shader.uniforms.floraTime=time;
  shader.vertexShader='uniform float floraTime; attribute float plantFlex;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec4 plantWorld=vec4(position,1.);
   #ifdef USE_INSTANCING
    plantWorld=instanceMatrix*plantWorld;
   #endif
   plantWorld=modelMatrix*plantWorld;
   float gust=sin(floraTime*.95+plantWorld.x*.18+plantWorld.z*.14);
   transformed.x+=gust*plantFlex*.085;
   transformed.z+=sin(floraTime*1.2+plantWorld.z*.23)*plantFlex*.045;`);
 };
 material.customProgramCacheKey=()=> '3b-folded-foliage-1';
}

export function createFlora(region,seed=1,occlusion){
 const geometries=new Map(),batches=new Map(),instances=[],dummy=new THREE.Object3D(),time={value:0};
 const wood=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 const leaves=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,side:THREE.DoubleSide});
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});windShader(leaves,time);windShader(depth,time);
 occlusion?.apply(wood);occlusion?.apply(leaves);
 function plant(type,x,y,z,scale=1,rotation=0,parent){
  if(!FLORA_TYPES.includes(type))return null;
  if(!geometries.has(type))geometries.set(type,createPlantGeometry(type,seed+FLORA_TYPES.indexOf(type)*19,FLORA_PALETTES[region]||FLORA_PALETTES.hub));
  if(!batches.has(parent))batches.set(parent,new Map());const group=batches.get(parent);
  if(!group.has(type)){
   const parts=['wood','leaves'].map((part,i)=>{const m=new THREE.InstancedMesh(geometries.get(type)[part],i?leaves:wood,1024);m.name='flora-'+type+'-'+part;m.count=0;m.castShadow=true;m.receiveShadow=true;if(i)m.customDepthMaterial=depth;parent.add(m);instances.push(m);return m;});group.set(type,parts);
  }
  dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.setScalar(scale);dummy.updateMatrix();
  for(const mesh of group.get(type)){if(mesh.count>=1024)throw Error('Vegetation instance budget exceeded');mesh.setMatrixAt(mesh.count++,dummy.matrix);mesh.instanceMatrix.needsUpdate=true;}
  return group.get(type)[0];
 }
 return {plant,finish(){for(const m of instances){m.computeBoundingSphere();m.boundingSphere.radius+=.3;}},tick(t){time.value=t;},dispose(){for(const m of instances)m.dispose();for(const g of geometries.values()){g.wood.dispose();g.leaves.dispose();}wood.dispose();leaves.dispose();depth.dispose();},instances};
}
