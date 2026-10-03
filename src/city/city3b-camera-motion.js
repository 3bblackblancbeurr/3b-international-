import {Vector3,Spherical} from 'three';

// Animate in orbit coordinates so rotation never cuts through the city.
export function createCityCameraMotion(camera,controls,bounds=()=>Infinity){
 let goal=null;
 const orbit=()=>new Spherical().setFromVector3(camera.position.clone().sub(controls.target));
 function move(position,target,instant=false){
  const savedPosition=camera.position.clone(),savedTarget=controls.target.clone(),damping=controls.enableDamping;
  controls.enableDamping=false;controls.update(); // Drain any old drag inertia.
  camera.position.copy(savedPosition);controls.target.copy(savedTarget);controls.enableDamping=damping;
  const spherical=new Spherical().setFromVector3(position.clone().sub(target));
  spherical.radius=Math.max(controls.minDistance,Math.min(controls.maxDistance,spherical.radius));
  spherical.phi=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,spherical.phi));
  const half=bounds(),bounded=target.clone();bounded.x=Math.max(-half,Math.min(half,bounded.x));bounded.z=Math.max(-half,Math.min(half,bounded.z));
  goal={target:bounded,spherical};
  if(instant)update(1,true);
 }
 function update(dt,instant=false){
  if(!goal)return false;
  const value=orbit(),alpha=instant?1:1-Math.exp(-14*Math.max(0,dt));
  const angle=Math.atan2(Math.sin(goal.spherical.theta-value.theta),Math.cos(goal.spherical.theta-value.theta));
  value.theta+=angle*alpha;value.phi+=(goal.spherical.phi-value.phi)*alpha;value.radius+=(goal.spherical.radius-value.radius)*alpha;
  controls.target.lerp(goal.target,alpha);
  const done=instant||(controls.target.distanceToSquared(goal.target)<1e-6&&Math.abs(angle)<1e-5&&Math.abs(value.phi-goal.spherical.phi)<1e-5&&Math.abs(value.radius-goal.spherical.radius)<.001);
  if(done){controls.target.copy(goal.target);value.copy(goal.spherical);goal=null;}
  camera.position.copy(controls.target).add(new Vector3().setFromSpherical(value));controls.update();return true;
 }
 const destination=()=>goal?{target:goal.target.clone(),spherical:goal.spherical.clone()}:{target:controls.target.clone(),spherical:orbit()};
 return {get active(){return !!goal;},move,update,cancel(){goal=null;},
  zoom(factor,instant){const next=destination();next.spherical.radius*=factor;move(next.target.clone().add(new Vector3().setFromSpherical(next.spherical)),next.target,instant);},
  rotate(angle,instant){const next=destination();next.spherical.theta+=angle;move(next.target.clone().add(new Vector3().setFromSpherical(next.spherical)),next.target,instant);},
  pan(offset,instant){const next=destination();next.target.add(offset);move(next.target.clone().add(new Vector3().setFromSpherical(next.spherical)),next.target,instant);},
 };
}
