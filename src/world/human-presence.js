import {Vector3,Quaternion,Euler,MathUtils} from 'three';

// A small additive layer on the authored pose, restored before every mixer
// evaluation. The rig's root, legs, hand contact and combat poses stay intact.
export function createHumanPresence(model,{reducedMotion=false}={}){
 const head=model.getObjectByName('Head')||model.getObjectByName('head'),chest=model.getObjectByName('spine_03')||model.getObjectByName('spine_02');
 const bones=[head,chest].filter(Boolean).map(bone=>({bone,q:bone.quaternion.clone(),scale:bone.scale.clone(),layered:false}));
 const point=new Vector3(),offset=new Quaternion(),rotation=new Euler(0,0,0,'YXZ');let yaw=0,pitch=0;
 return{
  beforeMixer(){for(const b of bones)if(b.layered){b.bone.quaternion.copy(b.q);b.bone.scale.copy(b.scale);b.layered=false;}},
  update(dt,time,{viewer=null,active=false,speed=0}={}){
   for(const b of bones){b.q.copy(b.bone.quaternion);b.scale.copy(b.bone.scale);}
   if(reducedMotion||active)return;
   let targetYaw=0,targetPitch=0;
   if(viewer&&[viewer.x,viewer.y,viewer.z].every(Number.isFinite)){
    model.updateWorldMatrix(true,false);point.set(viewer.x,viewer.y,viewer.z);model.worldToLocal(point);
    const d=Math.hypot(point.x,point.z),angle=Math.atan2(point.x,point.z);
    if(d>.1&&d<12&&Math.abs(angle)<1.2){targetYaw=MathUtils.clamp(angle,-.32,.32);targetPitch=MathUtils.clamp(-Math.atan2(point.y-1.65,d),-.12,.12);}
   }
   const blend=1-Math.exp(-MathUtils.clamp(dt,0,.25)*4);yaw+=(targetYaw-yaw)*blend;pitch+=(targetPitch-pitch)*blend;
   if(head){rotation.set(pitch,yaw,0);head.quaternion.multiply(offset.setFromEuler(rotation)).normalize();bones.find(b=>b.bone===head).layered=true;}
   if(chest&&speed<.08){chest.scale.x*=1+Math.sin(time*1.65)*.003;chest.scale.z*=1+Math.sin(time*1.65)*.004;bones.find(b=>b.bone===chest).layered=true;}
  },
  dispose(){this.beforeMixer();},
 };
}
