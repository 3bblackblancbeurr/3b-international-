const finite=Number.isFinite;
const smooth=t=>t*t*(3-2*t);
const angleDelta=(from,to)=>((to-from+540)%360)-180;

export function hubLifeAction(item){
 return item?.type==='hubLifeObject'?{seat:'sit',read:'read',examine:'inspect'}[item.kind]||null:null;
}

/** A temporary physical pose, deliberately separate from progression and saved position.
 * The seat center may be in furniture; the stored return point is always the reachable
 * approach. Moving again restores this point before navigation resumes. */
export function createHubLifeInteraction({reducedMotion=false}={}){
 let current=null;
 return {
  get active(){return current!==null;},
  get item(){return current?.item||null;},
  start(item,position,heading=0,time=0){
   const action=hubLifeAction(item);
   if(!action||!finite(position?.x)||!finite(position?.z)||!finite(item.x)||!finite(item.z))return false;
   if(Math.hypot(position.x-item.x,position.z-item.z)>(item.range||3.2)+.2)return false;
   const seated=action==='sit';
   if(seated&&(!finite(item.seatX)||!finite(item.seatZ)||!finite(item.seatHeight)||item.seatHeight<=0))return false;
   current={item,action,origin:{x:position.x,z:position.z},heading:finite(heading)?heading:0,time,
    destination:{x:seated?item.seatX:item.x,z:seated?item.seatZ:item.z},targetHeading:finite(item.heading)?item.heading:heading};
   return true;
  },
  sample(time=0){
   if(!current)return null;
   const duration=reducedMotion?0:.42,t=duration?Math.max(0,Math.min(1,(time-current.time)/duration)):1,a=smooth(t);
   return {active:true,action:current.action,pose:current.action==='sit'?'Sit':current.action==='read'?'Read':'Inspect',
    x:current.origin.x+(current.destination.x-current.origin.x)*a,z:current.origin.z+(current.destination.z-current.origin.z)*a,
    heading:current.heading+angleDelta(current.heading,current.targetHeading)*a,
    seatHeight:current.action==='sit'?current.item.seatHeight:0,blend:a,
    title:current.item.name,detail:current.item.detail||'',caption:current.action==='sit'?'Assis · avance pour te lever':current.action==='read'?'Lecture · avance pour reprendre':'Observation · avance pour reprendre'};
  },
  finish(){const position=current?{...current.origin}:null;current=null;return position;},
  setReducedMotion(value){reducedMotion=!!value;},
  dispose(){current=null;},
 };
}
