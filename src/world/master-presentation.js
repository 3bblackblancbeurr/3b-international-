// Presentation only: accepted combat transitions and the canonical clock remain
// the source of truth. No movement, damage, inventory or reward is changed here.
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

export function skyKeyDirection(hour=12){
 const angle=(((Number(hour)||0)%24+24)%24-6)/24*Math.PI*2;
 const x=Math.cos(angle),y=.18+.82*Math.abs(Math.sin(angle)),z=.32+.22*Math.sin(angle),length=Math.hypot(x,y,z);
 return {x:x/length,y:y/length,z:z/length};
}

export function masterRenderBudget(mode='auto',{desktopClass=false}={}){
 return {shadowInterval:mode==='fluid'?Infinity:desktopClass?(mode==='detail'?33:50):83,
  skyDetail:mode==='fluid'?0:desktopClass?1:.35};
}

export function combatCameraView(view,hero,enemy,{enabled=true,aspect=1,fov=60}={}){
 if(!enabled||![hero?.x,hero?.y,hero?.z,enemy?.x,enemy?.y,enemy?.z].every(Number.isFinite))return view;
 const distance=Math.hypot(enemy.x-hero.x,enemy.z-hero.z);
 if(distance>36)return view;
 const focus=clamp((36-distance)/14,0,1),weight=.42*focus;
 const target={x:view.target.x+(enemy.x-hero.x)*weight,y:view.target.y+(enemy.y-hero.y)*weight,z:view.target.z+(enemy.z-hero.z)*weight};
 let dx=view.position.x-view.target.x,dz=view.position.z-view.target.z;
 const dy=view.position.y-view.target.y,length=Math.hypot(dx,dy,dz)||1;
 // When both actors line up with the camera, their silhouettes and attacks
 // overlap. A small automatic shoulder angle separates them without changing
 // the player's orbit setting, zoom distance, or manually chosen view.
 const horizontal=Math.hypot(dx,dz),opponentX=enemy.x-hero.x,opponentZ=enemy.z-hero.z;
 const alignment=horizontal&&distance?Math.abs((dx*opponentX+dz*opponentZ)/(horizontal*distance)):0;
 const shoulder=clamp((alignment-.78)/.22,0,1)*.42*focus,c=Math.cos(shoulder),s=Math.sin(shoulder);
 [dx,dz]=[dx*c+dz*s,dz*c-dx*s];
 const halfFov=Math.atan(Math.tan(clamp(fov,35,90)*Math.PI/360)*clamp(aspect,.35,1));
 const required=(distance*Math.max(weight,1-weight)+2.8)/Math.sin(halfFov);
 const framed=length+(clamp(required,length,70)-length)*focus;
 return {target,position:{x:target.x+dx/length*framed,y:target.y+dy/length*framed,z:target.z+dz/length*framed}};
}

export function createCameraImpulse({reducedMotion=false}={}){
 let started=-Infinity,strength=0;
 const offset={x:0,y:0};
 return {
  start(cue,time){
   strength=reducedMotion?0:clamp((cue?.outgoing||0)*.005+(cue?.incoming||0)*.004,0,.12);
   started=Number(time)||0;
  },
  sample(time){
   const age=time-started,envelope=age>=0&&age<.24?Math.pow(1-age/.24,2)*strength:0;
   offset.x=Math.sin(age*47)*envelope;offset.y=Math.sin(age*31)*envelope*.65;
   if(!envelope)offset.x=offset.y=0;
   return offset;
  },
  clear(){strength=0;offset.x=offset.y=0;},
 };
}
