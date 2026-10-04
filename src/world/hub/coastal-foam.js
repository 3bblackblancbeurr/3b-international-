import {CITE_ISLANDS,citeIslandRadius} from './platform-topology.js';
import {cliffRadiusAtLevel} from './island-cliffs.js';

const impacts=CITE_ISLANDS.filter(i=>!['nexus','arrival'].includes(i.id)).slice(0,20).map(island=>{
 const a=Math.atan2(island.z,island.x),r=citeIslandRadius(island,a)+1.65;
 return{x:island.x+Math.cos(a)*r,z:island.z+Math.sin(a)*r};
});

/** Local sea-level contour of the actual tapered cliffs, not the deck edge. */
export function citeCoastalDistance(x,z){
 let nearest=Infinity;
 for(const island of CITE_ISLANDS){
  const dx=x-island.x,dz=z-island.z,d=Math.hypot(dx,dz);
  if(d-island.r*1.1>nearest)continue;
  const a=Math.atan2(dz,dx),level=1-18/28,scaled=level*6,lo=Math.floor(scaled),mix=scaled-lo;
  const r0=cliffRadiusAtLevel(island,a,lo/6),r1=cliffRadiusAtLevel(island,a,(lo+1)/6);
  nearest=Math.min(nearest,d-(r0+(r1-r0)*mix));
 }
 return nearest;
}
export function citeCoastalFoam(x,z){
 const distance=citeCoastalDistance(x,z);
 let impact=0;for(const site of impacts){const d=Math.hypot(x-site.x,z-site.z);if(d<3.5)impact=Math.max(impact,(1-d/3.5)*.48);}
 if(distance<-.8||distance>3.6)return impact;
 const rise=Math.min(1,Math.max(0,(distance+.8)/1.1)),fade=Math.min(1,Math.max(0,(3.6-distance)/3.2));
 return Math.max(rise*fade*.65,impact);
}
