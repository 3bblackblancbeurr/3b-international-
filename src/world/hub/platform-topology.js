/** Shared physical surface: islands, radial bridges and the circular transport promenade.
 * Layout units are converted to world metres by callers. Negative = on solid ground. */
export const CITE_ISLANDS=Object.freeze([
 {id:'refuge',x:-56,z:100,r:24},{id:'station',x:0,z:132,r:22},{id:'builders-annex',x:59,z:95,r:25},
 {id:'nexus',x:0,z:0,r:42}, {id:'arrival',x:0,z:35,r:30},
 ...[[-66,-66,'archives'],[66,-66,'arena'],[94,0,'commerce'],[-94,0,'community'],[0,-94,'innovation'],[0,100,'docks'],[66,66,'builders'],[-66,66,'gardens']].map(([x,z,id])=>({id,x,z,r:40})),
 ...Array.from({length:8},(_,i)=>{const a=-Math.PI/2+i*Math.PI/4;return{id:'gate-'+i,x:Math.cos(a)*146,z:Math.sin(a)*146,r:24};}),
 ...Array.from({length:8},(_,i)=>{const a=(i+.5)*Math.PI/4;return{id:'residence-'+i,x:Math.cos(a)*132,z:Math.sin(a)*132,r:17};}),
]);
export const CITE_BRIDGES=Object.freeze(Array.from({length:8},(_,i)=>{const a=-Math.PI/2+i*Math.PI/4;return{x:Math.cos(a)*88,z:Math.sin(a)*88,length:132,width:12,angle:a};}));
export function citeSurfaceDistance(x,z){
 let result=Math.abs(Math.hypot(x,z)-125)-6;
 for(const island of CITE_ISLANDS){const distance=Math.hypot(x-island.x,z-island.z);if(distance-island.r*1.055<result)result=Math.min(result,distance-citeIslandRadius(island,Math.atan2(z-island.z,x-island.x)));}
 for(const bridge of CITE_BRIDGES){const dx=x-bridge.x,dz=z-bridge.z,c=Math.cos(bridge.angle),s=Math.sin(bridge.angle),along=Math.abs(dx*c+dz*s)-bridge.length/2,across=Math.abs(-dx*s+dz*c)-bridge.width/2;result=Math.min(result,Math.hypot(Math.max(0,along),Math.max(0,across))+Math.min(0,Math.max(along,across)));}
 return result;
}

/** Small coastal variation preserves bridges and service footprints, while removing stamped-disc silhouettes. */
const COAST_PHASES=new Map(CITE_ISLANDS.map(island=>[island.id,[...island.id].reduce((n,c)=>n+c.charCodeAt(0),0)*.017]));
export function citeIslandRadius(island,angle){
 const seed=COAST_PHASES.get(island.id)??0;
 return island.r*(1+.035*Math.sin(angle*5+seed)+.02*Math.sin(angle*9-seed));
}
