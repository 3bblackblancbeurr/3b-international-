import * as THREE from 'three';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hash=input=>{let h=2166136261;for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

function child(group,geometry,material,{x=0,y=0,z=0,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0,cast=true}={}){
 const mesh=new THREE.Mesh(geometry,material);
 mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.set(rx,ry,rz);mesh.castShadow=cast;mesh.receiveShadow=true;group.add(mesh);return mesh;
}

export function buildPremiumHubRoad(item,{mesh,material,groundY}){
 const visuals=[],y=groundY(item.x,item.z),heading=item.heading||0;
 const asphalt=material(item.kind==='express'?'#11171d':item.kind==='lane'?'#2c3133':'#171d22',{roughness:item.kind==='lane'?.88:.97,metalness:.03});
 const paving=material('#4d5457',{roughness:.9,metalness:.04});
 const curbMat=material('#8e8a7b',{roughness:.78,metalness:.08});
 const marking=material(item.kind==='express'?'#d6b46a':'#d7d8d0',{roughness:.52,metalness:.15,emissive:item.kind==='express'?'#805d16':'#2d3537',emissiveIntensity:.08});
 const road=mesh('box',asphalt,item.x,y+.045,item.z,item.width,.09,item.length);road.rotation.y=heading;road.castShadow=false;visuals.push(road);

 const sideX=Math.cos(heading),sideZ=-Math.sin(heading),forwardX=Math.sin(heading),forwardZ=Math.cos(heading);
 for(const side of [-1,1]){
  const offset=item.width/2+(item.kind==='lane'?.82:1.35),x=item.x+sideX*offset*side,z=item.z+sideZ*offset*side;
  const walk=mesh('box',paving,x,y+.11,z,item.kind==='lane'?1.2:2.25,.16,item.length);walk.rotation.y=heading;walk.castShadow=false;visuals.push(walk);
  const curb=mesh('box',curbMat,item.x+sideX*(item.width/2+.16)*side,y+.13,item.z+sideZ*(item.width/2+.16)*side,.28,.20,item.length);curb.rotation.y=heading;curb.castShadow=false;visuals.push(curb);
 }

 const dashCount=clamp(Math.floor(item.length/28),4,18),spacing=item.length/(dashCount+1);
 if(item.kind!=='lane')for(let i=1;i<=dashCount;i++){
  const along=-item.length/2+i*spacing,x=item.x+forwardX*along,z=item.z+forwardZ*along;
  const dash=mesh('box',marking,x,y+.105,z,.16,.018,Math.min(4.2,spacing*.42));dash.rotation.y=heading;dash.castShadow=false;visuals.push(dash);
 }
 if(item.kind==='express')for(const side of [-1,1]){
  const lane=mesh('box',marking,item.x+sideX*(item.width*.24)*side,y+.102,item.z+sideZ*(item.width*.24)*side,.10,.016,item.length*.96);lane.rotation.y=heading;lane.castShadow=false;visuals.push(lane);
 }
 const streetMetal=material('#222a2f',{roughness:.48,metalness:.52}),streetGlow=material('#d6b46a',{emissive:'#d6b46a',emissiveIntensity:item.kind==='lane'?.18:.42,roughness:.25,metalness:.62}),roadSeed=hash(item.id||'hub-road');
 const lampFractions=item.kind==='lane'?[.04]:[-.34+((roadSeed>>>4)%9)/100,.26+((roadSeed>>>9)%11)/100];
 lampFractions.forEach((fraction,station)=>{for(const side of item.kind==='lane'?[roadSeed%2?1:-1]:[-1,1]){
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
 const evolutionStage=Math.max(0,Number(item.evolutionStage||0)),construction=item.buildStatus==='construction',prestige=!!item.prestige;

 const base=mesh('box',construction?trim:stone,bx,y+.45,bz,width*1.06,.9,depth*1.06);base.castShadow=true;visuals.push(base);
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

 if(!canonical){
  const civicAccent=material(item.districtAccent||'#00a8ff',{emissive:item.districtAccent||'#00a8ff',emissiveIntensity:.16,roughness:.26,metalness:.42});
  const frontageZ=bz+depth*.535;
  switch(item.civicUse){
   case 'housing':
    for(const level of [.32,.56,.78])for(const side of [-1,1]){
     const balcony=mesh('box',civicAccent,bx+side*width*.22,y+height*level,frontageZ,width*.16,.10,.08);
     balcony.castShadow=false;visuals.push(balcony);
    }
    break;
   case 'food':
    {const awning=mesh('box',civicAccent,bx,y+3.8,frontageZ+.45,width*.52,.18,1.15);awning.castShadow=false;visuals.push(awning);}
    break;
   case 'workshop':
    for(const side of [-1,0,1]){const door=mesh('box',trim,bx+side*width*.22,y+2.3,frontageZ,width*.16,4.1,.15);visuals.push(door);}
    break;
   case 'school':
    for(const side of [-1,1]){const pillar=mesh('box',stone,bx+side*width*.28,y+3.5,frontageZ,.42,6.2,.42);visuals.push(pillar);}
    {const lintel=mesh('box',civicAccent,bx,y+6.55,frontageZ,width*.64,.14,.20);lintel.castShadow=false;visuals.push(lintel);}
    break;
   case 'clinic':
    {const barA=mesh('box',civicAccent,bx,y+4.6,frontageZ,width*.22,.18,.12),barB=mesh('box',civicAccent,bx,y+4.6,frontageZ,.18,width*.22,.12);barA.castShadow=barB.castShadow=false;visuals.push(barA,barB);}
    break;
   case 'small_shop':
    for(const side of [-1,1]){const display=mesh('box',glass,bx+side*width*.22,y+2.65,frontageZ,width*.18,3.6,.10);display.castShadow=false;visuals.push(display);}
    break;
   case 'guild_room':
    for(const side of [-1,1]){const banner=mesh('box',civicAccent,bx+side*width*.31,y+height*.60,frontageZ,.22,height*.42,.10);banner.castShadow=false;visuals.push(banner);}
    break;
   case 'public_service':
    {const civicCanopy=mesh('box',gold,bx,y+4.2,frontageZ+.55,width*.58,.20,1.3);visuals.push(civicCanopy);}
    break;
   default:break;
  }
  return visuals;
 }
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

 // The Hub visibly grows with the player's restored heritage. Buildings never
 // pop out of existence: future services first read as construction shells,
 // then gain light, rooftop beacons and finally a prestige crown.
 if(construction){
  const scaffold=material('#6d674f',{roughness:.62,metalness:.46});
  for(const side of [-1,1])for(const zside of [-1,1]){
   const beam=mesh('box',scaffold,bx+side*width*.55,y+Math.min(height*.48,10),bz+zside*depth*.55,.16,Math.min(height*.82,20),.16);beam.castShadow=false;visuals.push(beam);
  }
  const upper=mesh('box',scaffold,bx,y+Math.min(height*.82,16),bz,width*1.14,.12,depth*1.14);upper.castShadow=false;visuals.push(upper);
 }else{
  const entryGlow=mesh('box',glass,bx,y+1.15,bz+depth*.57,width*.42,.10,.08);entryGlow.castShadow=false;visuals.push(entryGlow);
  if(evolutionStage>=2){
   const roofGlow=mesh('box',glass,bx,y+height+.24,bz,width*.52,.08,depth*.52);roofGlow.castShadow=false;visuals.push(roofGlow);
  }
  if(evolutionStage>=3){
   const beacon=mesh('cylinder',gold,bx,y+height+1.55,bz,.10,2.8,.10);beacon.castShadow=false;visuals.push(beacon);
  }
  if(prestige){
   const crown=mesh('ring',gold,bx,y+height+3.15,bz,Math.max(2.4,Math.min(width,depth)*.24),Math.max(2.4,Math.min(width,depth)*.24),Math.max(2.4,Math.min(width,depth)*.24));crown.rotation.x=Math.PI/2;crown.castShadow=false;visuals.push(crown);
  }
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


export function createPremiumHeritagePlatform(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Heritage-Platform-'+item.code;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);
 const accent=item.color||'#00a8ff',dark=material('#080d12',{roughness:.54,metalness:.46});
 const stone=material('#252e34',{roughness:.76,metalness:.14});
 const gold=material('#d6b46a',{emissive:'#8e6c2c',emissiveIntensity:.16+.12*(item.glow||0),roughness:.22,metalness:.88});
 const energy=material(accent,{emissive:accent,emissiveIntensity:.28+.72*(item.glow||0),roughness:.18,metalness:.34,transparent:true,opacity:.72,depthWrite:false});
 const dormant=material('#303840',{emissive:'#122530',emissiveIntensity:.08,roughness:.58,metalness:.28});

 child(group,geometry.cylinder,stone,{y:.14,sx:8.6,sy:.28,sz:8.6});
 child(group,geometry.cylinder,dark,{y:.32,sx:7.45,sy:.18,sz:7.45});
 child(group,geometry.cylinder,item.restored?energy:item.liberated?gold:dormant,{y:.44,sx:5.95,sy:.055,sz:5.95,cast:false});

 const toCenter=Math.atan2(-item.x,-item.z);group.rotation.y=toCenter;
 for(const side of [-1,1]){
  child(group,geometry.box,gold,{x:side*5.5,y:2.4,z:-.8,sx:.24,sy:4.4,sz:.34});
  child(group,geometry.box,energy,{x:side*5.5,y:4.7,z:-.8,sx:.48,sy:.18,sz:.48,cast:false});
  child(group,geometry.box,dark,{x:side*3.15,y:.62,z:1.4,sx:1.15,sy:.75,sz:2.4});
 }
 child(group,geometry.box,gold,{y:5.0,z:-.8,sx:11.2,sy:.22,sz:.38});
 child(group,geometry.box,energy,{y:4.65,z:-.55,sx:8.7,sy:.10,sz:.10,cast:false});

 const core=child(group,geometry.box,item.restored?gold:energy,{y:1.45,z:.15,sx:1.2,sy:1.2,sz:1.2,ry:Math.PI/4,cast:false});core.rotation.z=Math.PI/4;
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,x=Math.cos(a)*7.35,z=Math.sin(a)*7.35;
  child(group,geometry.cylinder,i%2?gold:energy,{x,y:.92,z,sx:.10,sy:1.55,sz:.10,cast:false});
 }

 // Each country esplanade keeps a distinct architectural signature.
 // The functional building is now rendered by createPremiumHeritageFacility,
 // so the platform no longer fakes a duplicate generic annex.
 const localAccent=material(accent,{emissive:accent,emissiveIntensity:.22+.25*(item.glow||0),roughness:.26,metalness:.48});
 if(item.facility){
  child(group,geometry.box,gold,{y:.48,z:4.65,sx:4.6,sy:.10,sz:1.2,cast:false});
  child(group,geometry.box,localAccent,{y:.62,z:4.65,sx:3.5,sy:.05,sz:.82,cast:false});
 }
 switch(item.code){
  case 'FR':
   for(const side of [-1,1])child(group,geometry.box,localAccent,{x:side*3.7,y:3.2,z:-2.0,sx:.18,sy:5.4,sz:.22,cast:false});
   child(group,geometry.box,gold,{y:5.65,z:-2.0,sx:7.8,sy:.18,sz:.25,cast:false});
   break;
  case 'DZ':
   for(const side of [-1,1]){child(group,geometry.cylinder,localAccent,{x:side*3.5,y:2.6,z:-2.2,sx:.28,sy:4.8,sz:.28});child(group,geometry.sphere,gold,{x:side*3.5,y:5.2,z:-2.2,sx:.55,sy:.34,sz:.55,cast:false});}
   break;
  case 'ES':
   for(const side of [-1,0,1]){const blade=child(group,geometry.box,side===0?gold:localAccent,{x:side*2.7,y:3.4,z:-2.4,sx:.20,sy:5.8+Math.abs(side)*1.2,sz:.25,rz:side*.16,cast:false});blade.rotation.y=side*.12;}
   break;
  case 'MA':
   for(const side of [-1,1])for(const z of [-2.9,-1.2])child(group,geometry.box,side===z/Math.abs(z)?gold:localAccent,{x:side*3.7,y:2.65,z,sx:.22,sy:4.8,sz:.22,cast:false});
   child(group,geometry.box,gold,{y:5.1,z:-2.05,sx:7.8,sy:.16,sz:2.1,cast:false});
   break;
  case 'IT':
   child(group,geometry.cylinder,localAccent,{y:.75,z:-2.6,sx:2.2,sy:.22,sz:2.2,cast:false});
   for(const side of [-1,1])child(group,geometry.box,gold,{x:side*3.1,y:2.8,z:-2.6,sx:.20,sy:4.6,sz:.20,cast:false});
   break;
  case 'TN':
   for(const side of [-1,1]){child(group,geometry.box,material('#d9dde0',{roughness:.74}),{x:side*3.4,y:2.5,z:-2.0,sx:.48,sy:4.5,sz:.48});child(group,geometry.box,localAccent,{x:side*3.4,y:4.85,z:-2.0,sx:.62,sy:.12,sz:.62,cast:false});}
   break;
  case 'TR':
   child(group,geometry.sphere,localAccent,{y:3.9,z:-2.4,sx:2.1,sy:1.0,sz:2.1,cast:false});
   for(const side of [-1,1])child(group,geometry.cylinder,gold,{x:side*3.4,y:3.1,z:-2.4,sx:.16,sy:5.6,sz:.16,cast:false});
   break;
  case 'EE':
   for(const side of [-1,0,1]){const crystal=child(group,geometry.box,side===0?gold:localAccent,{x:side*2.6,y:3.2+Math.abs(side)*.5,z:-2.2,sx:.42,sy:5.4,sz:.42,ry:Math.PI/4,cast:false});crystal.rotation.z=side*.08;}
   break;
  default:break;
 }

 // Restored platforms become unmistakable civic landmarks without changing
 // portal authority or gameplay collision.
 if(item.restored){
  child(group,geometry.cylinder,energy,{y:3.5,z:.2,sx:.13,sy:6.5,sz:.13,cast:false});
  for(const side of [-1,1])child(group,geometry.box,gold,{x:side*2.2,y:1.2,z:-3.0,sx:.12,sy:2.2,sz:.12,cast:false});
 }
 return group;
}

export function createPremiumHeritageFacility(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Heritage-Facility-'+item.code;root.add(group);
 group.position.set(item.x,groundY(item.x,item.z),item.z);group.rotation.y=item.heading||0;
 const accent=item.color||'#00a8ff';
 const dark=material('#10161b',{roughness:.52,metalness:.48});
 const stone=material('#343b3f',{roughness:.76,metalness:.12});
 const gold=material('#d6b46a',{emissive:'#76591f',emissiveIntensity:.16,roughness:.24,metalness:.84});
 const glow=material(accent,{emissive:accent,emissiveIntensity:item.restored?.58:item.liberated?.36:.22,roughness:.18,metalness:.42});
 const glass=material('#123b50',{emissive:accent,emissiveIntensity:.12,roughness:.14,metalness:.24,transparent:true,opacity:.86});
 const w=item.width||11,d=item.depth||8;
 child(group,geometry.box,stone,{y:.32,sx:w*1.06,sy:.55,sz:d*1.06});
 child(group,geometry.box,dark,{y:2.75,sx:w,sy:4.8,sz:d});
 child(group,geometry.box,gold,{y:5.28,sx:w*.86,sy:.20,sz:d*.86,cast:false});
 child(group,geometry.box,glass,{y:2.7,z:d*.51,sx:w*.48,sy:2.8,sz:.10,cast:false});
 child(group,geometry.box,glow,{y:1.45,z:d*.565,sx:w*.28,sy:.10,sz:.06,cast:false});

 switch(item.code){
  case 'FR':
   for(const side of [-1,1])child(group,geometry.box,gold,{x:side*w*.34,y:3.0,z:d*.54,sx:.38,sy:5.4,sz:.34});
   child(group,geometry.box,glow,{y:5.8,z:d*.54,sx:w*.76,sy:.16,sz:.20,cast:false});
   break;
  case 'DZ':
   for(const side of [-1,1]){
    child(group,geometry.cylinder,stone,{x:side*w*.32,y:3.0,z:d*.49,sx:.50,sy:5.4,sz:.50});
    child(group,geometry.sphere,glow,{x:side*w*.32,y:5.95,z:d*.49,sx:.75,sy:.40,sz:.75,cast:false});
   }
   break;
  case 'ES':
   for(const side of [-1,0,1])child(group,geometry.box,side===0?gold:glow,{x:side*w*.24,y:3.5,z:d*.53,sx:.22,sy:6.2+Math.abs(side)*.8,sz:.24,rz:side*.15,cast:false});
   break;
  case 'MA':
   for(const side of [-1,1])for(const back of [0,1])child(group,geometry.box,back?gold:glow,{x:side*w*.32,y:3.0,z:d*(.48-.20*back),sx:.24,sy:5.2,sz:.24,cast:false});
   child(group,geometry.box,gold,{y:5.65,z:d*.36,sx:w*.76,sy:.16,sz:d*.34,cast:false});
   break;
  case 'IT':
   for(const side of [-1,0,1]){
    const x=side*w*.26;
    child(group,geometry.box,stone,{x,y:2.2,z:d*.55,sx:w*.18,sy:3.7,sz:.42});
    child(group,geometry.sphere,glow,{x,y:4.3,z:d*.55,sx:w*.09,sy:.44,sz:.44,cast:false});
   }
   break;
  case 'TN':
   child(group,geometry.cylinder,gold,{x:w*.30,y:4.4,z:d*.18,sx:.16,sy:7.8,sz:.16});
   child(group,geometry.box,glow,{x:w*.30,y:8.2,z:d*.18,sx:.50,sy:.24,sz:.50,cast:false});
   break;
  case 'TR':
   child(group,geometry.sphere,glow,{y:5.8,z:-d*.12,sx:2.4,sy:1.1,sz:2.4,cast:false});
   for(const side of [-1,1])child(group,geometry.cylinder,gold,{x:side*w*.34,y:4.4,z:-d*.12,sx:.14,sy:8.0,sz:.14});
   break;
  case 'EE':
   for(const side of [-1,0,1]){
    const crystal=child(group,geometry.box,side===0?gold:glow,{x:side*w*.25,y:4.1+Math.abs(side)*.5,z:d*.45,sx:.48,sy:6.5,sz:.48,ry:Math.PI/4,cast:false});
    crystal.rotation.z=side*.08;
   }
   break;
  default:break;
 }
 if(item.restored)child(group,geometry.ring,gold,{y:6.6,sx:3.2,sy:3.2,sz:3.2,rx:Math.PI/2,cast:false});
 return group;
}


export function createPremiumDistrictTerrace(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-District-Terrace-'+item.district;root.add(group);
 group.position.set(item.x,groundY(item.x,item.z),item.z);
 const stone=material('#272f34',{roughness:.84,metalness:.10});
 const dark=material('#11171c',{roughness:.58,metalness:.38});
 const gold=material('#d6b46a',{emissive:'#6f531d',emissiveIntensity:.10,roughness:.28,metalness:.76});
 const accent=material(item.accent||'#00a8ff',{emissive:item.accent||'#00a8ff',emissiveIntensity:.16+.04*(item.evolutionStage||0),roughness:.22,metalness:.36});
 const r=Math.max(18,item.radius||24),level=Math.max(0,item.level||0),steps=Math.max(2,item.steps||3);
 child(group,geometry.cylinder,dark,{y:-.12,sx:r*1.08,sy:.18,sz:r*1.08,cast:false});
 child(group,geometry.cylinder,stone,{y:-.02,sx:r,sy:.16,sz:r,cast:false});
 child(group,geometry.ring,accent,{y:.07,sx:r*.82,sy:r*.82,sz:r*.82,rx:Math.PI/2,cast:false});
 if(item.evolutionStage>=2)child(group,geometry.ring,gold,{y:.085,sx:r*.58,sy:r*.58,sz:r*.58,rx:Math.PI/2,cast:false});
 for(let i=0;i<steps;i++){
  const width=5.2+i*1.4,depth=2.2,dist=r*.84+i*2.6;
  child(group,geometry.box,stone,{y:.05+i*.05,z:dist,sx:width,sy:.10,sz:depth,cast:false});
 }
 if(level>0){
  for(const side of [-1,1]){
   child(group,geometry.box,dark,{x:side*r*.88,y:level*.42,z:0,sx:.40,sy:Math.max(.9,level*.82),sz:r*.54,cast:false});
   child(group,geometry.box,accent,{x:side*r*.88,y:level*.84,z:0,sx:.10,sy:.08,sz:r*.50,cast:false});
  }
 }
 return group;
}


export function createPremiumSkybridge(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Skybridge-'+item.bridgeId;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);group.rotation.y=item.heading||0;
 const dark=material('#111820',{roughness:.48,metalness:.52});
 const gold=material('#d6b46a',{emissive:'#72551c',emissiveIntensity:.20,roughness:.26,metalness:.80});
 const glass=material('#123e56',{emissive:'#00a8ff',emissiveIntensity:.30,roughness:.16,metalness:.28,transparent:true,opacity:.82});
 const h=item.height||10,w=item.width||5,length=Math.max(12,item.length||24);

 child(group,geometry.box,dark,{y:h,sx:w,sy:.42,sz:length});
 child(group,geometry.box,glass,{y:h+.26,sx:w*.82,sy:.05,sz:length*.96,cast:false});
 for(const side of [-1,1]){
  child(group,geometry.box,gold,{x:side*w*.48,y:h+.72,sx:.10,sy:1.15,sz:length*.98,cast:false});
  child(group,geometry.box,glass,{x:side*w*.45,y:h+1.18,sx:.05,sy:.09,sz:length*.94,cast:false});
 }
 for(const z of [-length*.32,length*.32]){
  child(group,geometry.box,dark,{y:h*.5,z,sx:.44,sy:h,sz:.44});
  child(group,geometry.box,gold,{y:h-.45,z,sx:.62,sy:.10,sz:.62,cast:false});
 }
 return group;
}


export function createPremiumCivicPlaza(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Civic-Plaza-'+item.district;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);
 const stone=material('#2a3034',{roughness:.86,metalness:.08});
 const gold=material('#d6b46a',{emissive:'#70521f',emissiveIntensity:.12,roughness:.28,metalness:.72});
 const blue=material('#133d52',{emissive:'#00a8ff',emissiveIntensity:.18,roughness:.24,metalness:.30});
 const r=Math.max(12,item.radius||20),compact=item.renderProfile==='mobileMedium',seatCount=compact?3:6;
 child(group,geometry.cylinder,stone,{y:.06,sx:r,sy:.12,sz:r,cast:false});
 child(group,geometry.ring,gold,{y:.14,sx:r*.78,sy:r*.78,sz:r*.78,rx:Math.PI/2,cast:false});
 if(!compact)child(group,geometry.ring,blue,{y:.16,sx:r*.44,sy:r*.44,sz:r*.44,rx:Math.PI/2,cast:false});
 for(let i=0;i<seatCount;i++){
  const a=i*Math.PI*2/seatCount,x=Math.cos(a)*r*.68,z=Math.sin(a)*r*.68;
  child(group,geometry.box,stone,{x,y:.34,z,sx:2.8,sy:.55,sz:.7,ry:-a,cast:false});
 }
 return group;
}

export function createPremiumDistrictLandmark(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-District-Landmark-'+item.landmarkId;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);
 const dark=material('#11181d',{roughness:.48,metalness:.46});
 const stone=material('#353b3e',{roughness:.74,metalness:.12});
 const accent=material(item.accent||'#d6b46a',{emissive:item.accent||'#d6b46a',emissiveIntensity:.32+(item.prestige?.22:0),roughness:.20,metalness:.62});
 const gold=material('#d6b46a',{emissive:'#7f6125',emissiveIntensity:.18,roughness:.24,metalness:.86});
 const h=Math.max(28,item.height||48),compact=item.renderProfile==='mobileMedium';
 child(group,geometry.cylinder,dark,{y:.18,sx:5.8,sy:.35,sz:5.8});
 switch(item.archetype){
  case 'gateway':
   for(const side of [-1,1])child(group,geometry.box,stone,{x:side*3.7,y:h*.34,sx:.9,sy:h*.66,sz:1.1});
   child(group,geometry.box,gold,{y:h*.68,sx:8.4,sy:.55,sz:1.35});
   child(group,geometry.box,accent,{y:h*.48,sx:5.5,sy:.18,sz:.20,cast:false});
   break;
  case 'tree':
   child(group,geometry.cylinder,stone,{y:h*.28,sx:.75,sy:h*.55,sz:.75});
   {const crowns=compact?4:7;for(let i=0;i<crowns;i++){const a=i*Math.PI*2/crowns;child(group,geometry.sphere,accent,{x:Math.cos(a)*3.0,y:h*.62+Math.sin(i)*1.2,z:Math.sin(a)*3.0,sx:2.2,sy:1.5,sz:2.2,cast:false});}}
   break;
  case 'arena':
   child(group,geometry.cylinder,stone,{y:h*.18,sx:5.4,sy:h*.28,sz:5.4});
   {const ribs=compact?4:8;for(let i=0;i<ribs;i++){const a=i*Math.PI*2/ribs;child(group,geometry.box,i%2?accent:gold,{x:Math.cos(a)*4.1,y:h*.48,z:Math.sin(a)*4.1,sx:.24,sy:h*.56,sz:.24,ry:-a,cast:false});}}
   break;
  case 'archive':
   for(const side of [-1,1])child(group,geometry.box,stone,{x:side*2.7,y:h*.34,sx:1.2,sy:h*.62,sz:2.0});
   child(group,geometry.ring,accent,{y:h*.72,sx:4.3,sy:4.3,sz:4.3,rx:Math.PI/2,cast:false});
   break;
  case 'market':
  case 'hall':
   child(group,geometry.box,stone,{y:h*.28,sx:6.2,sy:h*.48,sz:5.4});
   child(group,geometry.box,accent,{y:h*.56,z:2.8,sx:5.0,sy:.18,sz:.12,cast:false});
   for(const side of [-1,1])child(group,geometry.cylinder,gold,{x:side*3.3,y:h*.43,z:2.6,sx:.20,sy:h*.54,sz:.20,cast:false});
   break;
  case 'harbor':
   child(group,geometry.cylinder,stone,{y:h*.34,sx:1.5,sy:h*.65,sz:1.5});
   for(const side of [-1,1])child(group,geometry.box,accent,{x:side*2.0,y:h*.62,sx:3.4,sy:.18,sz:.32,rz:side*.32,cast:false});
   break;
  case 'matrix':
   child(group,geometry.box,dark,{y:h*.38,sx:3.2,sy:h*.70,sz:3.2,ry:Math.PI/4});
   for(const side of [-1,1])child(group,geometry.box,accent,{x:side*2.6,y:h*.52,sx:.12,sy:h*.55,sz:.12,cast:false});
   child(group,geometry.sphere,accent,{y:h*.82,sx:1.2,sy:1.2,sz:1.2,cast:false});
   break;
  case 'spire':
   if(item.landmarkId==='broken_circle_spire'){
    const fragments=clamp(Number(item.fragmentCount||0),0,8),coreRadius=11.5;
    child(group,geometry.cylinder,dark,{y:.65,sx:15.8,sy:1.15,sz:15.8});
    child(group,geometry.cylinder,stone,{y:2.0,sx:12.8,sy:1.2,sz:12.8});
    child(group,geometry.ring,gold,{y:3.35,sx:10.6,sy:10.6,sz:10.6,rx:Math.PI/2,cast:false});
    child(group,geometry.ring,accent,{y:3.48,sx:7.7,sy:7.7,sz:7.7,rx:Math.PI/2,cast:false});
    for(let i=0;i<8;i++){
     const a=-Math.PI/2+i*Math.PI/4,active=i<fragments;
     const fragmentMat=active?gold:dark;
     const fx=Math.cos(a)*coreRadius,fz=Math.sin(a)*coreRadius,fy=8.4+(i%2)*1.4;
     const fragment=child(group,geometry.box,fragmentMat,{x:fx,y:fy,z:fz,sx:2.35,sy:7.6,sz:1.15,ry:-a+.28});
     fragment.rotation.z=(i%2?-.12:.12);
     if(active){
      child(group,geometry.box,accent,{x:fx,y:fy+5.7,z:fz,sx:1.55,sy:.18,sz:.34,ry:-a+.28,cast:false});
      child(group,geometry.sphere,accent,{x:fx,y:fy+8.3,z:fz,sx:.42,sy:.42,sz:.42,cast:false});
     }
    }
    child(group,geometry.cylinder,stone,{y:h*.28,sx:3.8,sy:h*.50,sz:3.8});
    child(group,geometry.cylinder,dark,{y:h*.56,sx:2.4,sy:h*.20,sz:2.4});
    child(group,geometry.ring,accent,{y:h*.72,sx:5.4,sy:5.4,sz:5.4,rx:Math.PI/2,cast:false});
    child(group,geometry.cylinder,gold,{y:h*.84,sx:.30,sy:h*.22,sz:.30,cast:false});
    child(group,geometry.sphere,accent,{y:h*.98,sx:1.15,sy:1.15,sz:1.15,cast:false});
    for(const side of [-1,1]){
     child(group,geometry.box,stone,{x:side*8.4,y:5.1,z:0,sx:5.8,sy:.55,sz:2.3,rz:side*.06});
     child(group,geometry.box,gold,{x:side*8.4,y:5.68,z:0,sx:5.1,sy:.08,sz:1.7,cast:false});
    }
    child(group,geometry.box,dark,{y:-1.15,z:7.8,sx:6.2,sy:2.2,sz:5.8});
    child(group,geometry.box,accent,{y:.10,z:10.55,sx:3.8,sy:.15,sz:.28,cast:false});
   }else{
    child(group,geometry.box,stone,{y:h*.34,sx:3.2,sy:h*.64,sz:3.2});
    child(group,geometry.cylinder,gold,{y:h*.75,sx:.28,sy:h*.34,sz:.28,cast:false});
    child(group,geometry.sphere,accent,{y:h*.94,sx:.85,sy:.85,sz:.85,cast:false});
   }
   break;
  case 'obelisk':
  default:
   child(group,geometry.box,stone,{y:h*.34,sx:3.2,sy:h*.64,sz:3.2});
   child(group,geometry.cylinder,gold,{y:h*.75,sx:.28,sy:h*.34,sz:.28,cast:false});
   child(group,geometry.sphere,accent,{y:h*.94,sx:.85,sy:.85,sz:.85,cast:false});
   break;
 }
 if(item.prestige)child(group,geometry.ring,gold,{y:h+2.5,sx:3.8,sy:3.8,sz:3.8,rx:Math.PI/2,cast:false});
 return group;
}

export function createPremiumWaterFeature(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Water-'+item.waterId;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);group.rotation.y=item.heading||0;
 const water=material('#1e7896',{emissive:'#00a8ff',emissiveIntensity:.10+.22*(item.shimmer||0),roughness:.10,metalness:.06,transparent:true,opacity:.68,depthWrite:false});
 const foam=material('#9fe9ff',{emissive:'#54d8ff',emissiveIntensity:.25,roughness:.18,metalness:.02,transparent:true,opacity:.48,depthWrite:false});
 const edge=material('#2a3034',{roughness:.82,metalness:.10});
 if(item.kind==='basin'){
  child(group,geometry.cylinder,edge,{y:.02,sx:item.width*.54,sy:.10,sz:item.depth*.54,cast:false});
  child(group,geometry.cylinder,water,{y:.10,sx:item.width*.48,sy:.035,sz:item.depth*.48,cast:false});
  child(group,geometry.ring,foam,{y:.15,sx:Math.min(item.width,item.depth)*.34,sy:Math.min(item.width,item.depth)*.34,sz:Math.min(item.width,item.depth)*.34,rx:Math.PI/2,cast:false});
 }else if(item.kind==='cascade'){
  const drop=Math.max(8,item.drop||12),width=Math.max(8,item.width||14),depth=Math.max(12,item.depth||item.length*.28||24);
  child(group,geometry.box,edge,{y:.08,z:depth*.18,sx:width*1.35,sy:.16,sz:depth*.82,cast:false});
  child(group,geometry.box,water,{y:.18,z:depth*.18,sx:width,sy:.04,sz:depth*.80,cast:false});
  child(group,geometry.box,water,{y:drop*.48,z:-depth*.28,sx:width,sy:drop,sz:.18,cast:false});
  child(group,geometry.box,foam,{y:.20,z:-depth*.36,sx:width*1.15,sy:.08,sz:2.8,cast:false});
 }else{
  const length=Math.max(20,item.length||item.depth||40),width=Math.max(8,item.width||14);
  child(group,geometry.box,edge,{y:.02,sx:width*1.18,sy:.10,sz:length,cast:false});
  child(group,geometry.box,water,{y:.10,sx:width,sy:.035,sz:length*.98,cast:false});
  for(const side of [-1,1])child(group,geometry.box,foam,{x:side*width*.51,y:.13,sx:.08,sy:.04,sz:length*.96,cast:false});
 }
 return group;
}

export function createPremiumStreetFurniture(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Street-'+item.district+'-'+item.kind;root.add(group);
 group.position.set(item.x,groundY(item.x,item.z),item.z);group.rotation.y=item.heading||0;
 const dark=material('#141b20',{roughness:.62,metalness:.34});
 const stone=material('#3a4042',{roughness:.82,metalness:.08});
 const gold=material('#d6b46a',{emissive:'#6f531d',emissiveIntensity:.14,roughness:.28,metalness:.78});
 const accent=material(item.accent||'#00a8ff',{emissive:item.accent||'#00a8ff',emissiveIntensity:.22,roughness:.22,metalness:.40});
 const green=material('#315a3d',{roughness:.86,metalness:.02});
 const compact=item.renderProfile==='mobileMedium';
 if(item.kind==='planter'){
  child(group,geometry.cylinder,stone,{y:.26,sx:1.05,sy:.52,sz:1.05});
  child(group,geometry.sphere,green,{y:1.05,sx:1.25,sy:.85,sz:1.25,cast:false});
  child(group,geometry.ring,accent,{y:.56,sx:1.12,sy:1.12,sz:1.12,rx:Math.PI/2,cast:false});
 }else if(item.kind==='bench'){
  child(group,geometry.box,stone,{y:.32,sx:2.4,sy:.28,sz:.62});
  child(group,geometry.box,dark,{y:.82,z:.42,sx:2.4,sy:.78,sz:.12});
  child(group,geometry.box,gold,{y:.48,sx:2.15,sy:.06,sz:.68,cast:false});
 }else if(item.kind==='kiosk'){
  child(group,geometry.box,dark,{y:1.45,sx:2.1,sy:2.7,sz:1.65});
  child(group,geometry.box,accent,{y:2.2,z:.87,sx:1.55,sy:.65,sz:.08,cast:false});
  child(group,geometry.box,gold,{y:2.92,sx:2.35,sy:.14,sz:1.9,cast:false});
  if(!compact)for(const side of [-1,1])child(group,geometry.cylinder,gold,{x:side*.88,y:1.45,z:.8,sx:.08,sy:2.45,sz:.08,cast:false});
 }else if(item.kind==='lamp'){
  child(group,geometry.cylinder,dark,{y:1.95,sx:.10,sy:3.8,sz:.10});
  child(group,geometry.box,accent,{y:3.98,sx:.42,sy:.16,sz:.42,cast:false});
  child(group,geometry.box,gold,{y:.16,sx:.62,sy:.12,sz:.62,cast:false});
 }else if(item.kind==='sign'){
  child(group,geometry.cylinder,dark,{y:1.1,sx:.09,sy:2.1,sz:.09});
  child(group,geometry.box,accent,{y:2.25,sx:1.55,sy:.72,sz:.10,cast:false});
  child(group,geometry.box,gold,{y:2.25,z:.065,sx:1.2,sy:.08,sz:.025,cast:false});
 }else{
  for(const side of [-1,1])child(group,geometry.cylinder,dark,{x:side*1.35,y:1.55,sx:.10,sy:3.0,sz:.10});
  child(group,geometry.box,gold,{y:3.08,sx:3.1,sy:.14,sz:1.5,cast:false});
  child(group,geometry.box,accent,{y:2.96,sx:2.65,sy:.06,sz:1.15,cast:false});
 }
 return group;
}


export function createPremiumTransitLink(item,{root,geometry,material,groundY}){
 const group=new THREE.Group();group.name='3B-Transit-Link-'+item.transport;root.add(group);
 const y=groundY(item.x,item.z);group.position.set(item.x,y,item.z);group.rotation.y=item.heading||0;
 const dark=material('#181f24',{roughness:.52,metalness:.48});
 const gold=material('#d6b46a',{emissive:'#6f531d',emissiveIntensity:.16,roughness:.24,metalness:.82});
 const blue=material('#1b607b',{emissive:'#00a8ff',emissiveIntensity:.18,roughness:.18,metalness:.32});
 const length=Math.max(8,item.length||12),h=item.height||0,compact=item.renderProfile==='mobileMedium';
 if(item.transport==='train'){
  for(const side of [-1,1])child(group,geometry.box,gold,{x:side*.82,y:h+.10,sx:.12,sy:.08,sz:length,cast:false});
  const sleepers=compact?Math.min(4,Math.max(2,Math.floor(length/90))):Math.min(10,Math.max(3,Math.floor(length/45)));
  for(let i=0;i<sleepers;i++){const z=-length/2+(i+.5)*length/sleepers;child(group,geometry.box,dark,{y:h,z,sx:2.25,sy:.08,sz:.24,cast:false});}
 }else{
  const cable=item.transport==='telepheric'?blue:gold;
  child(group,geometry.box,cable,{y:h,sx:Math.max(.06,item.width||.1),sy:.06,sz:length,cast:false});
  for(const z of [-length*.46,length*.46])child(group,geometry.cylinder,dark,{y:h*.5,z,sx:.14,sy:Math.max(2,h),sz:.14,cast:false});
 }
 return group;
}
