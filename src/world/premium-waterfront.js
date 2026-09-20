import * as THREE from 'three';

export function addPremiumWaterfront({root,shape,geo,mat,height,lake,owned}){
 const group=new THREE.Group();group.name='3B-Premium-Waterfront';root.add(group);
 const physical=options=>{const m=new THREE.MeshPhysicalMaterial(options);owned.push(m);return m;};
 const wetStone=physical({color:'#1b2329',roughness:.34,metalness:.08,clearcoat:.55,clearcoatRoughness:.22});
 const edgeStone=physical({color:'#0d151b',roughness:.48,metalness:.12,clearcoat:.28});
 const blackMetal=physical({color:'#080c10',roughness:.30,metalness:.72,clearcoat:.34});
 const gold=physical({color:'#d6b46a',roughness:.25,metalness:.84,clearcoat:.48,emissive:'#5d4319',emissiveIntensity:.11});
 const matrix=physical({color:'#0c6d98',roughness:.21,metalness:.44,emissive:'#00a8ff',emissiveIntensity:.42,clearcoat:.36});
 const glass=physical({color:'#12384b',roughness:.14,metalness:.22,transmission:.08,transparent:true,opacity:.88,emissive:'#0077aa',emissiveIntensity:.10});
 const box=geo(new THREE.BoxGeometry(1,1,1)),cylinder=geo(new THREE.CylinderGeometry(1,1,1,12));

 const toCity=Math.atan2(-lake.z,-lake.x),radius=lake.r+5.2,segments=22,arc=2.25;
 const points=[];
 for(let i=0;i<segments;i++){
  const t=i/(segments-1),a=toCity-arc/2+t*arc;
  const x=lake.x+Math.cos(a)*radius,z=lake.z+Math.sin(a)*radius;
  points.push({a,x,z,y:height(x,z)});
 }
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],x=(a.x+b.x)/2,z=(a.z+b.z)/2,y=Math.max(-1.05,(a.y+b.y)/2+.06),length=Math.hypot(b.x-a.x,b.z-a.z),heading=Math.atan2(b.x-a.x,b.z-a.z);
  const walk=shape(box,wetStone,x,y,z,4.6,.18,length*1.08,group);walk.rotation.y=heading;walk.castShadow=false;
  const waterSideX=lake.x-x,waterSideZ=lake.z-z,sideLen=Math.hypot(waterSideX,waterSideZ)||1,nx=waterSideX/sideLen,nz=waterSideZ/sideLen;
  const wallX=x+nx*3.85,wallZ=z+nz*3.85,wall=shape(box,edgeStone,wallX,-.10,wallZ,.55,2.45,length*1.10,group);wall.rotation.y=heading;
  const wetBand=shape(box,blackMetal,wallX,-1.10,wallZ,.59,.26,length*1.11,group);wetBand.rotation.y=heading;wetBand.castShadow=false;
  if(i%2===0){
   const railX=x+nx*3.75,railZ=z+nz*3.75;
   const rail=shape(box,blackMetal,railX,y+1.0,railZ,.08,1.45,length*.96,group);rail.rotation.y=heading;rail.castShadow=false;
  }
  if(i%4===1){
   const landX=x-nx*3.3,landZ=z-nz*3.3;
   const pole=shape(cylinder,blackMetal,landX,y+1.95,landZ,.085,3.7,.085,group);pole.castShadow=false;
   const lamp=shape(box,matrix,landX,y+3.92,landZ,.25,.16,.25,group);lamp.castShadow=false;
   const goldTrim=shape(box,gold,landX,y+3.61,landZ,.13,.06,.13,group);goldTrim.castShadow=false;
  }
 }

 // Three stairs and pontoons create a readable transition instead of a hard coast/water seam.
 for(const offset of [-.72,0,.72]){
  const a=toCity+offset,dx=Math.cos(a),dz=Math.sin(a),tx=-dz,tz=dx;
  const outer=lake.r+7.7;
  for(let step=0;step<7;step++){
   const r=outer-step*.72,x=lake.x+dx*r,z=lake.z+dz*r,y=-.10-step*.20;
   const stair=shape(box,wetStone,x,y,z,4.4,.19,1.0,group);stair.rotation.y=Math.atan2(dx,dz);stair.castShadow=false;
  }
  const pontoonR=lake.r-2.5,px=lake.x+dx*pontoonR,pz=lake.z+dz*pontoonR;
  const pontoon=shape(box,wetStone,px,-1.28,pz,3.8,.20,10.5,group);pontoon.rotation.y=Math.atan2(dx,dz);pontoon.castShadow=false;
  for(const side of [-1,1])for(const along of [-4.6,4.6]){
   const postX=px+tx*side*1.55+dx*along,postZ=pz+tz*side*1.55+dz*along;
   shape(cylinder,blackMetal,postX,-.05,postZ,.11,2.8,.11,group);
   const cap=shape(cylinder,gold,postX,1.38,postZ,.15,.10,.15,group);cap.castShadow=false;
  }
 }

 // A restrained waterfront pavilion gives the promenade a social focal point.
 const pa=toCity+.18,pdx=Math.cos(pa),pdz=Math.sin(pa),ptx=-pdz,ptz=pdx,pr=lake.r+11;
 const px=lake.x+pdx*pr,pz=lake.z+pdz*pr,py=Math.max(-.55,height(px,pz)+.15);
 const deck=shape(box,wetStone,px,py,pz,8.5,.28,7.5,group);deck.rotation.y=Math.atan2(pdx,pdz);
 for(const side of [-1,1]){
  const bx=px+ptx*side*6.4,bz=pz+ptz*side*6.4;
  shape(box,blackMetal,bx,py+2.45,bz,.28,4.8,.28,group);
  const crown=shape(box,gold,bx,py+4.92,bz,.42,.16,.42,group);crown.castShadow=false;
 }
 const canopy=shape(box,glass,px,py+4.82,pz,7.4,.15,5.4,group);canopy.rotation.y=Math.atan2(pdx,pdz);canopy.castShadow=false;

 return{group};
}
