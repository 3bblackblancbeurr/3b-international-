import {distance,moveWithCollision} from './rules.js';

// Consume distance in small collision steps. Arrival uses the remaining distance,
// so a slow frame cannot skip a waypoint or alternate around the destination.
export function advanceMotion(state,input,seconds,speed,obstacles,radius=76,moveStep=moveWithCollision){
 let {position,target}=state,route=state.route,travelled=0;
 const length=Math.hypot(input.x,input.z),manual=length>1e-5;
 if(manual){target=null;route=[];}
 let budget=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25))*speed*(manual?Math.min(length,1):1);
 while(budget>1e-7&&(manual||target)){
  const d=manual?Infinity:distance(position,target);
  if(d<1e-5){target=route[0]||null;route=route.slice(1);continue;}
  const step=Math.min(budget,.12,d);
  const dx=manual?input.x/length:(target.x-position.x)/d;
  const dz=manual?input.z/length:(target.z-position.z)/d;
  const next=moveStep(position,dx*step,dz*step,obstacles,radius),moved=distance(next,position);
  budget-=step;travelled+=moved;position=next;
  if(moved<1e-7){if(!manual){target=null;route=[];}break;}
 }
 if(target&&distance(position,target)<1e-5){target=route[0]||null;route=route.slice(1);}
 return {position,target,route,travelled,moving:travelled>1e-5};
}

export function createMotionSmoother({acceleration=14,deceleration=20,epsilon=.012}={}){
 let x=0,z=0;
 const reset=()=>{x=0;z=0;};
 return {
  update(input={x:0,z:0},seconds=0){
   const dt=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25));
   let tx=Number.isFinite(input.x)?input.x:0,tz=Number.isFinite(input.z)?input.z:0;
   const targetLength=Math.hypot(tx,tz);
   if(targetLength>1){tx/=targetLength;tz/=targetLength;}
   const hasIntent=Math.hypot(tx,tz)>epsilon,rate=hasIntent?acceleration:deceleration;
   const blend=1-Math.exp(-Math.max(0,rate)*dt);
   x+=(tx-x)*blend;z+=(tz-z)*blend;
   if(!hasIntent&&Math.hypot(x,z)<epsilon)reset();
   const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
   return {x,z};
  },
  reset,
  value(){return{x,z};}
 };
}

export function pointerStick(dx,dy,{deadZone=10,maxRadius=72,exponent=1.22}={}){
 const length=Math.hypot(dx,dy);
 if(length<=deadZone)return {x:0,z:0};
 const linear=Math.min(1,(length-deadZone)/Math.max(1,maxRadius-deadZone));
 const strength=Math.pow(linear,exponent);
 return {x:dx/length*strength,z:dy/length*strength};
}

export const QUALITY_MODES=['auto','fluid','detail'];
export function createQualityController(mode='auto'){
 let value=1,slow=0,fast=0;
 return {
  profile(){return mode==='fluid'||mode==='auto'&&value<=.7?'light':'high';},
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=1;slow=fast=0;},
  ratio(width,height,dpr=1){
   const cap=mode==='fluid'?1:1.75;
   const pixels=mode==='fluid'?850000:3000000;
   return Math.max(.5,Math.min(dpr,cap,Math.sqrt(pixels/Math.max(1,width*height)))*(mode==='auto'?value:1));
  },
  sample(fps,seconds){
   if(mode!=='auto'||!Number.isFinite(fps)||fps<=0||!Number.isFinite(seconds)||seconds<=0)return false;
   seconds=Math.min(seconds,2);
   slow=fps<45?slow+seconds:0;fast=fps>57?fast+seconds:0;
   if(slow>=2&&value>.6){value=Math.max(.6,value-.12);slow=fast=0;return true;}
   if(fast>=12&&value<1){value=Math.min(1,value+.06);slow=fast=0;return true;}
   return false;
  }
 };
}
