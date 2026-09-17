import {distance,moveWithCollision} from './rules.js';

// Consume distance in small collision steps. Arrival uses the remaining distance,
// so a slow frame cannot skip a waypoint or alternate around the destination.
export function advanceMotion(state,input,seconds,speed,obstacles,radius=76){
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
  const next=moveWithCollision(position,dx*step,dz*step,obstacles,radius),moved=distance(next,position);
  budget-=step;travelled+=moved;position=next;
  if(moved<1e-7){if(!manual){target=null;route=[];}break;}
 }
 if(target&&distance(position,target)<1e-5){target=route[0]||null;route=route.slice(1);}
 return {position,target,route,travelled,moving:travelled>1e-5};
}

export function pointerStick(dx,dy){
 const distance=Math.hypot(dx,dy);
 if(distance<=7)return {x:0,z:0};
 // The first centimetres stay precise for walking, then ramp progressively to
 // full speed. This keeps a landscape-mode thumb stick controllable one-handed.
 const strength=Math.min(1,Math.pow((distance-7)/48,.9));
 return {x:dx/distance*strength,z:dy/distance*strength};
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
  performance:{cap:1,pixels:950000,slowFps:31,fastFps:42,min:.58,down:.1,up:.04,recover:18},
  balanced:{cap:1.25,pixels:1500000,slowFps:45,fastFps:57,min:.6,down:.12,up:.05,recover:14},
  ultra:{cap:1.4,pixels:1950000,slowFps:52,fastFps:59,min:.66,down:.1,up:.04,recover:16},
 };
 return {
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=mode==='auto'&&profile==='performance'?.86:1;slow=fast=0;},
  ratio(width,height,dpr=1){
   if(mode==='detail')return Math.max(.5,Math.min(dpr,1.5,Math.sqrt(2600000/Math.max(1,width*height))));
   if(mode==='fluid')return Math.max(.5,Math.min(dpr,1,Math.sqrt(850000/Math.max(1,width*height))));
   const config=autoConfig[profile];
   return Math.max(.5,Math.min(dpr,config.cap,Math.sqrt(config.pixels/Math.max(1,width*height)))*value);
  },
  sample(fps,seconds){
   if(mode!=='auto')return false;
   const config=autoConfig[profile];
   slow=fps<config.slowFps?slow+seconds:Math.max(0,slow-seconds*1.5);
   fast=fps>config.fastFps?fast+seconds:Math.max(0,fast-seconds*2);
   if(slow>=2&&value>config.min){value=Math.max(config.min,value-config.down);slow=fast=0;return true;}
   if(fast>=config.recover&&value<1){value=Math.min(1,value+config.up);slow=fast=0;return true;}
   return false;
  },
  get profile(){return profile;},
  get scale(){return value;},
 };
}
