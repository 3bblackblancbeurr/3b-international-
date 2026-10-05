import * as THREE from 'three';
import {citeIslandRadius,CITE_COAST_SEGMENTS} from './platform-topology.js';

export function cliffRadiusAtLevel(island,a,level){
 if(level>=.99999)return citeIslandRadius(island,a);
 const seed=island.x*.071+island.z*.113;
 const shelf=Math.sin(Math.round(level*10)*2.31+seed)*.055;
 const buttress=(Math.sin(a*7+seed)*.055+Math.sin(a*13-seed)*.043+Math.sin(a*23+seed*.5)*.018)*(1-level*.35);
 const brokenFace=Math.sin(a*3-seed)*.055*Math.sin(level*Math.PI);
 return citeIslandRadius(island,a)*(.72+.28*level+shelf+buttress+brokenFace);
}

/** Continuous fractured rock, relative to the island's raised walking plane.
 * Height variation belongs below the deck; the upper coast is exactly shared.
 * Per-column strata warp removes the level, cylindrical drum appearance. */
export function islandCliffGeometry(island){
 const levels=[0,.1,.21,.34,.45,.57,.69,.81,.92,1],depth=island.cliffDepth||28,seed=island.x*.071+island.z*.113;
 const vertices=[],uv=[],indices=[];
 for(const level of levels)for(let j=0;j<=CITE_COAST_SEGMENTS;j++){
  const a=j*Math.PI*2/CITE_COAST_SEGMENTS,r=cliffRadiusAtLevel(island,a,level),warp=Math.sin(a*5+seed)*1.1+Math.sin(a*11-seed)*.7;
  const y=level===1?0:level===0?-depth:-depth*(1-level)+warp*Math.sin(level*Math.PI);
  vertices.push(Math.cos(a)*r,y,Math.sin(a)*r);
  uv.push(a*island.r/3.8,y/3.8);
 }
 const row=CITE_COAST_SEGMENTS+1;
 for(let level=0;level<levels.length-1;level++)for(let j=0;j<CITE_COAST_SEGMENTS;j++){
  const a=level*row+j,b=a+1,c=a+row,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function islandDeckGeometry(island){
 const g=new THREE.CircleGeometry(1,CITE_COAST_SEGMENTS);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=Math.hypot(x,z)>.5?citeIslandRadius(island,a):0,xx=island.x+Math.cos(a)*r,zz=island.z+Math.sin(a)*r;
  p.setXYZ(i,xx,island.baseY||0,zz);uv.setXY(i,xx/2.4,zz/2.4);
 }
 g.computeVertexNormals();return g;
}

const waterlines=new WeakMap();
/** Slice the actual cliff triangles at sea level, including raised decks and
 * irregular strata. The small cached polygon also drives the foam mask. */
export function cliffWaterlineRadius(island,angle){
 if(!waterlines.has(island)){
  const geometry=islandCliffGeometry(island),position=geometry.attributes.position,index=geometry.index.array,y=-18-(island.baseY||0),points=[];
  for(let i=0;i<index.length;i+=3)for(let edge=0;edge<3;edge++){
   const a=index[i+edge],b=index[i+(edge+1)%3],ay=position.getY(a),by=position.getY(b);
   if((ay<=y&&by>y)||(by<=y&&ay>y)){
    const t=(y-ay)/(by-ay),x=position.getX(a)+(position.getX(b)-position.getX(a))*t,z=position.getZ(a)+(position.getZ(b)-position.getZ(a))*t;
    points.push({x,z,angle:(Math.atan2(z,x)+Math.PI*2)%(Math.PI*2)});
   }
  }
  geometry.dispose();points.sort((a,b)=>a.angle-b.angle);
  waterlines.set(island,points.filter((point,i)=>i===0||Math.abs(point.angle-points[i-1].angle)>1e-7));
 }
 const coast=waterlines.get(island),a=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
 if(!coast.length)return 0;
 let low=0,high=coast.length;
 while(low<high){const mid=(low+high)>>1;if(coast[mid].angle<=a)low=mid+1;else high=mid;}
 const p=coast[(low+coast.length-1)%coast.length],q=coast[low%coast.length],ex=q.x-p.x,ez=q.z-p.z,denominator=Math.cos(a)*ez-Math.sin(a)*ex;
 return Math.abs(denominator)<1e-10?Math.hypot(p.x,p.z):(p.x*ez-p.z*ex)/denominator;
}
