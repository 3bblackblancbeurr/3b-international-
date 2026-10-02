// Segment versus oriented building boxes. Shorten the camera arm immediately
// on entry; the caller's existing smoothing eases it back out. No player teleport.
export function resolveCameraObstruction(target,eye,solids=[],clearance=.65){
 const dx=eye.x-target.x,dy=eye.y-target.y,dz=eye.z-target.z,length=Math.hypot(dx,dy,dz);
 if(length<.001)return {...eye};
 let closest=1;
 for(const b of solids){
  if(![b.x,b.z,b.width,b.depth,b.bottom,b.top].every(Number.isFinite))continue;
  const c=Math.cos(b.rotation||0),s=Math.sin(b.rotation||0),tx=target.x-b.x,tz=target.z-b.z;
  const origin=[tx*c-tz*s,target.y,tx*s+tz*c],delta=[dx*c-dz*s,dy,dx*s+dz*c];
  const lo=[-b.width/2-1.25,b.bottom,-b.depth/2-1.25],hi=[b.width/2+1.25,b.top,b.depth/2+1.25];
  // Interiors retain their current cutaway; never trap the camera in its origin box.
  if(origin.every((v,i)=>v>lo[i]&&v<hi[i]))continue;
  let enter=0,leave=1,hit=true;
  for(let axis=0;axis<3;axis++){
   if(Math.abs(delta[axis])<1e-8){if(origin[axis]<lo[axis]||origin[axis]>hi[axis]){hit=false;break;}continue;}
   let a=(lo[axis]-origin[axis])/delta[axis],z=(hi[axis]-origin[axis])/delta[axis];
   if(a>z)[a,z]=[z,a];enter=Math.max(enter,a);leave=Math.min(leave,z);if(enter>leave){hit=false;break;}
  }
  if(hit&&enter>0&&enter<closest)closest=enter;
 }
 if(closest===1)return {...eye};
 const t=Math.max(Math.min(1.2/length,closest*.5),closest-clearance/length);
 return {x:target.x+dx*t,y:target.y+dy*t,z:target.z+dz*t};
}
