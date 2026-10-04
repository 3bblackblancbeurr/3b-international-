import {CITE_ISLANDS} from './platform-topology.js';
import {cliffRadiusAtLevel} from './island-cliffs.js';

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
 if(distance<-.8||distance>3.6)return 0;
 const rise=Math.min(1,Math.max(0,(distance+.8)/1.1)),fade=Math.min(1,Math.max(0,(3.6-distance)/3.2));
 return rise*fade*.65;
}
