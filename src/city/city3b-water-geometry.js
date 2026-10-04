import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const CITY_WATER_LEVEL=.085;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>x*x*(3-2*x);

// A spatial index makes authored intersections one continuous body of water.
// No per-feature uniforms or per-feature draw calls, even with 256 saved features.
export function cityWaterField(features=[]){
 const water=features.filter(f=>['lake','river'].includes(f.kind)&&[f.x1,f.z1,f.x2,f.z2,f.width].every(Number.isFinite)&&f.width>0);
 const cells=new Map(),cellSize=32;
 for(const f of water){
  const r=f.width/2,ax=f.kind==='lake'?(f.x1+f.x2)/2:f.x1,az=f.kind==='lake'?(f.z1+f.z2)/2:f.z1,bx=f.kind==='lake'?ax:f.x2,bz=f.kind==='lake'?az:f.z2;
  const dx=bx-ax,dz=bz-az,l2=dx*dx+dz*dz,length=Math.sqrt(l2),entry={...f,ax,az,bx,bz,dx,dz,l2,r,length};
  for(let z=Math.floor((Math.min(az,bz)-r-1)/cellSize);z<=Math.floor((Math.max(az,bz)+r+1)/cellSize);z++)for(let x=Math.floor((Math.min(ax,bx)-r-1)/cellSize);x<=Math.floor((Math.max(ax,bx)+r+1)/cellSize);x++){
   const key=`${x}:${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(entry);
  }
 }
 return {features:water,sample(x,z){
  let shore=-1000,depth=0,flowX=0,flowZ=0,weight=0;
  for(const f of cells.get(`${Math.floor(x/cellSize)}:${Math.floor(z/cellSize)}`)||[]){
   const t=f.l2?clamp(((x-f.ax)*f.dx+(z-f.az)*f.dz)/f.l2,0,1):0;
   const distance=Math.hypot(x-f.ax-t*f.dx,z-f.az-t*f.dz),edge=f.r-distance;
   shore=Math.max(shore,edge);
   const d=smooth(clamp(edge/Math.max(.5,f.r*.72),0,1))*clamp(f.width*(f.kind==='lake'?.14:.10),.7,5.6);
   depth=Math.max(depth,d);
   if(f.kind==='river'&&f.length>.01&&edge>0){const w=Math.max(.001,d);flowX+=f.dx/f.length*w;flowZ+=f.dz/f.length*w;weight+=w;}
  }
  return {shore,depth,flowX:weight?flowX/weight:0,flowZ:weight?flowZ/weight:0};
 }};
}

// A rounded capsule without boxes/cylinder side walls. Rings provide an actual
// shallow-to-deep profile; shore attributes are sampled across the whole union.
export function cityWaterFeatureGeometry(feature,field=cityWaterField([feature]),{bank=false}={}){
 const f=feature,r=f.width/2,ax=f.kind==='lake'?(f.x1+f.x2)/2:f.x1,az=f.kind==='lake'?(f.z1+f.z2)/2:f.z1;
 const bx=f.kind==='lake'?ax:f.x2,bz=f.kind==='lake'?az:f.z2,dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dz,dx);
 const centerX=(ax+bx)/2,centerZ=(az+bz)/2,outline=[],arc=24,steps=Math.max(1,Math.min(128,Math.ceil(length/6)));
 const point=(x,z,a)=>outline.push([x+Math.cos(a)*r,z+Math.sin(a)*r]);
 for(let i=0;i<=arc;i++)point(bx,bz,angle-Math.PI/2+i*Math.PI/arc);
 for(let i=1;i<steps;i++)point(bx-dx*i/steps,bz-dz*i/steps,angle+Math.PI/2);
 for(let i=0;i<=arc;i++)point(ax,az,angle+Math.PI/2+i*Math.PI/arc);
 for(let i=1;i<steps;i++)point(ax+dx*i/steps,az+dz*i/steps,angle-Math.PI/2);
 const positions=[],info=[],colors=[],indices=[],n=outline.length,rings=bank?[1,1.035,1.085]:[0,.12,.3,.5,.7,.86,.94,.98,1];
 for(const t of rings)for(const [ox,oz] of outline){
  const along=length?clamp(((ox-ax)*dx+(oz-az)*dz)/(length*length),0,1):0;
  const cx=ax+dx*along,cz=az+dz*along;
  const x=cx+(ox-cx)*t,z=cz+(oz-cz)*t,s=field.sample(x,z);
  // Keep generated bank details inside a small cosmetic rim, never alter saves.
  const y=bank?(.045-(t-1)*1.05):CITY_WATER_LEVEL;
  positions.push(x,y,z);info.push(Math.max(0,s.shore),s.depth,s.flowX,s.flowZ);
  const shade=bank?.58+(t-1)*3:1;colors.push(shade*.77,shade*.81,shade*.71);
 }
 for(let ring=0;ring<rings.length-1;ring++)for(let j=0;j<n;j++){
  const a=ring*n+j,b=ring*n+(j+1)%n,c=(ring+1)*n+j,d=(ring+1)*n+(j+1)%n;
  indices.push(a,b,c,b,d,c);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('aWaterInfo',new THREE.Float32BufferAttribute(info,4));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}

export function cityWaterOceanGeometry(half){
 const parts=[];
 // Each ocean strip has a tessellated shoreline and no top/side box faces.
 for(const side of [-1,1])for(const axis of ['x','z']){
  const width=axis==='x'?half*2:half*2,span=axis==='x'?half*6:half*2;
  const g=new THREE.PlaneGeometry(width,span,32,32);g.rotateX(-Math.PI/2);
  const p=g.attributes.position,values=[];
  for(let i=0;i<p.count;i++){
   let x=p.getX(i),z=p.getZ(i);
   if(axis==='x')x+=side*half*2;else{const swap=x;x=z;z=swap+side*half*2;}
   const shore=Math.max(0,Math.max(Math.abs(x),Math.abs(z))-half);
   p.setXYZ(i,x,CITY_WATER_LEVEL,z);values.push(shore,clamp(shore*.35,.08,18),.16,.08);
  }
  g.setAttribute('aWaterInfo',new THREE.Float32BufferAttribute(values,4));g.deleteAttribute('normal');g.deleteAttribute('uv');parts.push(g);
 }
 const merged=mergeGeometries(parts);for(const p of parts)p.dispose();merged.computeVertexNormals();merged.computeBoundingSphere();return merged;
}

export function cityWaterGeometry(features,half){
 const field=cityWaterField(features),water=field.features.map(f=>cityWaterFeatureGeometry(f,field)),banks=field.features.map(f=>cityWaterFeatureGeometry(f,field,{bank:true}));
 const combine=parts=>{if(!parts.length)return null;const result=mergeGeometries(parts);for(const p of parts)p.dispose();return result;};
 return {field,inland:combine(water),banks:combine(banks),ocean:cityWaterOceanGeometry(half)};
}
