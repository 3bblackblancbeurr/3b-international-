import {guardianCombatAnimation} from './guardian-animation.js';

// Field reactions are consumed synchronously with the accepted transition.
// A later player event cannot erase an enemy gesture waiting on a local timer.
export function playAcceptedCombatReaction(cue,rival,hero,{airborne=false}={}){
 if(!cue?.counter)return false;
 const controller=rival?.controller;
 controller?.setGuardianAnticipation?.(false);
 const identity=controller?.object?.userData?.guardianIdentity;
 controller?.action(identity?guardianCombatAnimation(cue.intent,cue.combo):'Attack',.55);
 if(cue.incoming>0&&!cue.defended&&!airborne)hero?.action('Hit',.35);
 return true;
}

// Camera offsets are a final presentation layer. Remove the previous offset
// BEFORE interpolating so the feedback does not integrate itself at high FPS.
export function createCameraImpulseLayer(){
 let x=0,y=0,z=0;
 return{
  remove(position){position.x-=x;position.y-=y;position.z-=z;x=y=z=0;},
  apply(position,target,impulse,{enabled=true}={}){
   if(!enabled)return;
   const bearing=Math.atan2(position.x-target.x,position.z-target.z);
   const horizontal=Number.isFinite(impulse?.x)?impulse.x:0,vertical=Number.isFinite(impulse?.y)?impulse.y:0;
   x=Math.cos(bearing)*horizontal;y=vertical;z=-Math.sin(bearing)*horizontal;
   position.x+=x;position.y+=y;position.z+=z;
  },
 };
}
