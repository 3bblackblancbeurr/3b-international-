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

// Conservative capability hint only: FPS remains the source of truth. Browsers
// may omit deviceMemory, so the fallback deliberately lands on balanced.
export function detectDeviceProfile(){
 if(typeof navigator==='undefined')return 'balanced';
 const memory=Number(navigator.deviceMemory)||4,cores=Number(navigator.hardwareConcurrency)||4;
 if(memory<=3||cores<=4)return 'performance';
 if(memory>=8&&cores>=8)return 'ultra';
 return 'balanced';
}

export function createQualityController(mode='auto'){
 const profile=detectDeviceProfile();
 let value=profile==='performance'?.86:1,slow=0,fast=0;
 const autoConfig={
  performance:{cap:1,pixels:950000,slowFps:31,fastFps:42,min:.58,down:.1,up:.06,recover:18},
  balanced:{cap:1.25,pixels:1500000,slowFps:45,fastFps:57,min:.6,down:.12,up:.06,recover:14},
  ultra:{cap:1.4,pixels:1950000,slowFps:52,fastFps:59,min:.66,down:.1,up:.06,recover:16},
 };
 return {
  profile(){return mode==='fluid'||mode==='auto'&&value<=.7?'light':'high';},
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=mode==='auto'&&profile==='performance'?.86:1;slow=fast=0;},
  ratio(width,height,dpr=1){
   if(mode==='detail')return Math.max(.5,Math.min(dpr,1.5,Math.sqrt(2600000/Math.max(1,width*height))));
   if(mode==='fluid')return Math.max(.5,Math.min(dpr,1,Math.sqrt(850000/Math.max(1,width*height))));
   const config=autoConfig[profile];
   return Math.max(.5,Math.min(dpr,config.cap,Math.sqrt(config.pixels/Math.max(1,width*height)))*value);
  },
  sample(fps,seconds){
   if(mode!=='auto'||!Number.isFinite(fps)||fps<=0||!Number.isFinite(seconds)||seconds<=0)return false;
   seconds=Math.min(seconds,2);
   const config=autoConfig[profile];
   slow=fps<config.slowFps?slow+seconds:Math.max(0,slow-seconds*1.5);
   fast=fps>config.fastFps?fast+seconds:Math.max(0,fast-seconds*2);
   if(slow>=2&&value>config.min){value=Math.max(config.min,value-config.down);slow=fast=0;return true;}
   const ceiling=profile==='performance'?.86:1;
   if(fast>=config.recover&&value<ceiling){value=Math.min(ceiling,Math.round((value+config.up)*1000)/1000);slow=fast=0;return true;}
   return false;
  },
  get hardwareProfile(){return profile;},
  get scale(){return value;},
 };
}
