import * as THREE from 'three';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hash=input=>{let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

function child(group,geometry,material,{x=0,y=0,z=0,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0,cast=true}={}){
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.set(rx,ry,rz);mesh.castShadow=cast;mesh.receiveShadow=true;group.add(mesh);return mesh;
}

export function buildPremiumHubRoad(item,{mesh,material,groundY}){
 const visuals=[],y=groundY(item.x,item.z),heading=item.heading||0;
 const asphalt=material(item.kind==='express'?'#11171d':'#171d22',{roughness:.97,metalness:.03});
 const paving=material('#4d5457',{roughness:.9,metalness:.04});
 const curbMat=material('#8e8a7b',{roughness:.78,metalness:.08});
 const marking=material(item.kind==='express'?'#d6b46a':'#d7d8d0',{roughness:.52,metalness:.15,emissive:item.kind==='express'?'#805d16':'#2d3537',emissiveIntensity:.08});
 const road=mesh('box',asphalt,item.x,y+.045,item.z,item.width,.09,item.length);road.rotation.y=heading;road.castShadow=false;visuals.push(road);

 const sideX=Math.cos(heading),sideZ=-Math.sin(heading),forwardX=Math.sin(heading),forwardZ=Math.cos(heading);
 for(const side of [-1,1]){
  const offset=item.width/2+1.35,x=item.x+sideX*offset*side,z=item.z+sideZ*offset*side;
  const walk=mesh('box',paving,x,y+.11,z,2.25,.16,item.length);walk.rotation.y=heading;walk.castShadow=false;visuals.push(walk);
  const curb=mesh('box',curbMat,item.x+sideX*(item.width/2+.16)*side,y+.13,item.z+sideZ*(item.width/2+.16)*side,.28,.20,item.length);curb.rotation.y=heading;curb.castShadow=false;visuals.push(curb);
 }

 const dashCount=clamp(Math.floor(item.length/28),4,18),spacing=item.length/(dashCount+1);
 for(let i=1;i<=dashCount;i++){
  const along=-item.length/2+i*spacing,x=item.x+forwardX*along,z=item.z+forwardZ*along;
  const dash=mesh('box',marking,x,y+.105,z,.16,.018,Math.min(4.2,spacing*.42));dash.rotation.y=heading;dash.castShadow=false;visuals.push(dash);
 }
 if(item.kind==='express')for(const side of [-1,1]){
  const lane=mesh('box',marking,item.x+sideX*(item.width*.24)*side,y+.102,item.z+sideZ*(item.width*.24)*side,.10,.016,item.length*.96);lane.rotation.y=heading;lane.castShadow=false;visuals.push(lane);
 }
 const streetMetal=material('#222a2f',{roughness:.48,metalness:.52}),streetGlow=material('#d6b46a',{emissive:'#d6b46a',emissiveIntensity:.42,roughness:.25,metalness:.62}),roadSeed=hash(item.id||'hub-road');
 const lampFractions=[-.34+((roadSeed>>>4)%9)/100,.26+((roadSeed>>>9)%11)/100];
 lampFractions.forEach((fraction,station)=>{for(const side of [-1,1]){
  const stagger=side*((((roadSeed>>>(station*3+13))%7)-3)/100),along=item.length*(fraction+stagger),offset=item.width/2+2.65,x=item.x+forwardX*along+sideX*offset*side,z=item.z+forwardZ*along+sideZ*offset*side;
  const pole=mesh('cylinder',streetMetal,x,y+2.15,z,.075,4.1,.075);pole.castShadow=false;visuals.push(pole);
  const cap=mesh('box',streetGlow,x,y+4.23,z,.26,.09,.26);cap.castShadow=false;visuals.push(cap);
 }});
 return visuals;
}

export function decorateHubBuilding(item,{mesh,material,groundY,canonical=true}){
 const visuals=[],bx=item.buildingX??item.x,bz=item.buildingZ??item.z,y=groundY(bx,bz),width=item.width,depth=item.depth,height=item.height;
 const glass=material('#103d55',{emissive:'#00a8ff',emissiveIntensity:canonical?.16:.05,roughness:.14,metalness:.04,transmission:.12,ior:1.46,thickness:.16,specularIntensity:.9,clearcoat:.54,clearcoatRoughness:.11});
 const gold=material('#d6b46a',{emissive:'#8b6b2e',emissiveIntensity:.08,roughness:.24,metalness:.92,clearcoat:.18,clearcoatRoughness:.14});
 const trim=material('#10161b',{roughness:.46,metalness:.58,clearcoat:.08,clearcoatRoughness:.24});
 const stone=material('#30383d',{roughness:.78,metalness:.10});

 const base=mesh('box',stone,bx,y+.45,bz,width*1.06,.9,depth*1.06);base.castShadow=true;visuals.push(base);
 const rhythmSeed=hash(item.buildingId||item.id||'hub-building'),glassMode=rhythmSeed%3,levels=clamp(Math.floor(height/9),2,7);
 for(let level=1;level<levels;level++){
  const phase=(level+glassMode)%3,bandWidth=width*(phase===0?.68:phase===1?.82:.74),bandHeight=phase===0?.72:phase===1?.95:.82,wy=y+height*(level/(levels+.1));
  const front=mesh('box',glass,bx,wy,bz+depth*.505,bandWidth,bandHeight,.10),back=mesh('box',glass,bx,wy,bz-depth*.505,bandWidth,bandHeight,.10);
  front.castShadow=back.castShadow=false;visuals.push(front,back);
  if(width<76&&phase!==1){
   const sideDepth=depth*(phase===2?.56:.70),left=mesh('box',glass,bx-width*.505,wy,bz,.10,bandHeight,sideDepth),right=mesh('box',glass,bx+width*.505,wy,bz,.10,bandHeight,sideDepth);left.castShadow=right.castShadow=false;visuals.push(left,right);
  }
 }
 let finIndex=0;for(const side of [-1,1])for(const zside of [-1,1]){
  const accent=canonical&&((finIndex+((rhythmSeed>>>5)%4))%3===0)?gold:trim;
  const fin=mesh('box',accent,bx+side*width*.46,y+height*.52,bz+zside*depth*.505,.11,height*.92,.16);fin.castShadow=false;visuals.push(fin);finIndex++;
 }
 const canopy=mesh('box',trim,bx,y+3.2,bz+depth*.57,width*.26,.26,depth*.18);visuals.push(canopy);
 const light=mesh('box',glass,bx,y+2.7,bz+depth*.665,width*.18,.18,.08);light.castShadow=false;visuals.push(light);

 if(!canonical)return visuals;
 switch(item.buildingId){
  case 'tower_circle':{
   for(const lift of [height*.63,height*.78,height*.91]){
    const ring=mesh('ring',gold,bx,y+lift,bz,width*.54,width*.54,width*.54);ring.rotation.x=Math.PI/2;ring.scale.z=1;ring.castShadow=false;visuals.push(ring);
   }
   const needle=mesh('cylinder',gold,bx,y+height+7,bz,.32,14,.32);visuals.push(needle);
   const beacon=mesh('sphere',glass,bx,y+height+14.6,bz,.65,.9,.65);beacon.castShadow=false;visuals.push(beacon);
   break;
  }
  case 'memory_archives':{
   for(let i=-3;i<=3;i++){const x=bx+i*(width*.10),column=mesh('cylinder',stone,x,y+5.2,bz+depth*.57,.38,8.5,.38);visuals.push(column);}
   const lintel=mesh('box',gold,bx,y+9.7,bz+depth*.57,width*.78,.22,.35);visuals.push(lintel);break;
  }
  case 'train_station':{
   for(const side of [-1,1]){const canopy2=mesh('box',glass,bx,y+5.8,bz+side*depth*.63,width*.86,.18,5.4);visuals.push(canopy2);}
   break;
  }
  case 'arena_3b':{
   for(let i=-3;i<=3;i++){const x=bx+i*(width/8),rib=mesh('box',gold,x,y+height*.56,bz+depth*.53,.18,height*.62,.20);rib.rotation.z=(i/3)*.06;visuals.push(rib);}break;
  }
  case 'ai_textile_lab':
  case 'mode3_studio':{
   const band=mesh('box',glass,bx,y+height*.72,bz,width*1.025,height*.08,depth*1.025);band.castShadow=false;visuals.push(band);break;
  }
  case 'city_planning_office':
  case 'city_gallery':{
   const crown=mesh('box',gold,bx,y+height+.45,bz,width*.62,.55,depth*.62);visuals.push(crown);break;
  }
  case 'heritage_welcome':
  case 'mission_hotel':
  case 'living_cards_gallery':{
   for(const side of [-1,1]){
    const pillar=mesh('box',stone,bx+side*width*.34,y+3.2,bz+depth*.565,.55,5.8,.55);visuals.push(pillar);
    const lantern=mesh('box',gold,bx+side*width*.34,y+6.35,bz+depth*.60,.22,.32,.22);lantern.castShadow=false;visuals.push(lantern);
   }
   break;
  }
  case 'house_3b':{
   for(const side of [-1,0,1]){
    const display=mesh('box',glass,bx+side*width*.22,y+3.1,bz+depth*.525,width*.17,3.8,.12);display.castShadow=false;visuals.push(display);
   }
   const signature=mesh('box',gold,bx,y+6.0,bz+depth*.54,width*.34,.16,.12);signature.castShadow=false;visuals.push(signature);break;
  }
  case 'garage_3b':{
   for(const side of [-1,0,1]){
    const door=mesh('box',trim,bx+side*width*.245,y+3.1,bz+depth*.515,width*.20,5.4,.16);visuals.push(door);
    for(let row=0;row<4;row++){const strip=mesh('box',glass,bx+side*width*.245,y+1.55+row*1.02,bz+depth*.526,width*.17,.08,.05);strip.castShadow=false;visuals.push(strip);}
   }
   break;
  }
  case 'community_house':{
   const terrace=mesh('box',stone,bx,y+height*.67,bz+depth*.54,width*.72,.35,4.4);visuals.push(terrace);
   for(const side of [-1,1]){const beacon=mesh('cylinder',gold,bx+side*width*.36,y+height*.70,bz+depth*.58,.18,1.8,.18);beacon.castShadow=false;visuals.push(beacon);}break;
  }
  case 'central_marina':{
   for(const side of [-1,1]){
    const mast=mesh('cylinder',gold,bx+side*width*.32,y+height*.72,bz,.16,height*.78,.16);visuals.push(mast);
    const sail=mesh('box',glass,bx+side*width*.22,y+height*.80,bz+side*depth*.18,width*.22,.18,depth*.62);sail.rotation.z=side*.16;sail.castShadow=false;visuals.push(sail);
   }
   break;
  }
  case 'shipyard_3b':{
   for(const side of [-1,1]){const gantry=mesh('box',trim,bx+side*width*.43,y+height*.70,bz,.45,height*.72,.45);visuals.push(gantry);}
   const bridge=mesh('box',gold,bx,y+height*.92,bz,width*.86,.30,.48);visuals.push(bridge);break;
  }
  case 'workers_memorial':{
   for(let i=-2;i<=2;i++){const slab=mesh('box',i===0?gold:stone,bx+i*width*.13,y+height*.42,bz+depth*.54,width*.055,height*.62,.28);visuals.push(slab);}break;
  }
  case 'wildlife_refuge':{
   for(const side of [-1,1]){const pergola=mesh('box',stone,bx+side*width*.33,y+4.0,bz+depth*.55,.48,6.5,.48);visuals.push(pergola);}
   const roof=mesh('box',glass,bx,y+7.35,bz+depth*.55,width*.74,.20,3.8);roof.castShadow=false;visuals.push(roof);break;
  }
  default:break;
 }
 return visuals;
}

export function createPremiumTrafficVehicle(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Traffic-Vehicle';root.add(group);
 const bodyMat=material('#162631',{metalness:.58,roughness:.26});
 const glass=material('#19516d',{emissive:'#00a8ff',emissiveIntensity:.16,metalness:.38,roughness:.16});
 const gold=material('#d6b46a',{emissive:'#6f531d',emissiveIntensity:.16,metalness:.82,roughness:.24});
 const tire=material('#090b0d',{roughness:.92,metalness:.02});
 child(group,geometry.box,bodyMat,{y:.58,sx:1.82,sy:.48,sz:3.65});
 child(group,geometry.box,glass,{y:1.10,z:-.15,sx:1.38,sy:.46,sz:1.82});
 child(group,geometry.box,gold,{y:.62,z:1.86,sx:1.22,sy:.09,sz:.05,cast:false});
 child(group,geometry.box,glass,{y:.63,z:-1.88,sx:1.15,sy:.07,sz:.05,cast:false});
 for(const x of [-1.52,1.52])for(const z of [-1.15,1.15])child(group,geometry.cylinder,tire,{x,y:.28,z,sx:.28,sy:.20,sz:.28,rz:Math.PI/2});
 group.position.set(item.x,groundY(item.x,item.z),item.z);return group;
}

export function createPremiumTransportVisual(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Transport-'+item.transport;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);
 const dark=material('#10171d',{roughness:.62,metalness:.34}),gold=material('#d6b46a',{emissive:'#765a22',emissiveIntensity:.14,metalness:.76,roughness:.28}),blue=material('#124763',{emissive:'#00a8ff',emissiveIntensity:.28,metalness:.35,roughness:.20});
 const post=(x,z,h=3.4)=>child(group,geometry.box,dark,{x,y:h/2,z,sx:.22,sy:h,sz:.22});
 if(item.transport==='train'){
  child(group,geometry.box,dark,{y:.08,sx:4.8,sy:.16,sz:8.5});
  for(const x of [-2.2,2.2]){post(x,0,3.7);child(group,geometry.box,gold,{x,y:3.62,sx:.18,sy:.16,sz:7.8});}
  child(group,geometry.box,blue,{y:3.55,sx:4.6,sy:.14,sz:2.2,cast:false});
  for(const x of [-1.25,1.25])child(group,geometry.box,gold,{x,y:.18,sx:.08,sy:.03,sz:8.8,cast:false});
 }else if(item.transport==='boat'){
  child(group,geometry.box,dark,{y:.14,sx:3.7,sy:.28,sz:6.4});
  for(const x of [-2.9,2.9])for(const z of [-4.4,0,4.4])post(x,z,1.3);
  child(group,geometry.box,blue,{y:.34,z:-2.8,sx:2.8,sy:.10,sz:1.5,cast:false});
 }else if(item.transport==='telepheric'){
  for(const x of [-2.3,2.3])post(x,0,7.8);
  child(group,geometry.box,gold,{y:7.55,sx:5.6,sy:.25,sz:.45});
  child(group,geometry.box,blue,{y:5.7,sx:2.7,sy:1.45,sz:2.3});
 }else{
  for(const x of [-1.4,1.4])post(x,0,3.1);
  child(group,geometry.box,gold,{y:2.95,sx:3.2,sy:.16,sz:.30});
  const marker=child(group,geometry.box,blue,{y:2.15,sx:.34,sy:.82,sz:.34,ry:Math.PI/4,cast:false});marker.rotation.z=Math.PI/4;
 }
 return group;
}

export function createPremiumHubMarker(item,{root,geometry,material,groundY,kind='mission'}){
 const group=new THREE.Group();group.name='3B-Marker-'+kind;root.add(group);group.position.set(item.x,groundY(item.x,item.z),item.z);
 const major=item.importance==='major'||kind==='event'||kind==='trial',accent=kind==='secret'?(item.done?'#58616b':item.expected?'#d6b46a':'#00a8ff'):major?'#d6b46a':'#00a8ff';
 const baseMat=material('#111920',{roughness:.58,metalness:.36});
 const accentMat=material(accent,{color:accent,emissive:accent,emissiveIntensity:kind==='secret'?.18:.55,metalness:.52,roughness:.23,transparent:kind==='secret',opacity:kind==='secret'?.72:1});
 child(group,geometry.cylinder,baseMat,{y:.12,sx:.72,sy:.24,sz:.72});
 if(kind==='district'){
  child(group,geometry.cylinder,accentMat,{y:.255,sx:1.28,sy:.035,sz:1.28,ry:Math.PI/8,cast:false});
  for(let i=0;i<4;i++)child(group,geometry.box,accentMat,{x:Math.cos(i*Math.PI/2)*1.55,y:.18,z:Math.sin(i*Math.PI/2)*1.55,sx:.08,sy:.16,sz:.32,ry:i*Math.PI/2,cast:false});
 }else if(kind==='secret'){
  child(group,geometry.box,accentMat,{y:.15,sx:1.15,sy:.025,sz:1.15,ry:Math.PI/4,cast:false});
  child(group,geometry.box,accentMat,{y:.66,sx:.09,sy:.75,sz:.09,ry:Math.PI/4,cast:false});
 }else{
  child(group,geometry.box,baseMat,{y:1.12,sx:.26,sy:2.05,sz:.26});
  const gem=child(group,geometry.box,accentMat,{y:2.45,sx:.48,sy:.48,sz:.48,ry:Math.PI/4,cast:false});gem.rotation.z=Math.PI/4;
  child(group,geometry.box,accentMat,{y:1.18,z:.18,sx:.06,sy:1.45,sz:.04,cast:false});
  if(kind==='trial')for(const side of [-1,1])child(group,geometry.box,accentMat,{x:side*.92,y:.62,sx:.10,sy:1.15,sz:.10,cast:false});
 }
 return group;
}


export function createPremiumTransitVehicle(spec,start,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Moving-'+spec.transport;root.add(group);
 const dark=material('#11171c',{roughness:.42,metalness:.52});
 const accent=material(spec.color,{emissive:spec.color,emissiveIntensity:.22,metalness:.68,roughness:.24});
 const glass=material('#113f58',{emissive:'#00a8ff',emissiveIntensity:.12,metalness:.35,roughness:.15});
 if(spec.transport==='train'){
  child(group,geometry.box,dark,{y:0,sx:1.65,sy:.72,sz:4.9});
  child(group,geometry.box,glass,{y:.50,z:-.25,sx:1.34,sy:.42,sz:3.55});
  for(const z of [-4.25,-2.2,0,2.2,4.25])child(group,geometry.box,accent,{y:.08,z,sx:1.45,sy:.08,sz:.05,cast:false});
  for(const x of [-1.34,1.34])for(const z of [-3.25,3.25])child(group,geometry.cylinder,dark,{x,y:-.52,z,sx:.24,sy:.20,sz:.24,rz:Math.PI/2});
 }else if(spec.transport==='boat'){
  child(group,geometry.box,dark,{y:-.05,sx:1.65,sy:.35,sz:3.3});
  child(group,geometry.box,glass,{y:.48,z:-.35,sx:1.18,sy:.50,sz:1.65});
  child(group,geometry.box,accent,{y:.05,z:2.55,sx:1.15,sy:.08,sz:.55,cast:false});
 }else{
  child(group,geometry.box,dark,{y:0,sx:1.32,sy:.82,sz:1.62});
  child(group,geometry.box,glass,{y:.05,z:.10,sx:1.06,sy:.62,sz:1.25});
  child(group,geometry.box,accent,{y:.98,sx:1.14,sy:.10,sz:.16,cast:false});
  for(const x of [-.9,.9])child(group,geometry.cylinder,dark,{x,y:1.22,sx:.16,sy:.18,sz:.16,rz:Math.PI/2});
 }
 group.position.set(start.x,groundY(start.x,start.z)+spec.height,start.z);return group;
}
