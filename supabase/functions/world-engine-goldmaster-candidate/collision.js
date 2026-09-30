// Signed distance to scenery. The same footprint drives walking and routes.
export function obstacleDistance(p,o){
 if(o.enabled===false)return Infinity;
 if(!o.width)return Math.hypot(p.x-o.x,p.z-o.z)-o.r;
 const c=Math.cos(o.rotation||0),s=Math.sin(o.rotation||0),dx=p.x-o.x,dz=p.z-o.z;
 const x=Math.abs(dx*c-dz*s)-o.width/2,z=Math.abs(dx*s+dz*c)-o.depth/2;
 return Math.hypot(Math.max(0,x),Math.max(0,z))+Math.min(0,Math.max(x,z));
}
