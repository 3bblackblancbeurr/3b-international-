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

// Capability is only the starting point. Sustained frame time remains the
// source of truth because thermal throttling can make a powerful phone behave
// like a low-end device after several minutes.
export function detectDeviceProfile(){
 if(typeof navigator==='undefined')return 'balanced';
 const memory=Number(navigator.deviceMemory)||4,cores=Number(navigator.hardwareConcurrency)||4;
 const saveData=!!navigator.connection?.saveData;
 const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'');
 if(saveData||memory<=3||cores<=4)return 'performance';
 if(!mobile&&memory>=8&&cores>=8)return 'ultra';
 if(memory>=8&&cores>=8)return 'high';
 return 'balanced';
}

export function createQualityController(mode='auto'){
 const profile=detectDeviceProfile();
 const initial=profile==='performance'?.82:profile==='balanced'?.94:1;
 let value=initial,slow=0,fast=0,critical=0,stable=0;
 const autoConfig={
  performance:{cap:.92,pixels:780000,slowFps:30,fastFps:45,min:.50,down:.12,up:.035,recover:24},
  balanced:{cap:1.08,pixels:1180000,slowFps:40,fastFps:54,min:.54,down:.11,up:.04,recover:22},
  high:{cap:1.24,pixels:1580000,slowFps:48,fastFps:58,min:.60,down:.10,up:.035,recover:20},
  ultra:{cap:1.38,pixels:1950000,slowFps:52,fastFps:59,min:.66,down:.09,up:.035,recover:18},
 };
 const config=()=>autoConfig[profile]||autoConfig.balanced;
 const tier=()=>{
  if(mode==='fluid')return 'critical';
  if(mode==='detail')return 'ultra';
  if(value<=.60)return 'critical';
  if(value<=.76)return 'low';
  if(value<=.90||profile==='performance')return 'balanced';
  return profile==='ultra'?'ultra':'high';
 };
 const effective=()=>{
  if(mode!=='auto')return mode;
  const t=tier();
  return t==='critical'?'fluid':t==='low'?'fluid':'auto';
 };
 const shadowBudget=()=>{
  const t=tier();
  if(mode==='fluid'||t==='critical')return{enabled:false,mapSize:512,interval:260};
  if(t==='low')return{enabled:true,mapSize:512,interval:180};
  if(t==='balanced')return{enabled:true,mapSize:768,interval:120};
  if(t==='high')return{enabled:true,mapSize:1024,interval:80};
  return{enabled:true,mapSize:1536,interval:65};
 };
 return {
  setMode(next){
   mode=QUALITY_MODES.includes(next)?next:'auto';
   value=mode==='auto'?initial:1;slow=fast=critical=stable=0;
  },
  ratio(width,height,dpr=1){
   if(mode==='detail')return Math.max(.5,Math.min(dpr,1.45,Math.sqrt(2200000/Math.max(1,width*height))));
   if(mode==='fluid')return Math.max(.5,Math.min(dpr,.90,Math.sqrt(680000/Math.max(1,width*height))));
   const cfg=config();
   return Math.max(.5,Math.min(dpr,cfg.cap,Math.sqrt(cfg.pixels/Math.max(1,width*height)))*value);
  },
  sample(fps,seconds,{longFrameRatio=0}={}){
   if(mode!=='auto')return false;
   const cfg=config(),before=tier(),dt=Math.max(.05,Math.min(2,seconds||1));
   const severe=fps<Math.min(24,cfg.slowFps-8)||longFrameRatio>.28;
   critical=severe?critical+dt:Math.max(0,critical-dt*1.7);
   slow=fps<cfg.slowFps||longFrameRatio>.12?slow+dt:Math.max(0,slow-dt*1.35);
   fast=fps>cfg.fastFps&&longFrameRatio<.05?fast+dt:Math.max(0,fast-dt*2.2);
   stable=slow===0&&critical===0?stable+dt:0;
   let changed=false;
   if(critical>=1.25&&value>cfg.min){
    value=Math.max(cfg.min,value-cfg.down*1.55);critical=slow=fast=0;changed=true;
   }else if(slow>=2.2&&value>cfg.min){
    value=Math.max(cfg.min,value-cfg.down);slow=fast=0;changed=true;
   }else if(fast>=cfg.recover&&stable>=cfg.recover*.75&&value<1){
    value=Math.min(1,value+cfg.up);slow=fast=0;changed=true;
   }
   return changed||before!==tier();
  },
  get profile(){return profile;},
  get scale(){return value;},
  get tier(){return tier();},
  get effectiveMode(){return effective();},
  get shadow(){return shadowBudget();},
  get particleScale(){
   return ({critical:.28,low:.45,balanced:.68,high:.86,ultra:1})[tier()]||.68;
  },
  get crowdScale(){
   return ({critical:.42,low:.56,balanced:.72,high:.88,ultra:1})[tier()]||.72;
  },
 };
}
