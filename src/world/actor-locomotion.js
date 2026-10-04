import {LoopRepeat} from 'three';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export const GAIT_SPEEDS=Object.freeze({Walk:1.6,Jog:3.2,Run:4.8});

// Continuous speed weights replace threshold switches that restarted a stride
// whenever an analogue stick crossed Walk/Jog/Run. Missing clips retain the
// nearest available gait instead of leaving a limb layer unanimated.
export function locomotionBlend(speed=0,available=['Idle','Walk','Jog','Run']){
 const supported=new Set(available),s=Math.max(0,Number.isFinite(speed)?speed:0),weights={Idle:0,Walk:0,Jog:0,Run:0};
 const gaits=['Walk','Jog','Run'].filter(name=>supported.has(name));
 if(!gaits.length){weights.Idle=supported.has('Idle')?1:0;return {weights,rates:{}};}
 const moving=smooth((s-.035)/.22),idle=supported.has('Idle')?1-moving:0;
 weights.Idle=idle;
 let low=gaits[0],high=low;
 for(let i=0;i<gaits.length;i++){
  low=gaits[i];high=gaits[Math.min(gaits.length-1,i+1)];
  if(s<=GAIT_SPEEDS[high]||high===low)break;
 }
 const blend=low===high?0:smooth((s-GAIT_SPEEDS[low])/(GAIT_SPEEDS[high]-GAIT_SPEEDS[low]));
 weights[low]=(1-idle)*(1-blend);weights[high]+=(1-idle)*blend;
 const rates=Object.fromEntries(gaits.map(name=>[name,clamp(s/GAIT_SPEEDS[name],.12,2.2)]));
 return {weights,rates};
}

export function createLocomotionMixer(actions={}){
 const names=['Idle','Walk','Jog','Run'].filter(name=>actions[name]);let active=false,envelope=1,phase=0;
 return {
  update(speed,seconds=1/60,fade=.16){
   const plan=locomotionBlend(speed,names);
   envelope=Math.min(1,envelope+Math.max(0,Number.isFinite(seconds)?seconds:0)/Math.max(.01,fade));
   const moving=names.filter(name=>name!=='Idle'),weight=moving.reduce((sum,name)=>sum+plan.weights[name],0);
   const stride=moving.reduce((sum,name)=>sum+plan.weights[name]*GAIT_SPEEDS[name]*actions[name].getClip().duration,0)/Math.max(.001,weight);
   const maxFrequency=Math.min(Infinity,...moving.filter(name=>plan.weights[name]>.001).map(name=>2.2/Math.max(.01,actions[name].getClip().duration)));
   const frequency=Math.min(maxFrequency,Math.max(0,Number.isFinite(speed)?speed:0)/Math.max(.01,stride));
   for(const name of names){
    const action=actions[name];
    if(!active){action.enabled=true;action.clampWhenFinished=false;action.setLoop(LoopRepeat,Infinity).play();}
    action.setEffectiveWeight(plan.weights[name]*envelope);
    if(name==='Idle')action.setEffectiveTimeScale(1);
    else{const duration=action.getClip().duration;action.time=phase*duration;action.setEffectiveTimeScale(frequency*duration);}
   }
   phase=(phase+Math.max(0,Number.isFinite(seconds)?seconds:0)*frequency)%1;
   active=true;return plan;
  },
  fadeOut(seconds=.16){for(const name of names)actions[name].fadeOut(seconds);active=false;envelope=0;},
  stop(){for(const name of names)actions[name].stop();active=false;envelope=0;},
  reset(){for(const name of names)actions[name].reset();active=false;envelope=1;phase=0;}
 };
}

export function smoothActorHeading(current,dx,dz,seconds,{response=12,maxSpeed=9}={}){
 if(Math.hypot(dx,dz)<1e-6)return current;
 const dt=clamp(Number.isFinite(seconds)?seconds:0,0,.25),target=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 return current+Math.sign(delta)*Math.min(Math.abs(delta)*(1-Math.exp(-dt*Math.max(0,response))),dt*Math.max(0,maxSpeed));
}
