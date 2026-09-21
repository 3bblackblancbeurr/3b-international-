export const PHYSICAL_TRAVERSAL_ACTIONS=Object.freeze(['vault','climb','zipline','swim','dive']);

export const TRAVERSAL_PROFILES=Object.freeze({
 vault:Object.freeze({duration:620,distance:5.2,lift:1.15,animation:'Vault'}),
 climb:Object.freeze({duration:1050,distance:4.2,lift:2.4,animation:'Climb'}),
 zipline:Object.freeze({duration:1900,distance:16,lift:3.2,animation:'Ride'}),
 swim:Object.freeze({duration:1350,distance:8.5,lift:.18,animation:'Swim'}),
 dive:Object.freeze({duration:1500,distance:7,lift:-.48,animation:'Dive'}),
});

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;

export function isPhysicalTraversalAction(actionId){return PHYSICAL_TRAVERSAL_ACTIONS.includes(actionId);}

export function traversalProfile(actionId){return TRAVERSAL_PROFILES[actionId]||null;}

export function traversalPlan(actionId,from,item={},heading=0,worldRadius=260){
 const profile=traversalProfile(actionId);if(!profile)return null;
 const origin={x:finite(from?.x),z:finite(from?.z)},ix=finite(item?.x,origin.x),iz=finite(item?.z,origin.z),dx=ix-origin.x,dz=iz-origin.z,d=Math.hypot(dx,dz);
 const a=heading*Math.PI/180,dir=d>.3?{x:dx/d,z:dz/d}:{x:Math.sin(a),z:Math.cos(a)};
 const explicit=item.traversalTo&&Number.isFinite(item.traversalTo.x)&&Number.isFinite(item.traversalTo.z)?item.traversalTo:null;
 let to=explicit?{x:explicit.x,z:explicit.z}:{x:origin.x+dir.x*profile.distance,z:origin.z+dir.z*profile.distance};
 const radius=Math.max(4,finite(worldRadius,260)-2),r=Math.hypot(to.x,to.z);
 if(r>radius){const scale=radius/r;to={x:to.x*scale,z:to.z*scale};}
 return Object.freeze({actionId,from:origin,to:Object.freeze(to),duration:profile.duration,lift:profile.lift,animation:profile.animation,distance:Math.hypot(to.x-origin.x,to.z-origin.z)});
}

export function traversalPose(plan,elapsedMs){
 if(!plan)return null;const p=clamp(finite(elapsedMs)/Math.max(1,plan.duration),0,1),smooth=p*p*(3-2*p),arc=Math.sin(Math.PI*p);
 return {progress:p,x:plan.from.x+(plan.to.x-plan.from.x)*smooth,z:plan.from.z+(plan.to.z-plan.from.z)*smooth,lift:plan.lift*arc,done:p>=1};
}

export function shortenTraversalPlan(plan,factor=.72){
 if(!plan)return null;const f=clamp(factor,.2,.95),to={x:plan.from.x+(plan.to.x-plan.from.x)*f,z:plan.from.z+(plan.to.z-plan.from.z)*f};
 return Object.freeze({...plan,to:Object.freeze(to),distance:Math.hypot(to.x-plan.from.x,to.z-plan.from.z),duration:Math.max(320,Math.round(plan.duration*f))});
}

export function validateTraversalProfiles(){
 const modes=new Set(PHYSICAL_TRAVERSAL_ACTIONS);
 if(modes.size!==5)throw Error('Cinq déplacements physiques attendus');
 for(const id of modes){const p=TRAVERSAL_PROFILES[id];if(!p||p.duration<300||p.distance<3||!Number.isFinite(p.lift)||!p.animation)throw Error('Profil traversal incomplet : '+id);}
 return true;
}
