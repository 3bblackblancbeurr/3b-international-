import {CITE_ISLANDS,CITE_PROMENADES,citeIslandRadius} from './platform-topology.js';

/** Classify against the actual triangulated deck edge, rather than its nominal
 * radius. This matches islandDeckGeometry's 64 coastal vertices. */
export function islandDeckDistance(island,x,z){
 const dx=x-island.x,dz=z-island.z,angle=(Math.atan2(dz,dx)+Math.PI*2)%(Math.PI*2),step=Math.PI*2/64,index=Math.floor(angle/step),a=index*step,b=(index+1)*step;
 const ra=citeIslandRadius(island,a),rb=citeIslandRadius(island,b),ax=Math.cos(a)*ra,az=Math.sin(a)*ra,bx=Math.cos(b)*rb,bz=Math.sin(b)*rb;
 const ux=Math.cos(angle),uz=Math.sin(angle),ex=bx-ax,ez=bz-az,det=ux*ez-uz*ex;
 const radius=Math.abs(det)>1e-10?(ax*ez-az*ex)/det:ra;
 return Math.hypot(dx,dz)-radius;
}
export function bridgeRailPoint(bridge,side,along){
 const across=side*(bridge.width/2-.15),c=Math.cos(bridge.angle),s=Math.sin(bridge.angle);
 return{x:bridge.x+c*along-s*across,z:bridge.z+s*along+c*across};
}
export function railOverOpenWater(bridge,side,along){
 const p=bridgeRailPoint(bridge,side,along),r=Math.hypot(p.x,p.z);
 // A small seam allowance keeps the rail ends clear of the stone junction.
 if(CITE_PROMENADES.some(deck=>r>=deck.inner-.2&&r<=deck.outer+.2))return false;
 return !CITE_ISLANDS.some(island=>islandDeckDistance(island,p.x,p.z)<=.2);
}
const cache=new WeakMap();
/** Only the exposed bridge edges receive balustrades. The eight districts,
 * gateway plazas and both ring intersections remain physically and visually open. */
export function bridgeRailSpans(bridge,side){
 if(!cache.has(bridge))cache.set(bridge,new Map());const entries=cache.get(bridge);if(entries.has(side))return entries.get(side);
 const spans=[],min=-bridge.length/2,max=bridge.length/2,samples=Math.ceil(bridge.length/.25);
 let previous=min,open=railOverOpenWater(bridge,side,min),start=open?min:null;
 for(let i=1;i<=samples;i++){
  const along=min+(max-min)*i/samples,next=railOverOpenWater(bridge,side,along);
  if(next!==open){
   let lo=previous,hi=along;for(let k=0;k<18;k++){const mid=(lo+hi)/2;if(railOverOpenWater(bridge,side,mid)===open)lo=mid;else hi=mid;}
   const boundary=(lo+hi)/2;
   if(open&&boundary-start>.35)spans.push(Object.freeze({start,end:boundary}));
   start=next?boundary:null;open=next;
  }
  previous=along;
 }
 if(open&&max-start>.35)spans.push(Object.freeze({start,end:max}));
 const result=Object.freeze(spans);entries.set(side,result);return result;
}
