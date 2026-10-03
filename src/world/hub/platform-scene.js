import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HUB_PLATFORM,platformBuilding,platformWalls,platformInteriorAt,platformPortal} from './platform-layout.js';
import plan from './data/hub-master-plan-v2.json' with {type:'json'};

/** A bounded, low-cost playable interpretation of the saved floating-city reference.
 * No raymarched clouds, reflections or asset downloads; geometry is merged by material. */
export function createHubPlatform(save){
 const root=new THREE.Group(),owned=[],cache=new Map(),collisions=[],cameraSolids=[],roofs=[],waterfalls=[],fragments=[];
 const buildings=plan.buildings.map(platformBuilding);let interior=null,daylight=1;
 const geo=g=>(owned.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,64)),sphere=geo(new THREE.IcosahedronGeometry(1,1));
 const material=(color,emissive=false)=>{const k=color+emissive;if(!cache.has(k)){const m=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.32,...(emissive?{emissive:color,emissiveIntensity:.45}:{})});cache.set(k,m);owned.push(m);}return cache.get(k);};
 const dark=material('#101c29'),stone=material('#b4b1a1'),gold=material('#d6b46a'),blue=material('#55c9ef',true),glass=material('#174963'),wood=material('#5f4939'),green=material('#315b4b'),water=material('#226684');
 function mesh(g,m,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 function ring(r,tube,y,m,arc=Math.PI*2,start=0){const o=mesh(geo(new THREE.TorusGeometry(r,tube,6,96,arc)),m,0,y,0);o.rotation.set(-Math.PI/2,0,start);return o;}
 function sign(text,x,y,z,width=8){
  if(typeof document==='undefined')return;
  const cv=document.createElement('canvas');cv.width=768;cv.height=128;const ctx=cv.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#0b1726';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#d6b46a';ctx.lineWidth=4;ctx.strokeRect(4,4,760,120);
  ctx.fillStyle='#f1e1b9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 36px sans-serif';ctx.fillText(text.toUpperCase(),384,64,730);
  const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;owned.push(map);const m=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});owned.push(m);
  const o=mesh(geo(new THREE.PlaneGeometry(width,1.35)),m,x,y,z);o.castShadow=false;
 }
 // Deep cylindrical foundation, metal buttresses and a safe continuous pedestrian deck.
 mesh(cylinder,dark,0,-13,0,168,26,168);const ground=mesh(cylinder,stone,0,-.32,0,167,.6,167);
 ring(167,.42,.2,gold);ring(160,.13,.035,blue);ring(125,.12,.035,gold);ring(37,.11,.035,gold);
 for(let i=0;i<48;i++){
  const a=i*Math.PI*2/48,x=Math.cos(a)*167,z=Math.sin(a)*167;
  const buttress=mesh(box,gold,x,-13,z,.8,25,2);buttress.rotation.y=-a;
  mesh(box,dark,x,.7,z,1,1.4,1);mesh(sphere,blue,x,1.7,z,.2);
 }
 // Eight gates on the perimeter with eight wide routes radiating from the same landmark.
 for(let i=0;i<8;i++){
  const p=platformPortal(i),a=Math.atan2(p.x,p.z);
  const walk=mesh(box,dark,p.x*.56,.006,p.z*.56,9,.04,116);walk.rotation.y=a;
  for(const side of [-1,1]){const strip=mesh(box,gold,p.x*.56+Math.cos(a)*side*4.6,.04,p.z*.56-Math.sin(a)*side*4.6,.12,.05,116);strip.rotation.y=a;}
  mesh(cylinder,dark,p.x,-.015,p.z,11,.12,11);ring(20,.05,.06,gold,Math.PI*.7,i*Math.PI/4);
 }
 // Four basins and cascades leave the radial routes and the circular promenade dry.
 for(const [x,z] of [[48,48],[-48,48],[48,-48],[-48,-48]]){
  mesh(cylinder,dark,x,-.14,z,16,.2,16);const pool=mesh(cylinder,water,x,-.015,z,14,.04,14);pool.castShadow=false;
  collisions.push({x,z,r:14.8});
  for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(box,gold,x+Math.cos(a)*15.5,.12,z+Math.sin(a)*15.5,.5,.25,.5);}
 }
 for(let i=0;i<8;i++){
  const a=(i+.5)*Math.PI/4,x=Math.cos(a)*168,z=Math.sin(a)*168;
  const fall=mesh(box,blue,x,-18,z,6,36,.25);fall.rotation.y=-a;fall.castShadow=false;waterfalls.push(fall);
 }
 // The monumental broken ring stands above its own fountain. Its eight pieces answer to progress.
 mesh(cylinder,dark,0,.4,0,19,.8,19);mesh(cylinder,water,0,.84,0,16,.06,16);collisions.push({x:0,z:0,r:19.5});
 for(const side of [-1,1]){mesh(box,dark,side*13,14,0,3,28,4);mesh(box,gold,side*13,14,2.1,.5,28,.2);}
 for(let i=0;i<8;i++){
  const piece=mesh(geo(new THREE.TorusGeometry(19,1.7,8,12,Math.PI/4-.085)),gold,0,25,0);
  piece.rotation.z=i*Math.PI/4;fragments.push(piece);
  const trim=mesh(geo(new THREE.TorusGeometry(19,.18,5,12,Math.PI/4-.085)),blue,0,25,1.8);trim.rotation.z=i*Math.PI/4;
 }
 const orb=mesh(sphere,blue,0,25,0,3.1),beam=mesh(cylinder,blue,0,22,0,.18,44,.18);beam.castShadow=false;
 sign('LE CERCLE BRISÉ',0,4,4.5,12);
 // Useful buildings are open rooms. Doorways, counters and furniture have real collision.
 for(const b of buildings){
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height,walls=platformWalls(b);
  mesh(box,dark,x,.015,z,w,.05,d);mesh(box,gold,x,.06,z+d/2,w,.12,.3);
  for(const wall of walls){mesh(box,dark,wall.x,h/2,wall.z,wall.width,h,wall.depth);collisions.push(wall);cameraSolids.push({...wall,bottom:0,top:h});}
  const roof=mesh(box,dark,x,h+.2,z,w+1,.4,d+1);roofs.push({b,roof});
  // Architectural silhouette and framing; only solid walls block the camera.
  for(const side of [-1,1]){
   mesh(box,gold,x+side*w/2,h/2,z+d/2,.35,h,.45);
   mesh(box,glass,x+side*w/2,h*.58,z,.6,h*.35,d*.52);
  }
  mesh(box,gold,x,h-.4,z+d/2,w,.25,.5);sign(b.name,x,3.6,z+d/2+.35,Math.min(12,w-1));
  const counter=mesh(box,b.buildingId==='arena_3b'?blue:wood,x,1.1,z-d/2+1,w*.5,2.2,1);
  collisions.push({x,z:z-d/2+1,width:w*.5,depth:1});counter.receiveShadow=true;
  // Shelves, benches, displays express the purpose without blocking the middle aisle.
  for(const side of [-1,1]){
   const fx=x+side*(w/2-2.1);mesh(box,wood,fx,.6,z,2,1.2,d*.38);
   for(let k=0;k<3;k++)mesh(box,k%2?gold:glass,fx,1.4+k*.45,z-1+k,1,.3,.6);
  }
  if(b.buildingId==='arena_3b'){
   const arena=mesh(geo(new THREE.TorusGeometry(7,.08,5,48)),blue,x,.08,z+2);arena.rotation.x=-Math.PI/2;
   sign('DUELS • ENTRAÎNEMENT • MULTIJOUEUR',x,5,z-d/2+.4,18);
  }
 }
 // Market, benches, lamps and compact terraces populate every route.
 for(let i=0;i<24;i++){
  const a=(i+.5)*Math.PI*2/24,r=i%2?119:80,x=Math.cos(a)*r,z=Math.sin(a)*r;
  mesh(box,dark,x,2.4,z,.3,4.8,.3);mesh(sphere,blue,x,4.9,z,.3);
  const tx=x+2,tz=z+2;mesh(cylinder,wood,tx,.85,tz,1.2,.15,1.2);mesh(cylinder,gold,tx,.4,tz,.1,.8,.1);
  mesh(box,wood,tx+2,.6,tz,1.3,.2,1);mesh(box,wood,tx+2,.3,tz,.15,.6,.15);
  collisions.push({x,z,r:.6},{x:tx,z:tz,r:1.3});
  if(i%3===0){mesh(cylinder,dark,x-3,.4,z,1.5,.8,1.5);mesh(sphere,green,x-3,1.6,z,2,1.5,2);collisions.push({x:x-3,z,r:1.5});}
 }
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const x=side*34,z=70+i*9;mesh(box,wood,x,1,z,5,2,3);mesh(box,gold,x,3,z,6,.3,4);
  for(const edge of [-1,1])mesh(box,dark,x+edge*2.5,1.5,z,.18,3,.18);
  mesh(sphere,green,x,2.3,z,.6);collisions.push({x,z,width:5,depth:3});
 }
 sign('MARCHÉ DES HÉRITAGES',0,3.5,68,16);
 // Batch static architecture by material while keeping cutaway roofs and moving effects separate.
 const dynamic=new Set([ground,...roofs.map(r=>r.roof),...fragments,orb,beam,...waterfalls]);
 root.updateMatrixWorld(true);const groups=new Map();
 for(const o of root.children)if(o.isMesh&&!dynamic.has(o)&&!o.material.map){const k=o.material.uuid;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);}
 for(const group of groups.values())if(group.length>1){
  const parts=group.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);}),merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  if(merged){const batch=mesh(geo(merged),group[0].material,0,0,0);batch.castShadow=true;group.forEach(o=>o.removeFromParent());}
 }
 const update=next=>{save=next;const count=new Set(save.seals||[]).size;for(let i=0;i<8;i++){fragments[i].position.x=i<count?0:Math.cos(i*Math.PI/4)*.55;fragments[i].position.y=25+(i<count?0:Math.sin(i*Math.PI/4)*.55);}};
 update(save);
 return {root,ground,collisions,cameraSolids,ready:Promise.resolve(),height:()=>0,
  get interior(){return interior?{id:interior.buildingId,name:interior.name}:null;},
  architectureDiagnostics:{id:'reference-floating-platform',rooms:buildings.length,portals:8},
  update,setParty(){},setQuality(mode){root.userData.quality=mode;},setWeather(){},setDaylight(value){daylight=value;blue.emissiveIntensity=.3+(1-daylight)*.3;},
  updateDistrict(camera,p){interior=platformInteriorAt(p,buildings);for(const {b,roof} of roofs)roof.visible=interior?.buildingId!==b.buildingId;},
  updateCamera(){},renderWaterReflection(){},cinematicFocus(){return false;},
  tick(time){orb.rotation.y=time*.18;orb.position.y=25+Math.sin(time*.8)*.3;for(const [i,fall] of waterfalls.entries())fall.scale.y=36+Math.sin(time*1.6+i)*.5;},
  dispose(){root.removeFromParent();for(const asset of owned)asset.dispose();},
 };
}
