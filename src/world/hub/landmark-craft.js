import {civicShaftGeometry} from './platform-architecture.js';

export const HUB_AAA_LANDMARKS=Object.freeze([
 'tour_cercle_brise','archives_memoire','arena_3b','quartier_commerce',
 'docks_transports','portail_ville_3b','jardins_unite',
]);

/**
 * Final authored landmark pass for the 3B Hub.
 *
 * The language is deliberately architectural rather than asset-heavy: strong
 * silhouettes, layered roofs, readable entrances and district-scale ensembles
 * are assembled from low-poly civic pieces, then merged by platform-scene.
 * This keeps the metropolis detailed on desktop without breaking the phone
 * renderer, save IDs, missions or navigation contracts.
 */
export function addLandmarkCraft({mesh,geo,box,cylinder,materials,buildings,THREE}){
 const {dark,gold,glass,stone,blue,green}=materials;
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
 const orientedBox=(material,x,y,z,length,height,depth,heading=0)=>{
  const object=part(box,material,x,y,z,length,height,depth);
  object.rotation.y=heading;
  return object;
 };
 const localPoint=(cx,cz,heading,lateral,forward)=>({
  x:cx+Math.cos(heading)*lateral+Math.sin(heading)*forward,
  z:cz-Math.sin(heading)*lateral+Math.cos(heading)*forward,
 });
 const localBox=(material,cx,y,cz,length,height,depth,heading,lateral=0,forward=0)=>{
  const point=localPoint(cx,cz,heading,lateral,forward);
  return orientedBox(material,point.x,y,point.z,length,height,depth,heading);
 };
 const beam2D=(material,a,b,y,height=.22,depth=.22)=>{
  const dx=b.x-a.x,dz=b.z-a.z;
  return orientedBox(material,(a.x+b.x)/2,y,(a.z+b.z)/2,Math.hypot(dx,dz),height,depth,-Math.atan2(dz,dx));
 };
 const beam3D=(material,a,b,thickness=.18)=>{
  const direction=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),length=direction.length();
  if(length<.001)return null;
  const object=part(geo(new THREE.BoxGeometry(length,thickness,thickness)),material,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),direction.normalize());
  return object;
 };
 const lowRing=({cx,cz,rx,rz=rx,y,material=gold,segments=20,gapCenter=null,gap=.35,thickness=.18})=>{
  const start=gapCenter===null?0:gapCenter+gap;
  const sweep=gapCenter===null?Math.PI*2:Math.PI*2-gap*2;
  for(let index=0;index<segments;index++){
   const a=start+sweep*index/segments,b=start+sweep*(index+1)/segments;
   beam2D(material,{x:cx+Math.cos(a)*rx,z:cz+Math.sin(a)*rz},{x:cx+Math.cos(b)*rx,z:cz+Math.sin(b)*rz},y,thickness,thickness);
  }
 };
 const verticalArc=({cx,cy,cz,rx,ry,heading=0,material=gold,segments=10,thickness=.16})=>{
  for(let index=0;index<segments;index++){
   const a=Math.PI*index/segments,b=Math.PI*(index+1)/segments;
   const pa=localPoint(cx,cz,heading,Math.cos(a)*rx,0),pb=localPoint(cx,cz,heading,Math.cos(b)*rx,0);
   beam3D(material,{x:pa.x,y:cy+Math.sin(a)*ry,z:pa.z},{x:pb.x,y:cy+Math.sin(b)*ry,z:pb.z},thickness);
  }
 };
 const lantern=(x,baseY,z,height=4,light=blue)=>{
  part(cylinder,dark,x,baseY+height*.42,z,.2,height*.84,.2);
  part(cylinder,gold,x,baseY+height*.86,z,.31,.2,.31);
  const glow=part(geo(new THREE.IcosahedronGeometry(.3,0)),light,x,baseY+height,z);
  glow.castShadow=false;
  return glow;
 };
 const spire=(x,baseY,z,height=6,width=.65,material=gold,rotation=0)=>{
  const object=part(geo(new THREE.ConeGeometry(width,height,5)),material,x,baseY+height/2,z);
  object.rotation.y=rotation;
  return object;
 };
 const facadePass=b=>{
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=b;
  // Soubassement, profondeur, couronnement and a readable civic entrance.
  for(const side of [-1,1]){
   for(const lateral of [-.32,.32])localBox(gold,x,h*.5,z,.12,h*.78,.14,0,lateral*w,side*(d/2+.08));
   localBox(gold,x,h-.18,z,w*.76,.14,.16,0,0,side*(d/2+.09));
  }
  for(const side of [-1,1]){
   localBox(stone,x,2.1,z,.48,4.2,.48,0,side*w*.34,d/2+1.25);
   localBox(gold,x,4.35,z,.64,.28,.64,0,side*w*.34,d/2+1.25);
  }
  localBox(gold,x,4.7,z,w*.76,.3,2.5,0,0,d/2+1.25);
  localBox(dark,x,2.25,z,w*.5,4.3,.55,0,0,d/2+.32);
  localBox(glass,x,2.4,z,w*.38,3.55,.08,0,0,d/2+.64).castShadow=false;
  for(const side of [-1,1]){
   localBox(stone,x,h+.48,z,w*.22,.75,d*.5,0,side*w*.3,0);
   localBox(green,x,h+.98,z,w*.18,.26,d*.42,0,side*w*.3,0);
  }
 };

 for(const b of buildings)facadePass(b);

 // TOUR DU CERCLE BRISÉ — eight unequal blades, inhabited core and broken crown.
 const coreProfile=[[0,1],[.22,1],[.54,.88],[.78,.7],[1,.56]],coreHeight=62;
 part(geo(civicShaftGeometry(17,16,coreHeight,coreProfile)),dark,0,1.28,0);
 for(const level of [10,20,31,43,55]){
  lowRing({cx:0,cz:0,rx:7.8-level*.025,rz:7.2-level*.02,y:level+1.25,material:level%20?blue:gold,segments:16,thickness:.12});
 }
 const bladeHeights=[94,79,88,72,98,82,91,76];
 for(let index=0;index<8;index++){
  const angle=index*Math.PI/4+(index%2?.035:-.025),radius=7.5+(index%3)*.45;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,height=bladeHeights[index];
  const width=4.5+(index%2)*.65,depth=6.8+(index%3)*.45;
  const blade=part(geo(civicShaftGeometry(width,depth,height,[[0,1],[.3,1],[.62,.8],[.84,.61],[1,.4]])),index%2?dark:stone,x,1.3,z);
  blade.rotation.y=-angle+Math.PI/2+(index%2?.08:-.06);
  localBox(glass,x,height*.55+1.3,z,width*.48,height*.34,.08,blade.rotation.y,0,depth*.5).castShadow=false;
  for(const lateral of [-.3,.3])localBox(gold,x,height*.5+1.3,z,.11,height*.8,.12,blade.rotation.y,lateral*width,depth*.48);
  for(const band of [.26,.5,.73])localBox(gold,x,1.3+height*band,z,width*(1-band*.32),.12,depth*(1-band*.32),blade.rotation.y,0,0);
  const crown=localPoint(x,z,blade.rotation.y,0,depth*.1);
  spire(crown.x,height+1.3,crown.z,6+(index%3)*1.4,.42,gold,blade.rotation.y);
 }
 for(const [radius,y,gapCenter,gap,material] of [[14,31,.28,.34,gold],[18,53,2.2,.44,blue],[22,74,4.45,.52,gold]]){
  lowRing({cx:0,cz:0,rx:radius,rz:radius*.93,y,material,gapCenter,gap,segments:24,thickness:material===gold?.24:.15});
 }
 for(const y of [18,39,61])for(let index=0;index<8;index++){
  const angle=index*Math.PI/4;
  beam2D(index%2?gold:stone,{x:Math.cos(angle)*5.2,z:Math.sin(angle)*5.2},{x:Math.cos(angle)*12.8,z:Math.sin(angle)*12.8},y,.3,.9);
 }
 for(let index=0;index<8;index++)lantern(Math.cos(index*Math.PI/4)*20,1.4,Math.sin(index*Math.PI/4)*20,4.5,index%2?blue:gold);
 const crownCrystal=part(geo(new THREE.IcosahedronGeometry(2.8,1)),blue,0,91,0);crownCrystal.castShadow=false;
 for(const tilt of [-.45,.45]){
  const ring=part(geo(new THREE.TorusGeometry(5.8,.14,4,24)),gold,0,91,0);
  ring.rotation.set(Math.PI/2,tilt,tilt*.45);
 }

 // ARCHIVES DE LA MÉMOIRE — campus, archive spires and reading lantern.
 const archives=building('memory_archives'),cards=building('living_cards_gallery');
 if(archives){
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=archives,rear=z-d/2-4;
  const towers=[[-w*.28,40,5],[0,53,6.2],[w*.28,45,5.3]];
  for(const [offset,height,width] of towers){
   const shaft=part(geo(civicShaftGeometry(width,width*.78,height,[[0,1],[.62,.9],[.88,.6],[1,.28]])),dark,x+offset,1.2,rear);
   shaft.rotation.y=offset*.014;
   localBox(glass,x+offset,height*.56,rear,width*.42,height*.37,.08,shaft.rotation.y,0,width*.39).castShadow=false;
   spire(x+offset,height+1.2,rear,6+(offset===0?3:0),width*.19,gold,offset*.02);
  }
  for(let index=0;index<10;index++)spire(x-w*.56+index*w*1.12/9,h+1,rear-3.2,5+(index%3)*1.3,.3,index%2?gold:stone,index*.12);
  part(cylinder,glass,x,h+28,rear,4.1,4.3,4.1).castShadow=false;
  part(geo(new THREE.ConeGeometry(4.7,3.4,10)),dark,x,h+32,rear);
  lowRing({cx:x,cz:z+d*.08,rx:w*.72,rz:d*.58,y:.18,material:gold,gapCenter:Math.PI/2,gap:.36,segments:20,thickness:.16});
  for(const side of [-1,1]){
   const wing=orientedBox(stone,x+side*w*.57,h*.78,z-d*.2,2,h*1.35,d*.5,0);wing.rotation.z=side*.1;
   spire(x+side*w*.57,h*1.46,z-d*.2,6,.45,gold,side*.2);
  }
  if(cards){
   const start={x:x+w*.38,z:rear},end={x:cards.buildingX-w*.35,z:cards.buildingZ-cards.depth*.34};
   beam2D(dark,start,end,h+10,.85,1.8);
   beam2D(gold,start,end,h+11.1,.16,.22);
  }
 }

 // ARÈNE 3B — complete oval amphitheatre with physical entrances and stands.
 const arena=building('arena_3b');
 if(arena){
  const {buildingX:x,buildingZ:z,width:w,depth:d,height:h}=arena,front=Math.PI/2;
  part(geo(new THREE.CylinderGeometry(1,1,.32,20)),stone,x,.18,z).scale.set(w*.42,1,d*.38);
  for(let tier=0;tier<4;tier++){
   const rx=w*.46+tier*1.75,rz=d*.43+tier*1.35,y=1.5+tier*1.65;
   for(let index=0;index<20;index++){
    const angle=(index+.5)*Math.PI*2/20,delta=Math.atan2(Math.sin(angle-front),Math.cos(angle-front));
    if(Math.abs(delta)<.38)continue;
    const seat=part(box,(index+tier)%2?dark:stone,x+Math.cos(angle)*rx,y,z+Math.sin(angle)*rz,3.7,.44,1.35);
    seat.rotation.y=-angle+Math.PI/2;
   }
   lowRing({cx:x,cz:z,rx:rx+.25,rz:rz+.25,y:y+.45,material:tier%2?gold:blue,gapCenter:front,gap:.38,segments:24,thickness:.11});
  }
  for(const angle of [0,Math.PI,front,front+Math.PI]){
   const px=x+Math.cos(angle)*(w*.64),pz=z+Math.sin(angle)*(d*.6),heading=-angle+Math.PI/2;
   localBox(dark,px,4,pz,5,8,2.2,heading);
   localBox(gold,px,8.2,pz,5.8,.32,2.6,heading);
   verticalArc({cx:px,cy:3,cz:pz,rx:2.05,ry:3.5,heading,material:gold,segments:8,thickness:.14});
  }
  for(let index=0;index<8;index++)lantern(x+Math.cos(index*Math.PI/4)*w*.72,.7,z+Math.sin(index*Math.PI/4)*d*.69,6,index%2?blue:gold);
  lowRing({cx:x,cz:z,rx:w*.66,rz:d*.6,y:h+5,material:gold,gapCenter:front,gap:.42,segments:28,thickness:.22});
  const arenaOrb=part(geo(new THREE.IcosahedronGeometry(1.5,1)),blue,x,h+9,z);arenaOrb.castShadow=false;
 }

 // QUARTIER COMMERCE — market rotunda, open galleries and visible kiosks.
 const house=building('house_3b'),garage=building('garage_3b');
 if(house&&garage){
  const center=average(house,garage),cx=center.x-15,cz=center.z;
  for(let index=0;index<16;index++){
   const angle=index*Math.PI*2/16,px=cx+Math.cos(angle)*13,pz=cz+Math.sin(angle)*10;
   part(cylinder,index%3?stone:dark,px,3,pz,.32,6,.32);
   part(cylinder,gold,px,6.15,pz,.42,.22,.42);
  }
  lowRing({cx,cz,rx:13,rz:10,y:6.25,material:gold,gapCenter:0,gap:.3,segments:24,thickness:.22});
  lowRing({cx,cz,rx:10.8,rz:7.9,y:7.35,material:blue,gapCenter:0,gap:.36,segments:20,thickness:.11});
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,px=cx+Math.cos(angle)*8,pz=cz+Math.sin(angle)*6.1;
   const kiosk=part(geo(new THREE.CylinderGeometry(2,2.25,2.3,8)),index%2?dark:stone,px,1.15,pz);kiosk.rotation.y=angle;
   part(geo(new THREE.ConeGeometry(2.55,1.1,8)),gold,px,2.85,pz);
  }
  for(const side of [-1,1]){
   beam2D(stone,{x:cx+side*5,z:cz+13},{x:cx+side*5,z:cz+26},.3,.6,3);
   for(let index=0;index<5;index++)lantern(cx+side*5,.5,cz+13+index*3,3,index%2?gold:blue);
  }
  part(geo(new THREE.ConeGeometry(7.4,3.2,8,1,true)),glass,cx,9.4,cz).castShadow=false;
  part(geo(new THREE.CylinderGeometry(5.1,7.7,.4,8)),gold,cx,11.2,cz);
 }

 // DOCKS & TRANSPORTS — organised passenger/logistics port and terminal.
 const marina=building('central_marina'),shipyard=building('shipyard_3b'),station=building('train_station');
 if(marina&&shipyard&&station){
  const center=average(marina,shipyard,station),cx=center.x,cz=center.z+7;
  for(const xOffset of [-28,0,28]){
   const pierZ=cz+23;
   part(box,stone,cx+xOffset,.3,pierZ,8,.6,42);
   part(box,gold,cx+xOffset,.65,pierZ,8.4,.1,42.4);
   for(let index=0;index<7;index++){
    const pz=pierZ-18+index*6;
    for(const side of [-1,1])part(cylinder,dark,cx+xOffset+side*4.25,-1.3,pz,.28,3.8,.28);
    if(index<6)lantern(cx+xOffset+3,.75,pz,3,index%2?blue:gold);
   }
   part(geo(new THREE.ConeGeometry(5.1,2.4,8,1,true)),glass,cx+xOffset,5,pierZ-7).castShadow=false;
   part(geo(new THREE.CylinderGeometry(4.4,5.4,.34,8)),gold,cx+xOffset,6.35,pierZ-7);
  }
  for(const side of [-1,1]){
   const craneX=cx+side*19,craneZ=cz+8;
   part(box,dark,craneX,8,craneZ,1.3,16,1.3);
   orientedBox(gold,craneX+side*6.2,16.2,craneZ,12.5,.5,.65,0).rotation.z=-side*.08;
   part(box,dark,craneX+side*11.8,11.2,craneZ,.18,9.5,.18);
   part(box,stone,craneX+side*11.8,6.2,craneZ,3,.55,2);
  }
  for(const side of [-1,1])verticalArc({cx:cx+side*12,cy:7,cz:cz-3,rx:9.5,ry:7.5,material:gold,segments:10,thickness:.22});
  part(box,dark,cx,4,cz-3,27,8,6.3);
  part(box,glass,cx,5,cz+.2,21,5.2,.08).castShadow=false;
  part(box,gold,cx,8.25,cz-3,29,.42,7);
  for(let index=0;index<7;index++)part(box,blue,cx-10.5+index*3.5,7.2,cz+.28,2,.09,.09);
 }

 // PORTAIL VILLE 3B — monumental destination ring and preparation court.
 const planning=building('city_planning_office'),gallery=building('city_gallery');
 if(planning&&gallery){
  const center=average(planning,gallery),cx=center.x-2,cz=center.z+1,heading=-Math.PI/4;
  const verticalRing=(radius,material,segments,thickness)=>{
   for(let index=0;index<segments;index++){
    const a=index*Math.PI*2/segments,b=(index+1)*Math.PI*2/segments;
    const pa=localPoint(cx,cz,heading,Math.cos(a)*radius,0),pb=localPoint(cx,cz,heading,Math.cos(b)*radius,0);
    beam3D(material,{x:pa.x,y:11+Math.sin(a)*radius,z:pa.z},{x:pb.x,y:11+Math.sin(b)*radius,z:pb.z},thickness);
   }
  };
  verticalRing(8.2,gold,24,.3);verticalRing(9.45,blue,24,.11);
  const membrane=part(geo(new THREE.CircleGeometry(7.7,24)),glass,cx,11,cz);membrane.rotation.y=heading;membrane.castShadow=false;
  for(const side of [-1,1]){
   localBox(dark,cx,7,cz,2.1,14,3.4,heading,side*10.2,0);
   localBox(gold,cx,14.2,cz,2.9,.9,4,heading,side*10.2,0);
   for(let level=0;level<3;level++)localBox(blue,cx,4+level*3.4,cz,.15,1.5,3.5,heading,side*9.05,0);
  }
  for(let index=0;index<9;index++){
   const point=localPoint(cx,cz,heading,-8+index*2,12+index*.45);
   lantern(point.x,.3,point.z,3.6,index%2?gold:blue);
  }
  for(const side of [-1,1])beam2D(stone,localPoint(cx,cz,heading,side*5,-17),localPoint(cx,cz,heading,side*5,8),.24,.48,1.6);
  const beacon=part(geo(new THREE.IcosahedronGeometry(1.7,1)),blue,cx,20.5,cz);beacon.castShadow=false;
 }

 // JARDINS DE L'UNITÉ — terraced water gardens, pergolas and glass houses.
 const memorial=building('workers_memorial'),refuge=building('wildlife_refuge');
 if(memorial&&refuge){
  const center=average(memorial,refuge),cx=center.x,cz=center.z;
  for(const [rx,rz,y,material] of [[20,15,.18,stone],[16.4,12.2,.5,gold],[12.5,9.1,.82,stone]]){
   lowRing({cx,cz,rx,rz,y,material,gapCenter:-.55,gap:.34,segments:22,thickness:material===gold?.2:.28});
  }
  for(const [xOffset,zOffset,rx,rz] of [[-6,-2,5.2,3.5],[6,3,4.2,2.8]]){
   const basin=part(geo(new THREE.CylinderGeometry(1,1,.4,16)),stone,cx+xOffset,.25,cz+zOffset);basin.scale.set(rx,1,rz);
   const water=part(geo(new THREE.CircleGeometry(1,16)),blue,cx+xOffset,.48,cz+zOffset);water.scale.set(rx*.88,rz*.88,1);water.rotation.x=-Math.PI/2;water.castShadow=false;
  }
  for(let index=0;index<8;index++){
   const angle=index*Math.PI/4,px=cx+Math.cos(angle)*15.8,pz=cz+Math.sin(angle)*11.7,heading=-angle+Math.PI/2;
   for(const side of [-1,1])localBox(stone,px,2,pz,.5,4,.5,heading,side*2.65,0);
   localBox(gold,px,4.2,pz,6.2,.3,1.8,heading,0,0);
   verticalArc({cx:px,cy:2.2,cz:pz,rx:2.65,ry:1.9,heading,material:index%2?gold:blue,segments:7,thickness:.1});
  }
  for(const side of [-1,1]){
   const greenhouse=part(geo(new THREE.SphereGeometry(6,12,6,0,Math.PI*2,0,Math.PI/2)),glass,cx+side*9,1,cz-8);
   greenhouse.scale.z=.72;greenhouse.castShadow=false;
   lowRing({cx:cx+side*9,cz:cz-8,rx:6.1,rz:4.4,y:1,material:gold,segments:16,thickness:.12});
   for(let rib=0;rib<3;rib++){
    const angle=-Math.PI/2+rib*Math.PI/2;
    for(let segment=0;segment<6;segment++){
     const a=segment*Math.PI/12,b=(segment+1)*Math.PI/12;
     beam3D(gold,{x:cx+side*9+Math.cos(angle)*Math.cos(a)*6,y:1+Math.sin(a)*6,z:cz-8+Math.sin(angle)*Math.cos(a)*4.3},{x:cx+side*9+Math.cos(angle)*Math.cos(b)*6,y:1+Math.sin(b)*6,z:cz-8+Math.sin(angle)*Math.cos(b)*4.3},.07);
    }
   }
  }
  for(let index=0;index<12;index++){
   const angle=index*Math.PI*2/12,rx=index%2?18:10,rz=index%2?13.5:7.4;
   lantern(cx+Math.cos(angle)*rx,.5,cz+Math.sin(angle)*rz,3.4,index%3===0?blue:gold);
  }
  const unity=part(geo(new THREE.IcosahedronGeometry(1.9,1)),blue,cx,7.8,cz);unity.castShadow=false;
  for(const tilt of [-.45,.45]){
   const ring=part(geo(new THREE.TorusGeometry(2.9,.1,4,20)),gold,cx,7.8,cz);
   ring.rotation.set(Math.PI/2,tilt,tilt*.55);
  }
 }

 return Object.freeze({version:'hub-aaa-max-v4',landmarkIds:HUB_AAA_LANDMARKS,authoredMeshes,opaqueBatchReady:true,preservesSaveContract:true,lowPolyGoldMaster:true});
}
