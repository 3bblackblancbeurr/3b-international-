import {distance,moveWithCollision} from './rules.js';

// Consume distance in small collision steps. Arrival uses the remaining distance,
// so a slow frame cannot skip a waypoint or alternate around the destination.
export function advanceMotion(state,input,seconds,speed,obstacles){
 let {position,target}=state,route=state.route,travelled=0;
 const length=Math.hypot(input.x,input.z),manual=length>.06;
 if(manual){target=null;route=[];}
 let budget=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25))*speed*(manual?Math.min(length,1):1);
 while(budget>1e-7&&(manual||target)){
  const d=manual?Infinity:distance(position,target);
  if(d<1e-5){target=route[0]||null;route=route.slice(1);continue;}
  const step=Math.min(budget,.12,d);
  const dx=manual?input.x/length:(target.x-position.x)/d;
  const dz=manual?input.z/length:(target.z-position.z)/d;
  const next=moveWithCollision(position,dx*step,dz*step,obstacles),moved=distance(next,position);
  budget-=step;travelled+=moved;position=next;
  if(moved<1e-7){if(!manual){target=null;route=[];}break;}
 }
 if(target&&distance(position,target)<1e-5){target=route[0]||null;route=route.slice(1);}
 return {position,target,route,travelled,moving:travelled>1e-5};
}

export function pointerStick(dx,dy){
 const distance=Math.hypot(dx,dy);
 if(distance<=7)return {x:0,z:0};
 const strength=Math.min(1,(distance-7)/48);
 return {x:dx/distance*strength,z:dy/distance*strength};
}

export const QUALITY_MODES=['auto','fluid','detail'];
export function createQualityController(mode='auto'){
 let value=1,slow=0,fast=0;
 return {
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=1;slow=fast=0;},
  ratio(width,height,dpr=1){
   const cap=mode==='detail'?1.5:mode==='fluid'?1:1.25;
   const pixels=mode==='detail'?2600000:mode==='fluid'?850000:1600000;
   return Math.max(.5,Math.min(dpr,cap,Math.sqrt(pixels/Math.max(1,width*height)))*(mode==='auto'?value:1));
  },
  sample(fps,seconds){
   if(mode!=='auto')return false;
   slow=fps<45?slow+seconds:0;fast=fps>57?fast+seconds:0;
   if(slow>=2&&value>.6){value=Math.max(.6,value-.12);slow=fast=0;return true;}
   if(fast>=12&&value<1){value=Math.min(1,value+.06);slow=fast=0;return true;}
   return false;
  }
 };
}
