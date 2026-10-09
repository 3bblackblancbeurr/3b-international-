import {Euler,MathUtils,Matrix4,Quaternion,Vector3} from 'three';

// Device axes are defined by https://www.w3.org/TR/orientation-event/.
// The relative calibration deliberately makes no compass or position claim.
const correction=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2);
const screenAxis=new Vector3(0,0,1),verticalAxis=new Vector3(0,1,0);

export function deviceOrientationQuaternion(reading={}){
 if(!reading||typeof reading!=='object')return null;
 const {alpha,beta,gamma,screen=0}=reading;
 if(![alpha,beta,gamma,screen].every(Number.isFinite))return null;
 return new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(beta),MathUtils.degToRad(alpha),-MathUtils.degToRad(gamma),'YXZ'))
  .multiply(correction).multiply(new Quaternion().setFromAxisAngle(screenAxis,-MathUtils.degToRad(screen))).normalize();
}

export function createLensViewController(camera,{eyeHeight=1.6}={}){
 const target=new Vector3(0,1,0),eye=new Vector3(0,eyeHeight,0),euler=new Euler(0,0,0,'YXZ');
 const base=new Quaternion(),delta=new Quaternion();
 let mode='3d',yaw=-.12,pitch=.18,distance=10.2,current=null,baseline=null;
 function calibrate(){baseline=current?.clone()||null;}
 function apply(){
  if(mode==='camera'){
   camera.position.copy(eye);base.setFromEuler(euler.set(pitch,yaw,0,'YXZ'));
  }else{
   camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);
   camera.lookAt(target);base.copy(camera.quaternion);
  }
  camera.quaternion.copy(base);
  if(current){if(!baseline)calibrate();delta.copy(baseline).invert().multiply(current);camera.quaternion.multiply(delta).normalize();}
  camera.updateMatrixWorld();return camera;
 }
 function focus(point,nearDistance=10.2){
  target.copy(point);
  if(mode==='camera'){
   camera.position.copy(eye);camera.lookAt(target);euler.setFromQuaternion(camera.quaternion,'YXZ');pitch=euler.x;yaw=euler.y;
  }else{distance=nearDistance;yaw=-.12;pitch=.18;}
  calibrate();apply();
 }
 return {
  apply,focus,
  setMode(value){const next=value==='camera'?'camera':'3d';if(next===mode)return;mode=next;yaw=mode==='camera'?0:-.12;pitch=mode==='camera'?0:.18;calibrate();apply();},
  rotate(dx,dy){if(mode==='camera'){yaw-=dx*.005;pitch=MathUtils.clamp(pitch-dy*.004,-1.35,1.35);}else{yaw-=dx*.008;pitch=MathUtils.clamp(pitch+dy*.006,-.2,1.05);}apply();},
  zoom(factor){if(mode!=='3d'||!Number.isFinite(factor)||factor<=0)return false;distance=MathUtils.clamp(distance*factor,2.3,24);apply();return true;},
  setDistance(value){if(mode==='3d'&&Number.isFinite(value)){distance=MathUtils.clamp(value,2.3,24);apply();}},
  recenter(overviewDistance=10.2){yaw=mode==='camera'?0:-.12;pitch=mode==='camera'?0:.18;distance=overviewDistance;target.set(0,1,0);calibrate();apply();},
  setOrientation(reading){const next=deviceOrientationQuaternion(reading);if(!next)return false;current=next;apply();return true;},
  stopOrientation(){if(mode==='camera'&&current){apply();euler.setFromQuaternion(camera.quaternion,'YXZ');pitch=euler.x;yaw=euler.y;}current=null;baseline=null;apply();},
  get mode(){return mode;},get distance(){return distance;},get orientationActive(){return current!==null;},
 };
}

// Hit-test poses use metres. Keep unit scale and put a human-scale portal on
// the detected floor, facing the viewer rather than an arbitrary plane yaw.
export function worldPlacementMatrix(pose,viewerPosition){
 const position=new Vector3(pose[12],pose[13],pose[14]);
 const viewer=viewerPosition&&[viewerPosition.x,viewerPosition.y,viewerPosition.z].every(Number.isFinite)?viewerPosition:null;
 const dx=viewer?viewer.x-position.x:0,dz=viewer?viewer.z-position.z:1;
 const yaw=Math.hypot(dx,dz)>.001?Math.atan2(dx,dz):0;
 return new Matrix4().compose(position,new Quaternion().setFromAxisAngle(verticalAxis,yaw),new Vector3(1,1,1));
}
