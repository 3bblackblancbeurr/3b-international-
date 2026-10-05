import * as THREE from 'three';
import {HUB_SCALE} from './platform-layout.js';
import {citeTerrainHeight} from './platform-topology.js';

// Public lookout aisles between the two residential towers. Heights use the
// same triangulated ramp profile for rendering, people and camera targeting.
export const CITE_TERRACES=Object.freeze(Array.from({length:8},(_,i)=>{
 const angle=(i+.5)*Math.PI/4;
 return Object.freeze({id:`belvedere-${i}`,angle,x:Math.cos(angle)*130,z:Math.sin(angle)*130,length:20,width:6,rise:4});
}));
function local(p,t){const x=p.x-t.x,z=p.z-t.z;return{along:x*Math.cos(t.angle)+z*Math.sin(t.angle),across:-x*Math.sin(t.angle)+z*Math.cos(t.angle)};}
export function terraceAisle(x,z,padding=0){return CITE_TERRACES.some(t=>{const p=local({x,z},t);return Math.abs(p.across)<=t.width/2+padding&&Math.abs(p.along)<=t.length/2+padding;});}
export function terraceHeight(x,z){
 for(const t of CITE_TERRACES){const p=local({x,z},t);if(Math.abs(p.across)<=t.width/2&&p.along>=-10&&p.along<=10)return Math.min(t.rise,Math.max(0,(p.along+10)*t.rise/14));}
 return 0;
}
export function terraceWorldHeight(x,z){return Math.max(terraceHeight(x/HUB_SCALE,z/HUB_SCALE),citeTerrainHeight(x/HUB_SCALE,z/HUB_SCALE))*1.5;}
function rectangleDistance(p,t,along,across,length,width){const q=local({x:p.x/HUB_SCALE,z:p.z/HUB_SCALE},t),a=Math.abs(q.along-along)-length/2,b=Math.abs(q.across-across)-width/2;return (Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(0,Math.max(a,b)))*HUB_SCALE;}
export function addCiteTerraces({mesh,geo,box,materials,collisions,sign}){
 const surfaces=[];
 for(const [i,t] of CITE_TERRACES.entries()){
  const top=new THREE.PlaneGeometry(t.length,t.width,40,1);top.rotateX(-Math.PI/2);
  const pos=top.attributes.position;
  for(let v=0;v<pos.count;v++){const along=pos.getX(v);pos.setY(v,Math.min(t.rise,Math.max(0,(along+10)*t.rise/14)));}
  top.computeVertexNormals();top.rotateY(-t.angle);top.translate(t.x,0,t.z);surfaces.push(top);
  // Two continuous rail segments follow the ramp and its level viewing deck.
  for(const side of [-1,1])for(const part of [{a:-3,len:14,slope:t.rise/14},{a:7,len:6,slope:0}]){
   const x=t.x+Math.cos(t.angle)*part.a-Math.sin(t.angle)*side*3.3,z=t.z+Math.sin(t.angle)*part.a+Math.cos(t.angle)*side*3.3;
   const base=Math.min(t.rise,(part.a+10)*t.rise/14),rail=mesh(box,materials.gold,x,base+1.15,z,part.len*Math.hypot(1,part.slope),.12,.16);
   rail.rotation.order='YXZ';rail.rotation.y=-t.angle;rail.rotation.z=Math.atan(part.slope);
   collisions.push({id:`${t.id}-rail-${side}-${part.a}`,surfaceDistance:p=>rectangleDistance(p,t,part.a,side*3.3,part.len,.24)});
  }
  for(const a of [-10,-3,4,10])for(const side of [-1,1]){
   const x=t.x+Math.cos(t.angle)*a-Math.sin(t.angle)*side*3.3,z=t.z+Math.sin(t.angle)*a+Math.cos(t.angle)*side*3.3,h=Math.min(t.rise,(a+10)*t.rise/14);
   mesh(box,materials.gold,x,h+.55,z,.15,1.1,.15);
   mesh(box,materials.dark,x,h/2,z,.3,Math.max(.1,h),.3);
  }
  const x=t.x+Math.cos(t.angle)*10,z=t.z+Math.sin(t.angle)*10,end=mesh(box,materials.gold,x,t.rise+1.15,z,.16,.12,6.6);
  end.rotation.y=-t.angle;
  collisions.push({id:`${t.id}-end`,surfaceDistance:p=>rectangleDistance(p,t,10,0,.24,6.8)});
  sign(`BELVÉDÈRE ${i+1} · LES HUIT HÉRITAGES`,t.x,t.rise+2.3,t.z,5);
 }
 return surfaces;
}
