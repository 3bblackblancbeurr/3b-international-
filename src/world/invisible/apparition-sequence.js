export const APPARITION_DURATION=11.2;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
/** Local movement stays independent of the XR anchor. No cumulative frame drift. */
export function apparitionPose(seconds,{animated=true}={}){
 const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
 if(!animated)return {phase:'presence',clip:'Idle',opacity:.86,x:0,z:0,yaw:0,done:false};
 let phase,clip='Idle',opacity=.86,x=0,z=0,yaw=0;
 if(t<1.6){phase='apparition';opacity=.86*ease(t/1.6);}
 else if(t<4){phase='presence';}
 else if(t<6.4){phase='geste';clip='Interact';}
 else if(t<8.4){phase='deplacement';clip='Walk';const p=ease((t-6.4)/2);x=.07*p;z=.012*p;yaw=Math.PI/2*ease((t-6.4)/.35);}
 else if(t<9.6){phase='presence';x=.07;z=.012;yaw=Math.PI/2*(1-ease((t-8.4)/.4));}
 else{phase=t<APPARITION_DURATION?'disparition':'terminee';x=.07;z=.012;opacity=.86*(1-ease((t-9.6)/1.6));}
 return {phase,clip,opacity,x,z,yaw,done:t>=APPARITION_DURATION};
}
export function createApparitionClock(){
 let elapsed=0,paused=false,last=null;
 return {advance(time,{visible=true,ready=true}={}){const delta=last===null?0:Math.max(0,Math.min(.05,time-last));last=time;if(visible&&ready&&!paused)elapsed=Math.min(APPARITION_DURATION,elapsed+delta);return elapsed;},restart(){elapsed=0;last=null;},setPaused(value){paused=!!value;last=null;},get elapsed(){return elapsed;},get paused(){return paused;}};
}
