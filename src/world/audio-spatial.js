const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function spatialAudio(listener={x:0,z:0,heading:0},source={x:0,z:0},maxDistance=42){
 const dx=(source.x||0)-(listener.x||0),dz=(source.z||0)-(listener.z||0),distance=Math.hypot(dx,dz);
 const gain=clamp(1-distance/Math.max(1,maxDistance),0,1);
 const bearing=Math.atan2(dx,dz),heading=(listener.heading||0)*Math.PI/180,relative=bearing-heading;
 const pan=clamp(Math.sin(relative),-1,1);
 return {distance,gain:gain*gain,pan};
}
