import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HUB_PLATFORM,HUB_SCALE,platformBuilding,platformWalls,platformInteriorAt,platformPortal} from './platform-layout.js';
import {addPlatformArchitecture} from './platform-architecture.js';
import {addCiteTerraces,terraceWorldHeight,terraceAisle} from './terraces.js';
import {citeWaterfallMaterial} from './waterfall-material.js';
import {CITE_ISLANDS,CITE_BRIDGES,citeSurfaceDistance} from './platform-topology.js';
import {createPremiumWater} from '../premium-water.js';
import {addReferenceCiteDetails} from './reference-details.js';
import {hubPublicPlaces,platformWorldState,HUB_VALUES} from './platform-life.js';
import plan from './data/hub-master-plan-v2.json' with {type:'json'};

/** A bounded, low-cost playable interpretation of the saved floating-city reference.
 * No raymarched clouds, reflections or asset downloads; geometry is merged by material. */
export function createHubPlatform(save){
 const root=new THREE.Group(),owned=[],cache=new Map(),collisions=[],cameraSolids=[],roofs=[],waterfalls=[],fragments=[];
 const worldBuildings=plan.buildings.map(platformBuilding),buildings=worldBuildings.map(b=>({...b,buildingX:b.buildingX/HUB_SCALE,buildingZ:b.buildingZ/HUB_SCALE,width:b.width/HUB_SCALE,depth:b.depth/HUB_SCALE,height:b.height/1.5}));let interior=null,daylight=1;
 const geo=g=>(owned.push(g),g),box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,64)),sphere=geo(new THREE.IcosahedronGeometry(1,1));
 const material=(color,emissive=false)=>{const k=color+emissive;if(!cache.has(k)){const m=new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.32,...(emissive?{emissive:color,emissiveIntensity:.45}:{})});cache.set(k,m);owned.push(m);}return cache.get(k);};
 const poolWater=createPremiumWater({region:'hub',lake:{x:0,z:0,r:16},owned});poolWater.setQuality('medium',{allowPlanarReflection:false});
 const dark=material('#101c29'),stone=material('#b4b1a1'),gold=material('#d6b46a'),blue=material('#55c9ef',true),glass=material('#174963'),wood=material('#5f4939'),green=material('#315b4b'),water=poolWater.material;
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
 // Each visible island and bridge is also part of the walkable collision surface.
 const deckParts=[],fallMaterial=citeWaterfallMaterial();owned.push(fallMaterial);
 for(const island of CITE_ISLANDS){
  mesh(cylinder,dark,island.x,-8,island.z,island.r,16,island.r);
  for(let k=0;k<12;k++){const a=k*Math.PI/6;const rock=mesh(sphere,dark,island.x+Math.cos(a)*(island.r-2),-16-k%3,island.z+Math.sin(a)*(island.r-2),5,12+k%4,6);rock.rotation.y=a;}
  const top=new THREE.CircleGeometry(island.r,64);top.rotateX(-Math.PI/2);top.translate(island.x,0,island.z);deckParts.push(top);
  const trim=mesh(geo(new THREE.TorusGeometry(island.r,.16,5,64)),gold,island.x,.08,island.z);trim.rotation.x=-Math.PI/2;
 }
 for(const bridge of CITE_BRIDGES){
  const top=new THREE.PlaneGeometry(bridge.length,bridge.width);top.rotateX(-Math.PI/2);top.rotateY(-bridge.angle);top.translate(bridge.x,0,bridge.z);deckParts.push(top);
  const deck=mesh(box,dark,bridge.x,-.4,bridge.z,bridge.length,.8,bridge.width);deck.rotation.y=-bridge.angle;
  for(const side of [-1,1]){const dx=-Math.sin(bridge.angle)*side*5.85,dz=Math.cos(bridge.angle)*side*5.85;const rail=mesh(box,gold,bridge.x+dx,1,bridge.z+dz,bridge.length,.1,.12);rail.rotation.y=-bridge.angle;}
 }
 const promenade=new THREE.RingGeometry(119,131,128);promenade.rotateX(-Math.PI/2);deckParts.push(promenade);
 deckParts.push(...addCiteTerraces({mesh,geo,box,materials:{dark,gold,blue},collisions,sign}));
 const ground=mesh(geo(mergeGeometries(deckParts)),stone,0,0,0);deckParts.forEach(g=>g.dispose());ground.castShadow=false;
 ring(119,.14,.08,gold);ring(131,.14,.08,gold);ring(125,.06,.09,blue);
 collisions.push({id:'cite-water-boundary',surfaceDistance:p=>-citeSurfaceDistance(p.x/HUB_SCALE,p.z/HUB_SCALE)*HUB_SCALE});
 const seaLake={x:0,z:0,r:245},seaWater=createPremiumWater({region:'hub',lake:seaLake,owned});
 const sea=mesh(geo(new THREE.CircleGeometry(247,128)),seaWater.material,0,-18,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
 const mist=mesh(geo(new THREE.CircleGeometry(252,64)),seaWater.mistMaterial,0,-17.7,0);mist.rotation.x=-Math.PI/2;mist.castShadow=false;
 seaWater.material.uniforms.shallowColor.value.set('#247f9b');seaWater.material.uniforms.deepColor.value.set('#06354a');
 seaWater.attachMeshes(sea,mist);seaWater.setQuality('medium',{allowPlanarReflection:false});
 seaWater.setFoamContacts(CITE_ISLANDS.flatMap(island=>Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return{x:island.x+Math.cos(a)*island.r,z:island.z+Math.sin(a)*island.r,r:5,strength:.7};})));
 // Eight gates on the perimeter with eight wide routes radiating from the same landmark.
 for(let i=0;i<8;i++){
  const wp=platformPortal(i),p={x:wp.x/HUB_SCALE,z:wp.z/HUB_SCALE},a=Math.atan2(p.x,p.z);
  const walk=mesh(box,dark,p.x*.56,.006,p.z*.56,9,.04,116);walk.rotation.y=a;
  for(const side of [-1,1]){const strip=mesh(box,gold,p.x*.56+Math.cos(a)*side*4.6,.04,p.z*.56-Math.sin(a)*side*4.6,.12,.05,116);strip.rotation.y=a;}
  mesh(cylinder,dark,p.x,-.015,p.z,11,.12,11);ring(20,.05,.06,gold,Math.PI*.7,i*Math.PI/4);
  // Broad gold/black gateway surrounds the existing traversable country threshold.
  for(const side of [-1,1]){
   mesh(box,dark,p.x+side*8,10,p.z,2,20,3);
   mesh(box,gold,p.x+side*8,10,p.z+1.6,.4,22,.2);
   mesh(box,blue,p.x+side*7.4,8,p.z+1.8,.12,12,.1);
   collisions.push({x:p.x+side*8,z:p.z,width:2,depth:3});
  }
  mesh(box,gold,p.x,20,p.z,18,.6,3.2);sign(HUB_VALUES[i],p.x,22,p.z,13);
 }
 // Four basins and cascades leave the radial routes and the circular promenade dry.
 for(const [x,z] of [[48,48],[-48,48],[48,-48],[-48,-48]]){
  mesh(cylinder,dark,x,-.14,z,16,.2,16);const pool=mesh(geo(new THREE.CircleGeometry(14,48)),water,x,-.015,z);pool.rotation.x=-Math.PI/2;pool.castShadow=false;
  collisions.push({x,z,r:14.8});
  for(let i=0;i<8;i++){const a=i*Math.PI/4;mesh(box,gold,x+Math.cos(a)*15.5,.12,z+Math.sin(a)*15.5,.5,.25,.5);}
 }
 for(const island of CITE_ISLANDS.filter(i=>!['nexus','arrival'].includes(i.id)).slice(0,20)){
  const a=Math.atan2(island.z,island.x),x=island.x+Math.cos(a)*island.r,z=island.z+Math.sin(a)*island.r;
  const fall=mesh(geo(new THREE.PlaneGeometry(1,1,2,12)),fallMaterial,x,-9,z,4,18,1);fall.rotation.y=Math.PI/2-a;fall.castShadow=false;waterfalls.push(fall);
 }
 // The monumental broken ring stands above its own fountain. Its eight pieces answer to progress.
 mesh(cylinder,dark,0,.4,0,19,.8,19);const fountain=mesh(geo(new THREE.CircleGeometry(16,64)),water,0,.84,0);fountain.rotation.x=-Math.PI/2;fountain.castShadow=false;collisions.push({x:0,z:0,r:19.5});
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
  const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,h=b.height,walls=platformWalls(worldBuildings.find(item=>item.buildingId===b.buildingId)).map(wall=>Object.fromEntries(Object.entries(wall).map(([k,v])=>[k,v/HUB_SCALE])));
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
 addPlatformArchitecture({mesh,geo,box,cylinder,sphere,materials:{dark,gold,blue,glass,stone,green,wood},buildings,collisions,sign,THREE});
 addReferenceCiteDetails({mesh,geo,box,cylinder,sphere,materials:{dark,gold,blue,glass,stone,green,wood},THREE});
 for(const side of [-1,1])for(const depth of [-1,1])cameraSolids.push({x:side*5.2,z:depth*5.2,width:3.8,depth:3.8,bottom:0,top:depth<0?100:84});
 // Physical district consoles and the eight value plaques have matching runtime interactions.
 for(const p of hubPublicPlaces()){
  const x=p.x/HUB_SCALE,z=p.z/HUB_SCALE;
  mesh(cylinder,dark,x,.55,z,.65,1.1,.65);mesh(box,gold,x,1.3,z,1.1,.08,.7);
  const screen=mesh(box,blue,x,1.65,z,.9,.55,.08);screen.rotation.x=-.2;
  sign(p.kind==='value'?p.value:hubPublicPlaces().find(v=>v.id===p.id).name,x,2.7,z,5.2);
 }
 const blooms=[];for(let i=0;i<16;i++){const a=i*Math.PI/8,x=-66+Math.cos(a)*18,z=66+Math.sin(a)*18;blooms.push(mesh(sphere,gold,x,.3,z,.4,.5,.4));}
 const communityBanner=mesh(box,blue,-111,15,8,13,1.2,.12);
 // Market, benches, lamps and compact terraces populate every route.
 for(let i=0;i<24;i++){
  const a=(i+.5)*Math.PI*2/24,r=i%2?119:80,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(terraceAisle(x,z,5))continue;
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
 const dynamic=new Set([sea,mist,fountain,communityBanner,...blooms,ground,...roofs.map(r=>r.roof),...fragments,orb,beam,...waterfalls]);
 root.updateMatrixWorld(true);const groups=new Map();
 for(const o of root.children)if(o.isMesh&&!dynamic.has(o)&&!o.material.map&&!o.material.transparent){const k=o.material.uuid;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o);}
 for(const group of groups.values())if(group.length>1){
  const parts=group.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return g.applyMatrix4(o.matrix);}),merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  if(merged){const batch=mesh(geo(merged),group[0].material,0,0,0);batch.castShadow=true;group.forEach(o=>o.removeFromParent());}
 }
 const update=next=>{save=next;const state=platformWorldState(save);communityBanner.visible=state.communityUnited;blooms.forEach(b=>b.visible=state.gardenRestored);glass.emissive.set(state.networkRestored?'#174963':'#000000');glass.emissiveIntensity=state.networkRestored?.4:0;root.userData.worldState=state;const count=new Set(save.seals||[]).size;for(let i=0;i<8;i++){fragments[i].position.x=i<count?0:Math.cos(i*Math.PI/4)*.55;fragments[i].position.y=25+(i<count?0:Math.sin(i*Math.PI/4)*.55);}};
 update(save);
 root.scale.set(HUB_SCALE,1.5,HUB_SCALE);
 for(const o of collisions)for(const key of ['x','z','r','width','depth'])if(Number.isFinite(o[key]))o[key]*=HUB_SCALE;
 for(const o of cameraSolids){for(const key of ['x','z','width','depth'])o[key]*=HUB_SCALE;o.top*=1.5;}
 return {root,ground,collisions,cameraSolids,ready:Promise.resolve(),height:terraceWorldHeight,
  get interior(){return interior?{id:interior.buildingId,name:interior.name}:null;},
  architectureDiagnostics:{id:'reference-floating-platform',islands:CITE_ISLANDS.length,bridges:CITE_BRIDGES.length,terraces:8,rooms:buildings.length,portals:8,publicPlaces:18,residentialBlocks:16,diameter:HUB_PLATFORM.radius*2},
  update,setParty(){},setQuality(mode){root.userData.quality=mode;seaWater.setQuality(mode,{allowPlanarReflection:mode==='detail'||mode==='high'});},setWeather(weather){seaWater.setWeather(weather);poolWater.setWeather(weather);},setDaylight(value){daylight=value;seaWater.setDaylight(value);poolWater.setDaylight(value);fallMaterial.uniforms.day.value=value;blue.emissiveIntensity=.3+(1-daylight)*.3;},
  updateDistrict(camera,p){interior=platformInteriorAt(p,worldBuildings);for(const {b,roof} of roofs)roof.visible=interior?.buildingId!==b.buildingId;},
  updateCamera(){},renderWaterReflection(renderer,scene,camera,time){return seaWater.renderReflection(renderer,scene,camera,time);},cinematicFocus(){return false;},
  tick(time){seaWater.update(time);poolWater.update(time);fallMaterial.uniforms.time.value=time;orb.rotation.y=time*.18;orb.position.y=25+Math.sin(time*.8)*.3;for(const [i,fall] of waterfalls.entries())fall.scale.y=18+Math.sin(time*1.6+i)*.12;},
  dispose(){seaWater.disposeReflection();poolWater.disposeReflection();root.removeFromParent();for(const asset of owned)asset.dispose();},
 };
}
