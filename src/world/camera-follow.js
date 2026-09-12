import {cameraRelative} from './orbit.js';

export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

// Lock the input frame for one continuous gesture. Rotating the following
// camera must never bend a held direction into an endless circle.
export function createMovementFrame(){
 let basis=null;
 return {reset(){basis=null;},resolve(x,z,yaw){
  if(Math.hypot(x,z)<=1e-5){basis=null;return{x:0,z:0};}
  if(basis===null)basis=yaw;
  return cameraRelative(x,z,basis);
 }};
}

export function followMovement(orbit,dx,dz,dt,{enabled=true,manual=false,quietFor=Infinity,reducedMotion=false}={}){
 if(!enabled||manual||quietFor<1.4||Math.hypot(dx,dz)<1e-5)return orbit;
 const desired=Math.atan2(-dx,-dz),delta=angleDelta(orbit.yaw,desired);
 if(Math.abs(delta)<.004)return orbit;
 const step=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-Math.min(dt,.25)*4)),Math.min(dt,.25)*(reducedMotion?1.1:1.9));
 return {...orbit,yaw:orbit.yaw+step};
}

export function viewBearing(cameraPosition,target){
 return Math.atan2(cameraPosition.x-target.x,cameraPosition.z-target.z);
}
