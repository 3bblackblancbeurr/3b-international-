import * as T from 'three';

/** Calibrate the authored upper-body poses against the real wrist axes. The
 * avatar's animations remain untouched. Aim is model-local, so an actor's
 * heading or its position when loaded never changes a blade's socket/pose. */
export function guardianWeaponAnimations(model,identity,equipment,styleClips){
 const split=['dagues','baltiques','tolede','kilij'].includes(identity.weapon),profiles=[
  ['GuardianAttack',split?'SplitLight':'ThrustLight',false],
  ['GuardianAttack2',split?'SplitHeavy':'ThrustHeavy',false],
  ['GuardianAttack3',split?'Bash':'Thrust',false],
  ['GuardianGuard','Guard',true],
 ],clips=[],mixer=new T.AnimationMixer(model),saved=[];
 model.traverse(o=>{if(o.isBone)saved.push({bone:o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});});
 const times=[0,.18,.38,.6,.8,1],targets=(guard,side,second,t)=>{
  if(guard)return new T.Vector3(side==='l'?-.15:.15,.95,.4).normalize();
  const sweep=split?(side==='l'?-1:1)*(second?-.55:.35)*(t<.4?-1:1):.04;
  return new T.Vector3(sweep,second?.18:.04,1).normalize();
 };
 try{
  for(const [name,sourceName,guard] of profiles){
   const source=styleClips.find(c=>c.name===sourceName);if(!source)continue;const values=new Map(),second=name==='GuardianAttack2';
   for(let i=0;i<times.length;i++){
    mixer.stopAllAction();const action=mixer.clipAction(source);action.reset().play();mixer.setTime(times[i]);model.updateMatrixWorld(true);
    const modelRotation=model.getWorldQuaternion(new T.Quaternion()),weight=guard?(i===0?0:1):[0,.9,1,1,.45,0][i];
    for(const root of equipment.mounts){
     const {side,kind}=root.userData.guardianWeapon;if(kind==='gauntlet')continue;const hand=root.parent;
     const axis=kind==='shield'?new T.Vector3(0,0,1):new T.Vector3(0,1,0),current=axis.applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
     const target=kind==='shield'?new T.Vector3(0,.1,1).normalize():targets(guard,side,second,times[i]);target.applyQuaternion(modelRotation);
     const correction=new T.Quaternion().setFromUnitVectors(current,target),world=hand.getWorldQuaternion(new T.Quaternion()),desired=correction.multiply(world),parent=hand.parent.getWorldQuaternion(new T.Quaternion());
     desired.premultiply(parent.invert()).normalize();const rotation=hand.quaternion.clone().slerp(desired,weight).normalize();
     if(!values.has(hand.name))values.set(hand.name,[]);values.get(hand.name).push(...rotation.toArray());
    }
   }
   const tracks=source.tracks.filter(track=>!values.has(track.name.replace('.quaternion',''))).map(track=>track.clone());
   for(const [hand,rotations] of values)tracks.push(new T.QuaternionKeyframeTrack(hand+'.quaternion',times,rotations));
   clips.push(new T.AnimationClip(name,source.duration,tracks));
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(model);for(const entry of saved){entry.bone.position.copy(entry.position);entry.bone.quaternion.copy(entry.quaternion);entry.bone.scale.copy(entry.scale);}model.updateMatrixWorld(true);}
 return clips;
}
