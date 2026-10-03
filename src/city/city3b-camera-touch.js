import {Vector2,Vector3,Raycaster,Plane,Spherical} from 'three';

export function cityTouchRotation(startAngle,nextAngle){
 const delta=Math.atan2(Math.sin(nextAngle-startAngle),Math.cos(nextAngle-startAngle));
 const threshold=8*Math.PI/180;
 return Math.sign(delta)*Math.max(0,Math.abs(delta)-threshold);
}

function groundPoint(camera,gesture,rect,height){
 const ray=new Raycaster();ray.setFromCamera(new Vector2((gesture.x-rect.left)/rect.width*2-1,1-(gesture.y-rect.top)/rect.height*2),camera);
 return ray.ray.intersectPlane(new Plane(new Vector3(0,1,0),-height),new Vector3());
}


export function cityTouchGesture(points){
 const [a,b]=points;
 return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(b.x-a.x,b.y-a.y),angle:Math.atan2(b.y-a.y,b.x-a.x)}:{x:a.x,y:a.y,distance:0,angle:0};
}

// Own touch camera input separately from single-finger construction strokes.
export function attachCityTouchCamera(element,{camera,controls,motion,canPan,canOrbit=()=>false,groundHeight=()=>0,onGesture,onConstruction=()=>{}}){
 const fingers=new Map();let active=false,start=null,moved=false;
 const snapshot=()=>{
  if(!fingers.size){start=null;return;}
  start={gesture:cityTouchGesture([...fingers.values()]),target:controls.target.clone(),offset:camera.position.clone().sub(controls.target),right:new Vector3(1,0,0).applyQuaternion(camera.quaternion),height:Math.max(1,element.clientHeight)};
  start.right.y=0;start.right.normalize();
  start.rect=element.getBoundingClientRect();start.camera=camera.clone();start.camera.updateMatrixWorld();
  start.anchor=groundPoint(start.camera,start.gesture,start.rect,start.target.y);
 };
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const down=e=>{
  if(e.pointerType!=='touch')return;
  if(fingers.size>=2){consume(e);return;}
  if(!fingers.size)moved=false;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});element.setPointerCapture(e.pointerId);
  active=active||fingers.size===2||canPan()||canOrbit();
  consume(e);if(fingers.size===2){moved=true;motion.cancel();onGesture();}else{if(active)motion.cancel();onConstruction(e);}snapshot();
 };
 const move=e=>{
  if(!fingers.has(e.pointerId))return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  consume(e);if(!active){onConstruction(e);return;}if(!start)return;
  const next=cityTouchGesture([...fingers.values()]),two=fingers.size===2;
  if(!moved&&Math.hypot(next.x-start.gesture.x,next.y-start.gesture.y)<=7)return;
  moved=true;onGesture();
  if(!two&&canOrbit()){
   const orbit=new Spherical().setFromVector3(start.offset);
   orbit.theta-=(next.x-start.gesture.x)/start.height*Math.PI;
   orbit.phi=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,orbit.phi-(next.y-start.gesture.y)/start.height*Math.PI));
   const offset=new Vector3().setFromSpherical(orbit);
   // Lift the pivot with the eye when looking upward; never orbit underground.
   const target=start.target.clone();target.y+=Math.max(0,groundHeight(target.x+offset.x,target.z+offset.z)+2.01-(target.y+offset.y));
   motion.move(target.clone().add(offset),target,true);return;
  }
  const ratio=two?start.gesture.distance/Math.max(1,next.distance):1;
  const offset=start.offset.clone().multiplyScalar(ratio);
  offset.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length())));
  if(two)offset.applyAxisAngle(new Vector3(0,1,0),cityTouchRotation(start.gesture.angle,next.angle));
  const scale=2*offset.length()*Math.tan(camera.fov*Math.PI/360)/start.height;
  const forward=new Vector3(start.right.z,0,-start.right.x);
  const target=start.target.clone();
  // Keep the terrain point grabbed at gesture start underneath the fingers.
  const candidate=start.camera;candidate.position.copy(target).add(offset);candidate.lookAt(target);candidate.updateMatrixWorld();
  const underFinger=groundPoint(candidate,next,start.rect,target.y);
  if(start.anchor&&underFinger)target.add(start.anchor.clone().sub(underFinger));
  else target.addScaledVector(start.right,-(next.x-start.gesture.x)*scale).addScaledVector(forward,(next.y-start.gesture.y)*scale);
  motion.move(target.clone().add(offset),target,true);
 };
 const up=e=>{
  if(!fingers.delete(e.pointerId))return;
  consume(e);if(active&&moved)onGesture();else onConstruction(e);
  if(!fingers.size)active=false;
  snapshot();
 };
 const reset=()=>{fingers.clear();active=false;start=null;onGesture();};
 for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])element.addEventListener(name,fn,{capture:true,passive:false});
 window.addEventListener('blur',reset);
 return ()=>{for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])element.removeEventListener(name,fn,true);window.removeEventListener('blur',reset);};
}
