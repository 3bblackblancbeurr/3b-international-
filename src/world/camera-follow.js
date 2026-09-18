import {cameraRelative} from './orbit.js';

export const CAMERA_FOLLOW_RESUME_SECONDS=.55;
export const CAMERA_FOLLOW_MAX_SPEED=2.35;
export const CAMERA_FOLLOW_REDUCED_MAX_SPEED=1.25;
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function createMovementFrame(){
 let basis=null;
 return {reset(){basis=null;},resolve(x,z,yaw){
  if(Math.hypot(x,z)<=1e-5){basis=null;return{x:0,z:0};}
  if(basis===null)basis=yaw;
  return cameraRelative(x,z,basis);
 }};
}

export function followMovement(orbit,dx,dz,dt,{enabled=true,manual=false,quietFor=Infinity,reducedMotion=false}={}){
 if(!enabled||manual||quietFor<CAMERA_FOLLOW_RESUME_SECONDS||Math.hypot(dx,dz)<1e-5)return orbit;
 const desired=Math.atan2(-dx,-dz),delta=angleDelta(orbit.yaw,desired);
 if(Math.abs(delta)<.004)return orbit;
 const seconds=Math.min(dt,.25),response=reducedMotion?3.2:5.2,maxSpeed=reducedMotion?CAMERA_FOLLOW_REDUCED_MAX_SPEED:CAMERA_FOLLOW_MAX_SPEED;
 const step=Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-seconds*response)),seconds*maxSpeed);
 return {...orbit,yaw:orbit.yaw+step};
}

export function viewBearing(cameraPosition,target){
 return Math.atan2(cameraPosition.x-target.x,cameraPosition.z-target.z);
}
