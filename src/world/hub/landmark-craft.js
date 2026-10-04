import {civicShaftGeometry,civicGlazingGeometry} from './platform-architecture.js';

export const HUB_AAA_LANDMARKS=Object.freeze([
 'tour_cercle_brise','archives_memoire','arena_3b','quartier_commerce',
 'docks_transports','portail_ville_3b','jardins_unite',
]);

/**
 * Final authored landmark pass for the 3B Hub.
 *
 * The pass deliberately stays inside the existing runtime contract: no asset
 * downloads, no save migration and no new interaction IDs. Most opaque parts
 * are merged by platform-scene after creation, so the stronger silhouettes do
 * not become hundreds of draw calls on mobile.
 */
export function addLandmarkCraft({mesh,geo,box,cylinder,materials,buildings,THREE}){
 const {dark,gold,glass,stone,blue}=materials;
 let authoredMeshes=0;
 const part=(...args)=>{authoredMeshes++;return mesh(...args);};
 const building=id=>buildings.find(item=>item.buildingId===id);
 const average=(...items)=>{
  const valid=items.filter(Boolean);
  return valid.length?{
   x:valid.reduce((sum,item)=>sum+item.buildingX,0)/valid.length,
   z:valid.reduce((sum,item)=>sum+item.buildingZ,0)/valid.length,
  }:{x:0,z:0};
 };
 const worldPoint=(cx,cz,heading,lateral,forward)=>({
  x:cx+Math.cos(heading)*lateral+Math.sin(heading)*forward,
  z:cz-Math.sin(heading)*lateral+Math.cos(heading)*forward,
 });
 const orientedBox=(material,cx,y,cz,length,height,depth,heading=0)=>{
  const object=part(box,material,cx,y,cz,length,height,depth);
  object.rotation.y=heading;
  return object;
 };
 const localBox=(material,cx,y,cz,length,height,depth,heading,lateral=0,forward=0)=>{
  const point=worldPoint(cx,cz,heading,lateral,forward);
  return orientedBox(material,point.x,y,point.z,length,height,depth,heading);
 };
 const beam=(material,a,b,y,height=.24,depth=.24)=>{
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  return orientedBox(material,(a.x+b.x)/2,y,(a.z+b.z)/2,length,height,depth,-Math.atan2(dz,dx));
 };
 const tube=(points,radius,material,segments=Math.max(24,points.length*2))=>{
  if(points.length<2)return null;
  return part(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,radius,7,false)),material,0,0,0);
 };
 const arcTube=({cx,cz,rx,rz=rx,y,start,end,radius=.16,material=gold,steps=28})=>{
  const points=Array.from({length:steps+1},(_,index)=>{
   const angle=start+(end-start)*index/steps;
   return new THREE.Vector3(cx+Math.cos(angle)*rx,y,cz+Math.sin(angle)*rz);
  });
  return tube(points,radius,material,steps*2);
 };
 const ellipticalRing=({cx,cz,rx,rz,y,radius=.15,material=gold,gapCenter=null,gap=.35,steps=72})=>{
  if(gapCenter===null)return arcTube({cx,cz,rx,rz,y,start:0,end:Math.PI*2,radius,material,steps});
  return arcTube({cx,cz,rx,rz,y,start:gapCenter+gap,end:gapCenter+Math.PI*2-gap,radius,material,steps});
 };
 const lantern=(x,y,z,height=4,material=blue)=>{
  part(cylinder,dark,x,y+height*.42,z,.28,height*.84,.28);
  part(cylinder,gold,x,y+height*.85,z,.38,.18,.38);
  const glow=part(geo(new THREE.IcosahedronGeometry(.34,1)),material,x,y+height,z);
  glow.castShadow=false;
  return glow;
 };
 const crownSpire=(x,z,height,width=.7,material=gold,rotation=0)=>{
  const spire=part(geo(new THREE.ConeGeometry(width,height,5)),material,x,height/2,z);
  spire.rotation.y=rotation;
  return spire;
 };
 const facadeRibs=(b,count=4)=>{
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=b;
  for(const side of [-1,1]){
   for(let index=0;index<count;index++){
    const forward=-d*.34+index*(d*.68/Math.max(1,count-1));
    localBox(gold,x,h*.5,z,.12,h*.86,.16,0,side*(w/2+.12),forward);
   }
   localBox(glass,x,h*.57,z,.2,h*.38,d*.5,0,side*(w/2+.04),0);
  }
  for(const edge of [-1,1])localBox(gold,x,h-.25,z,w*.78,.18,.2,0,0,edge*(d/2+.08));
 };
 const entranceCanopy=b=>{
  const {buildingX:x,buildingZ:z,width:w,depth:d}=b;
  for(const side of [-1,1]){
   const points=Array.from({length:11},(_,index)=>{
    const t=index/10;
    return new THREE.Vector3(x+side*w*.34,4.7+Math.sin(t*Math.PI)*1.9,z+d/2-.8+t*5.4);
   });
   tube(points,.095,gold,28);
  }
  for(let index=0;index<6;index++){
   const t=index/5,y=4.7+Math.sin(t*Math.PI)*1.9;
   orientedBox(index%2?glass:gold,x,y,z+d/2-.8+t*5.4,w*.68,index%2?.06:.1,index%2?.7:.14,0);
  }
 };

 // Five-layer facade language: plinth, body, depth, crown and visible life.
 for(const b of buildings){
  entranceCanopy(b);
  facadeRibs(b,b.width>20?6:4);
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=b;
  part(box,stone,x,.32,z,w+1.2,.64,d+1.2);
  part(box,gold,x,.68,z+d/2+.28,w*.82,.12,.24);
  for(const side of [-1,1]){
   part(box,gold,x+side*w*.3,h+.7,z+d*.3,.08,1.4,d*.25);
   part(box,gold,x+side*w*.3,h+1.4,z+d*.3,w*.18,.08,d*.25);
  }
  for(const side of [-1,1])for(let index=0;index<3;index++)part(box,glass,x+side*(w/2+.055),2.2+index*2.05,z-d*.2,.12,1.25,d*.23);
 }

 // TOUR DU CERCLE BRISÉ — inhabited core, eight asymmetric blades and crown.
 const coreProfile=[[0,1],[.18,1],[.48,.9],[.72,.75],[1,.58]],coreHeight=62;
 part(geo(civicShaftGeometry(17,16,coreHeight,coreProfile)),dark,0,1.28,0);
 const scaleAt=y=>{
  const t=Math.max(0,Math.min(1,y/coreHeight));
  for(let index=1;index<coreProfile.length;index++)if(t<=coreProfile[index][0]){
   const [a,sa]=coreProfile[index-1],[b,sb]=coreProfile[index];
   return sa+(sb-sa)*(t-a)/(b-a);
  }
  return coreProfile.at(-1)[1];
 };
 for(const level of [7,13,20,28,37,47,57]){
  const scale=scaleAt(level);
  for(const side of [-1,1]){
   part(geo(civicGlazingGeometry(17,16,coreHeight,coreProfile,level,side,'z',.72,3.2)),glass,0,1.28,0);
   part(box,gold,0,level+2.85,side*(8*scale+.18),12.2*scale,.11,.18);
   part(geo(civicGlazingGeometry(17,16,coreHeight,coreProfile,level,side,'x',.72,3.2)),glass,0,1.28,0);
   part(box,gold,side*(8.5*scale+.18),level+2.85,0,.18,.11,11.4*scale);
  }
 }
 const bladeHeights=[94,79,88,72,98,82,91,76];
 for(let index=0;index<8;index++){
  const angle=index*Math.PI/4+(index%2?.035:-.025),radius=7.3+(index%3)*.55;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,height=bladeHeights[index];
  const width=4.7+(index%2)*.7,depth=7.3+(index%3)*.55;
  const profile=[[0,1],[.24,1],[.58,.82],[.82,.64],[1,.42]];
  const blade=part(geo(civicShaftGeometry(width,depth,height,profile)),index%2?dark:stone,x,1.3,z);
  blade.rotation.y=-angle+Math.PI/2+(index%2?.08:-.06);
  const heading=blade.rotation.y;
  for(const offset of [-.29,.29])localBox(gold,x,height*.48+1.3,z,.13,height*.86,.16,heading,offset*width,depth*.48);
  for(const band of [.24,.48,.72])localBox(gold,x,1.3+height*band,z,width*(1-band*.35),.14,depth*(1-band*.35),heading,0,0);
  localBox(glass,x,height*.54+1.3,z,width*.56,Math.max(10,height*.42),.14,heading,0,depth*.51);
  const point=worldPoint(x,z,heading,0,depth*.12);
  crownSpire(point.x,point.z,8+(index%3)*2,.5,gold,heading);
 }
 for(const [radius,y,gapCenter,gap] of [[14,31,.28,.32],[18,53,2.2,.42],[22,74,4.45,.5]]){
  ellipticalRing({cx:0,cz:0,rx:radius,rz:radius*.93,y,radius:.22,material:gold,gapCenter,gap,steps:82});
  ellipticalRing({cx:0,cz:0,rx:radius+.55,rz:radius*.93+.55,y:y+.75,radius:.075,material:blue,gapCenter,gap:gap+.03,steps:82});
 }
 for(const y of [18,39,61])for(let index=0;index<8;index++){
  const angle=index*Math.PI/4,start={x:Math.cos(angle)*5.2,z:Math.sin(angle)*5.2},end={x:Math.cos(angle)*12.8,z:Math.sin(angle)*12.8};
  beam(index%2?gold:stone,start,end,y,.34,1.05);
 }
 for(let index=0;index<8;index++)lantern(Math.cos(index*Math.PI/4)*20,1.4,Math.sin(index*Math.PI/4)*20,5,index%2?blue:gold);
 const crownCrystal=part(geo(new THREE.IcosahedronGeometry(3.2,2)),blue,0,91,0);crownCrystal.castShadow=false;
 for(const tilt of [-.55,0,.55]){
  const ring=part(geo(new THREE.TorusGeometry(6.5,.18,7,64)),gold,0,91,0);
  ring.rotation.set(Math.PI/2,tilt,tilt*.45);
 }

 // ARCHIVES DE LA MÉMOIRE — inhabited archive campus and reading lantern.
 const archives=building('memory_archives'),cards=building('living_cards_gallery');
 if(archives){
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=archives,rear=z-d/2-4;
  const towers=[[-w*.28,42,5.2],[0,55,6.6],[w*.28,47,5.6]];
  for(const [offset,height,width] of towers){
   const shaft=part(geo(civicShaftGeometry(width,width*.78,height,[[0,1],[.62,.9],[.9,.62],[1,.28]])),dark,x+offset,1.2,rear);
   shaft.rotation.y=offset*.015;
   part(box,glass,x+offset,height*.55,rear-width*.42,width*.48,height*.48,.12);
   crownSpire(x+offset,rear,height*.2,width*.22,gold,offset*.02);
  }
  for(let index=0;index<14;index++){
   const lateral=-w*.62+index*(w*1.24/13),height=9+(index%4)*2.2;
   crownSpire(x+lateral,rear,height,.38,index%2?gold:stone,index*.12);
  }
  part(geo(new THREE.CylinderGeometry(5.4,5.4,5,8)),glass,x,h+29,rear);
  part(geo(new THREE.CylinderGeometry(6.3,5.4,1.1,8)),gold,x,h+32,rear);
  part(geo(new THREE.SphereGeometry(5.4,24,12,0,Math.PI*2,0,Math.PI/2)),dark,x,h+32.5,rear);
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4;
   part(cylinder,gold,x+Math.cos(angle)*5.45,h+29,rear+Math.sin(angle)*5.45,.11,6,.11);
  }
  ellipticalRing({cx:x,cz:z+d*.08,rx:w*.78,rz:d*.62,y:1.05,radius:.18,material:gold,gapCenter:Math.PI/2,gap:.34,steps:58});
  for(const side of [-1,1]){
   const wing=part(box,stone,x+side*w*.58,h*.78,z-d*.2,2.2,h*1.38,d*.55);wing.rotation.z=side*.12;
   part(box,gold,x+side*w*.58,h*1.45,z-d*.2,2.5,.22,d*.6).rotation.z=side*.12;
  }
  if(cards){
   const start={x:x+w*.38,z:rear},end={x:cards.buildingX-w*.35,z:cards.buildingZ-cards.depth*.34};
   beam(dark,start,end,h+11,1.05,2.2);
   tube([new THREE.Vector3(start.x,h+12,start.z),new THREE.Vector3((start.x+end.x)/2,h+14,(start.z+end.z)/2),new THREE.Vector3(end.x,h+12,end.z)],.17,gold,36);
  }
 }

 // ARÈNE 3B — full oval amphitheatre, physical spectacle and skyline.
 const arena=building('arena_3b');
 if(arena){
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=arena;
  part(geo(new THREE.CylinderGeometry(1,1,.35,64)),stone,x,.22,z,9.8,.35,7.1);
  const front=Math.PI/2;
  for(let tier=0;tier<4;tier++){
   const rx=w*.48+tier*1.85,rz=d*.46+tier*1.45,y=1.6+tier*1.75;
   for(let index=0;index<40;index++){
    const angle=(index+.5)*Math.PI*2/40,delta=Math.atan2(Math.sin(angle-front),Math.cos(angle-front));
    if(Math.abs(delta)<.35)continue;
    const seat=part(box,(index+tier)%2?dark:stone,x+Math.cos(angle)*rx,y,z+Math.sin(angle)*rz,2.25,.42,1.45);
    seat.rotation.y=-angle+Math.PI/2;
   }
   ellipticalRing({cx:x,cz:z,rx:rx+.35,rz:rz+.35,y:y+.46,radius:.095,material:tier%2?gold:blue,gapCenter:front,gap:.35,steps:82});
  }
  for(const angle of [0,Math.PI,front,front+Math.PI]){
   const px=x+Math.cos(angle)*(w*.66),pz=z+Math.sin(angle)*(d*.62),heading=-angle+Math.PI/2;
   localBox(dark,px,4.2,pz,5.4,8.4,2.4,heading,0,0);
   localBox(gold,px,8.55,pz,6.2,.32,2.8,heading,0,0);
   const archPoints=Array.from({length:13},(_,i)=>{
    const t=i*Math.PI/12,point=worldPoint(px,pz,heading,Math.cos(t)*2.2,0);
    return new THREE.Vector3(point.x,3.2+Math.sin(t)*3.8,point.z);
   });
   tube(archPoints,.15,gold,32);
  }
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,px=x+Math.cos(angle)*(w*.75),pz=z+Math.sin(angle)*(d*.74);
   lantern(px,.8,pz,8,index%2?blue:gold);
  }
  for(const y of [h+5,h+8])ellipticalRing({cx:x,cz:z,rx:w*.68,rz:d*.62,y,radius:y===h+5?.24:.1,material:y===h+5?gold:blue,gapCenter:front,gap:.4,steps:88});
  const arenaOrb=part(geo(new THREE.IcosahedronGeometry(1.7,1)),blue,x,h+12,z);arenaOrb.castShadow=false;
 }

 // QUARTIER COMMERCE — market rotunda, arcades, kiosks and delivery spine.
 const house=building('house_3b'),garage=building('garage_3b');
 if(house&&garage){
  const center=average(house,garage),cx=center.x-15,cz=center.z;
  for(let index=0;index<24;index++){
   const angle=index*Math.PI*2/24,px=cx+Math.cos(angle)*13.5,pz=cz+Math.sin(angle)*10.5;
   part(cylinder,index%3?stone:dark,px,3.2,pz,.36,6.4,.36);
   part(cylinder,gold,px,6.55,pz,.47,.24,.47);
   if(index%2===0)lantern(px,6.5,pz,2.4,index%4===0?blue:gold);
  }
  ellipticalRing({cx,cz,rx:13.5,rz:10.5,y:6.65,radius:.25,material:gold,gapCenter:0,gap:.28,steps:84});
  ellipticalRing({cx,cz,rx:11.2,rz:8.4,y:7.8,radius:.11,material:blue,gapCenter:0,gap:.34,steps:76});
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,px=cx+Math.cos(angle)*8.2,pz=cz+Math.sin(angle)*6.4;
   const kiosk=part(geo(new THREE.CylinderGeometry(2.1,2.35,2.4,8)),index%2?dark:stone,px,1.2,pz);kiosk.rotation.y=angle;
   part(geo(new THREE.CylinderGeometry(2.45,1.8,.55,8)),gold,px,2.65,pz);
   part(box,glass,px,1.5,pz+Math.sin(angle)*2.1,2.2,.8,.12).rotation.y=-angle+Math.PI/2;
  }
  for(const side of [-1,1]){
   const start={x:cx+side*5,z:cz+13},end={x:cx+side*5,z:cz+26};
   beam(stone,start,end,.35,.7,3.4);
   for(let index=0;index<5;index++)lantern(start.x,.5,start.z+index*3,3,index%2?gold:blue);
  }
  const canopy=part(geo(new THREE.CylinderGeometry(4.8,7.8,3.2,8,1,true)),glass,cx,9.6,cz);canopy.castShadow=false;
  part(geo(new THREE.CylinderGeometry(5.2,8.2,.45,8)),gold,cx,11.4,cz);
 }

 // DOCKS & TRANSPORTS — passenger terminal, piers, cranes and wayfinding.
 const marina=building('central_marina'),shipyard=building('shipyard_3b'),station=building('train_station');
 if(marina&&shipyard&&station){
  const center=average(marina,shipyard,station),cx=center.x,cz=center.z+7;
  for(const xOffset of [-28,0,28]){
   const pierZ=cz+23;
   part(box,stone,cx+xOffset,.32,pierZ,8,.64,42);
   part(box,gold,cx+xOffset,.7,pierZ,8.5,.12,42.5);
   for(let index=0;index<7;index++){
    const pz=pierZ-18+index*6;
    for(const side of [-1,1])part(cylinder,dark,cx+xOffset+side*4.35,-1.4,pz,.34,4,.34);
    if(index<6)lantern(cx+xOffset+3.1,.75,pz,3.2,index%2?blue:gold);
   }
   const shelter=part(geo(new THREE.CylinderGeometry(4.2,5.2,2.6,8,1,true)),glass,cx+xOffset,5.1,pierZ-7);shelter.castShadow=false;
   part(geo(new THREE.CylinderGeometry(4.5,5.5,.38,8)),gold,cx+xOffset,6.55,pierZ-7);
  }
  for(const side of [-1,1]){
   const craneX=cx+side*19,craneZ=cz+8;
   part(box,dark,craneX,8,craneZ,1.4,16,1.4);
   part(box,gold,craneX,16.2,craneZ,2.1,.45,2.1);
   const arm=orientedBox(gold,craneX+side*6.5,16.3,craneZ,13,.55,.7,0);arm.rotation.z=-side*.08;
   part(box,dark,craneX+side*12.2,11.3,craneZ,.22,10,.22);
   part(box,stone,craneX+side*12.2,6.3,craneZ,3.2,.6,2.2);
  }
  for(const side of [-1,1]){
   const points=Array.from({length:13},(_,index)=>{const t=index*Math.PI/12;return new THREE.Vector3(cx+side*12+Math.cos(t)*10,7+Math.sin(t)*8,cz-3);});
   tube(points,.28,gold,40);
  }
  part(box,dark,cx,4.2,cz-3,27,8.4,6.5);
  part(box,glass,cx,5.1,cz+.3,22,5.6,.14);
  part(box,gold,cx,8.65,cz-3,29,.45,7.2);
  for(let index=0;index<7;index++)part(box,blue,cx-10.5+index*3.5,7.5,cz+.45,2.1,.12,.12);
 }

 // PORTAIL VILLE 3B — monumental destination ring and preparation court.
 const planning=building('city_planning_office'),gallery=building('city_gallery');
 if(planning&&gallery){
  const center=average(planning,gallery),cx=center.x-2,cz=center.z+1,heading=-Math.PI/4;
  for(const radius of [8.2,9.5]){
   const ring=part(geo(new THREE.TorusGeometry(radius,radius===8.2?.38:.13,8,72)),radius===8.2?gold:blue,cx,11,cz);ring.rotation.y=heading;
  }
  for(const facing of [0,Math.PI]){
   const membrane=part(geo(new THREE.CircleGeometry(7.75,64)),glass,cx,11,cz);membrane.rotation.y=heading+facing;membrane.castShadow=false;
  }
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,local={x:Math.cos(angle)*6.5,y:11+Math.sin(angle)*6.5},point=worldPoint(cx,cz,heading,local.x,0);
   const spoke=part(box,index%2?gold:blue,point.x,local.y,point.z,.16,6.4,.14);spoke.rotation.z=-angle;spoke.rotation.y=heading;
  }
  for(const side of [-1,1]){
   localBox(dark,cx,7,cz,2.2,14,3.6,heading,side*10.2,0);
   localBox(gold,cx,14.25,cz,3,1,4.2,heading,side*10.2,0);
   for(let level=0;level<3;level++)localBox(blue,cx,4+level*3.4,cz,.18,1.6,3.75,heading,side*9.05,0);
  }
  for(let index=0;index<9;index++){
   const point=worldPoint(cx,cz,heading,-8+index*2,12+index*.45);lantern(point.x,.3,point.z,3.8,index%2?gold:blue);
  }
  for(const side of [-1,1]){
   const start=worldPoint(cx,cz,heading,side*5,-17),end=worldPoint(cx,cz,heading,side*5,8);beam(stone,start,end,.26,.52,1.8);
  }
  const beacon=part(geo(new THREE.IcosahedronGeometry(1.9,2)),blue,cx,20.8,cz);beacon.castShadow=false;
 }

 // JARDINS DE L'UNITÉ — terraced water gardens, pergolas and glass houses.
 const memorial=building('workers_memorial'),refuge=building('wildlife_refuge');
 if(memorial&&refuge){
  const center=average(memorial,refuge),cx=center.x,cz=center.z;
  for(const [rx,rz,y,material] of [[20,15,.28,stone],[16.4,12.2,.72,gold],[12.5,9.1,1.16,stone]])ellipticalRing({cx,cz,rx,rz,y,radius:material===gold?.22:.32,material,gapCenter:-.55,gap:.32,steps:84});
  for(const [xOffset,zOffset,rx,rz] of [[-6,-2,5.2,3.5],[6,3,4.2,2.8]]){
   const basin=part(geo(new THREE.CylinderGeometry(1,1,.42,48)),stone,cx+xOffset,.35,cz+zOffset,rx,.42,rz);basin.castShadow=false;
   const water=part(geo(new THREE.CircleGeometry(1,48)),blue,cx+xOffset,.58,cz+zOffset,rx,rz,1);water.rotation.x=-Math.PI/2;water.castShadow=false;
  }
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,px=cx+Math.cos(angle)*15.8,pz=cz+Math.sin(angle)*11.7,heading=-angle+Math.PI/2;
   for(const side of [-1,1])localBox(stone,px,2.2,pz,.55,4.4,.55,heading,side*2.8,0);
   localBox(gold,px,4.6,pz,6.6,.35,2.1,heading,0,0);
   const arch=Array.from({length:11},(_,step)=>{const t=step*Math.PI/10,point=worldPoint(px,pz,heading,Math.cos(t)*2.8,0);return new THREE.Vector3(point.x,2.4+Math.sin(t)*2.2,point.z);});
   tube(arch,.11,index%2?gold:blue,28);
  }
  for(const side of [-1,1]){
   const greenhouse=part(geo(new THREE.SphereGeometry(6,32,16,0,Math.PI*2,0,Math.PI/2)),glass,cx+side*9,1.1,cz-8);greenhouse.scale.z=.72;greenhouse.castShadow=false;
   ellipticalRing({cx:cx+side*9,cz:cz-8,rx:6.1,rz:4.4,y:1.1,radius:.14,material:gold,steps:48});
   for(let rib=0;rib<5;rib++){
    const angle=-Math.PI/2+rib*Math.PI/4;
    const points=Array.from({length:13},(_,step)=>{const t=step*Math.PI/12;return new THREE.Vector3(cx+side*9+Math.cos(angle)*Math.cos(t)*6,1.1+Math.sin(t)*6,cz-8+Math.sin(angle)*Math.cos(t)*4.3);});
    tube(points,.075,gold,30);
   }
  }
  for(let index=0;index<12;index++){
   const angle=index*Math.PI*2/12,rx=index%2?18:10,rz=index%2?13.5:7.4;lantern(cx+Math.cos(angle)*rx,.5,cz+Math.sin(angle)*rz,3.6,index%3===0?blue:gold);
  }
  const unity=part(geo(new THREE.IcosahedronGeometry(2.1,2)),blue,cx,8.2,cz);unity.castShadow=false;
  for(const tilt of [-.5,.5]){const ring=part(geo(new THREE.TorusGeometry(3.2,.12,6,48)),gold,cx,8.2,cz);ring.rotation.set(Math.PI/2,tilt,tilt*.55);}
 }

 return Object.freeze({version:'hub-aaa-max-v4',landmarkIds:HUB_AAA_LANDMARKS,authoredMeshes,opaqueBatchReady:true,preservesSaveContract:true});
}
