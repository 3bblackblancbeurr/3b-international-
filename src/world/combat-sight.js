import {obstacleDistance} from './collision.js';

// Combat uses scenery footprints from the authoritative movement field. This
// test is independent of the renderer and therefore also runs on the service.
export function hasCombatLineOfSight(from,to,obstacles=[],clearance=.12){
 if(![from?.x,from?.z,to?.x,to?.z].every(Number.isFinite))return false;
 const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
 if(length<1e-6)return true;
 const margin=Math.max(0,Number.isFinite(clearance)?clearance:0);
 for(const o of obstacles){
  if(o.enabled===false||o.blocksAttacks===false)continue;
  if(typeof o.surfaceDistance==='function'){
   // Non-box geometry (for example island boundaries) supplies its own SDF.
   const steps=Math.ceil(length/.16);
   for(let i=1;i<steps;i++){const t=i/steps;if(obstacleDistance({x:from.x+dx*t,z:from.z+dz*t},o)<margin)return false;}
  }else if(o.width){
   if(![o.x,o.z,o.width,o.depth].every(Number.isFinite))continue;
   const c=Math.cos(o.rotation||0),s=Math.sin(o.rotation||0),x=from.x-o.x,z=from.z-o.z;
   const origin=[x*c-z*s,x*s+z*c],delta=[dx*c-dz*s,dx*s+dz*c],half=[o.width/2+margin,o.depth/2+margin];
   let enter=0,leave=1;
   for(let axis=0;axis<2;axis++){
    if(Math.abs(delta[axis])<1e-9){if(Math.abs(origin[axis])>half[axis]){enter=2;break;}continue;}
    let near=(-half[axis]-origin[axis])/delta[axis],far=(half[axis]-origin[axis])/delta[axis];
    if(near>far)[near,far]=[far,near];enter=Math.max(enter,near);leave=Math.min(leave,far);
   }
   if(enter<=leave&&leave>1e-5&&enter<1-1e-5)return false;
  }else if([o.x,o.z,o.r].every(Number.isFinite)){
   const t=Math.max(0,Math.min(1,((o.x-from.x)*dx+(o.z-from.z)*dz)/(length*length)));
   if(Math.hypot(from.x+dx*t-o.x,from.z+dz*t-o.z)<Math.max(0,o.r)+margin)return false;
  }
 }
 return true;
}
