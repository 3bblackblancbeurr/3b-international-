import {distance,moveWithCollision} from './rules.js';
import {spatialObstacles} from './hub/spatial-obstacles.js';

// A scene owns its cache; replacing the scenery or changing floors selects a
// fresh index. The original narrow phase and 12 cm collision steps are retained.
export function createIndexedMotion(){
 const indices=new WeakMap();
 return (state,input,seconds,speed,obstacles,radius=76)=>{
  let entry=indices.get(obstacles);
  if(!entry||entry.length!==obstacles.length){entry={length:obstacles.length,nearby:spatialObstacles(obstacles)};indices.set(obstacles,entry);}
  return advanceMotion(state,input,seconds,speed,obstacles,radius,(p,dx,dz)=>moveWithCollision(p,dx,dz,entry.nearby(p),radius));
 };
}

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

export const TOUCH_SPRINT_THRESHOLD=.9;
export const TOUCH_SPRINT_DELAY_MS=120;

export function joystickProfile(width,height,pointerType='touch'){
 if(pointerType!=='touch')return {deadZone:10,maxRadius:72,exponent:1.22,sprintThreshold:TOUCH_SPRINT_THRESHOLD,sprintDelayMs:TOUCH_SPRINT_DELAY_MS};
 const shortSide=Math.max(1,Math.min(Number(width)||1,Number(height)||1));
 const maxRadius=Math.max(56,Math.min(84,shortSide*.18));
 const deadZone=Math.max(8,Math.min(12,maxRadius*.14));
 return {deadZone,maxRadius,exponent:1.22,sprintThreshold:TOUCH_SPRINT_THRESHOLD,sprintDelayMs:TOUCH_SPRINT_DELAY_MS};
}

export function pointerStick(dx,dy,{deadZone=10,maxRadius=72,exponent=1.22}={}){
 const length=Math.hypot(dx,dy);
 if(length<=deadZone)return {x:0,z:0};
 const linear=Math.min(1,(length-deadZone)/Math.max(1,maxRadius-deadZone));
 const strength=Math.pow(linear,exponent);
 return {x:dx/length*strength,z:dy/length*strength};
}

export function sprintIntent(stick,enteredAt,now,{sprintThreshold=TOUCH_SPRINT_THRESHOLD,sprintDelayMs=TOUCH_SPRINT_DELAY_MS}={}){
 if(!Number.isFinite(enteredAt)||!Number.isFinite(now))return false;
 return Math.hypot(stick?.x||0,stick?.z||0)>=sprintThreshold&&now-enteredAt>=sprintDelayMs;
}

export const QUALITY_MODES=['auto','fluid','detail'];
export function createQualityController(mode='auto',{targetFps=60}={}){
 mode=QUALITY_MODES.includes(mode)?mode:'auto';
 targetFps=targetFps===30?30:60;
 const mobile=targetFps===30;
 const phoneRatios=[1.75,1.6,1.46,1.33,1.21,1.1,1];
 let phoneLevel=0,phoneClock=0,recoverAfter=0,recoveryDelay=30,recovered=false,lastProfileAt=-Infinity;
 let phoneWidth=390,phoneHeight=844,phoneDpr=1.75;
 let value=1,slow=0,fast=0,slowWindows=0,fluidFallback=false;
 const renderMode=()=>mode==='auto'&&fluidFallback?'fluid':mode;
 const phoneRatio=level=>Math.min(phoneDpr,phoneRatios[level],Math.sqrt((level===6?850000:3000000)/Math.max(1,phoneWidth*phoneHeight)));
 function samplePhone(fps,seconds,allowRecovery,windowStalled,severeOverload){
  phoneClock+=seconds;
  // Hitches are diagnosed separately. Neither one long window nor periodic
  // blocking work proves sustained rendering overload.
  if((windowStalled||seconds>2.25)&&!(severeOverload&&fps*seconds>=2)){slow=fast=slowWindows=0;return false;}
  const overloaded=fps<27;
  slow=overloaded?slow+seconds:0;slowWindows=overloaded?slowWindows+1:0;
  fast=allowRecovery&&phoneClock>=recoverAfter&&fps>34?fast+seconds:0;
  if(slow>=2&&slowWindows>=3&&(!fluidFallback||phoneLevel<6)){
   // Shed shadows, population and scenery work before spending image clarity.
   // Reducing pixels alone cannot cure CPU/scene overhead during a run.
   const profileChanged=!fluidFallback;
   if(profileChanged){
    if(phoneClock-lastProfileAt<60)return false;
    fluidFallback=true;
   }else{
    let next=phoneLevel+1;
    while(next<6&&phoneRatio(next)===phoneRatio(phoneLevel))next++;
    if(phoneRatio(next)===phoneRatio(phoneLevel))return false;
    phoneLevel=next;
   }
   if(recovered)recoveryDelay=Math.min(120,recoveryDelay*2);
   recovered=false;recoverAfter=phoneClock+recoveryDelay;
   if(profileChanged){lastProfileAt=phoneClock;recoverAfter=Math.max(recoverAfter,phoneClock+60);}
   slow=fast=slowWindows=0;return true;
  }
  if(fast>=12&&(phoneLevel>0||fluidFallback)){
   // Recover resolution first. Restore the expensive scene only after a
   // separate idle window at full clarity, with the profile cooldown intact.
   const profileChanged=phoneLevel===0;
   if(profileChanged){
    if(phoneClock-lastProfileAt<60)return false;
    fluidFallback=false;
   }else{
    let next=phoneLevel-1;
    while(next>0&&phoneRatio(next)===phoneRatio(phoneLevel))next--;
    phoneLevel=next;
   }
   recovered=true;
   if(profileChanged)lastProfileAt=phoneClock;
   slow=fast=slowWindows=0;return true;
  }
  return false;
 }
 function sample(fps,seconds,{allowRecovery=true,windowStalled=false,severeOverload=false}={}){
   if(mode!=='auto'||!Number.isFinite(fps)||fps<=0||!Number.isFinite(seconds)||seconds<=0)return false;
   if(mobile)return samplePhone(fps,seconds,allowRecovery,windowStalled,severeOverload);
   seconds=Math.min(seconds,2);
   slow=fps<45?slow+seconds:0;fast=allowRecovery&&fps>57?fast+seconds:0;
   if(slow>=2&&value>.6){
    value=Math.max(.6,value-.12);slow=fast=slowWindows=0;
    if(value<=.7)fluidFallback=true;
    return true;
   }
   if(fast>=12&&value<1){
    value=Math.min(1,value+.06);slow=fast=slowWindows=0;
    // Keep the lighter scene while resolution recovers: a small improvement
    // must not immediately restore shadows, effects and terrain work.
    if(value>=.94)fluidFallback=false;
    return true;
   }
   return false;
 }
 return {
  profile(){return mode==='fluid'||mode==='auto'&&(mobile?fluidFallback:value<=.7)?'light':'high';},
  renderMode,
  get targetFps(){return targetFps;},
  setMode(next){mode=QUALITY_MODES.includes(next)?next:'auto';value=1;slow=fast=slowWindows=0;fluidFallback=false;phoneLevel=phoneClock=recoverAfter=0;recoveryDelay=30;recovered=false;lastProfileAt=-Infinity;},
  ratio(width,height,dpr=1){
   if(mobile&&mode==='auto'){phoneWidth=width;phoneHeight=height;phoneDpr=dpr;return phoneRatio(phoneLevel);}
   const fluid=renderMode()==='fluid';
   const cap=fluid?1:1.75;
   const pixels=fluid?850000:3000000;
   const pixelLimit=Math.sqrt(pixels/Math.max(1,width*height));
   return Math.max(.5,Math.min(dpr,cap,pixelLimit)*(mode==='auto'?value:1));
  },
  sample,
  // Count real completed frames before rounding a display label. One frame
  // every several seconds is severe load, not an invalid zero-FPS sample.
  sampleFrames(frames,seconds,options){return Number.isInteger(frames)&&frames>0?sample(frames/seconds,seconds,options):false;}
 };
}
