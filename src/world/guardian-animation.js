import * as T from 'three';

// The poster's eight weapons have different shoulder lines, preparation and
// follow-through. These offsets never translate the root or change hit timing.
const gestures=Object.freeze({
 rapiere:{lean:.04,turn:-.13,shoulder:-.08,sweep:.08,lift:.04,prepare:.19,recover:.72},
 escrime:{lean:-.04,turn:-.19,shoulder:-.12,sweep:.14,lift:.09,prepare:.22,recover:.76},
 flyssa:{lean:.09,turn:.16,shoulder:-.17,sweep:-.22,lift:.12,prepare:.24,recover:.79},
 lance:{lean:.18,turn:-.06,shoulder:-.24,sweep:.03,lift:.06,prepare:.26,recover:.82},
 dagues:{lean:.12,turn:.24,shoulder:-.11,sweep:.28,lift:.03,prepare:.17,recover:.67},
 baltiques:{lean:-.06,turn:-.24,shoulder:-.07,sweep:-.24,lift:.18,prepare:.23,recover:.74},
 tolede:{lean:.13,turn:.29,shoulder:-.2,sweep:.32,lift:.11,prepare:.2,recover:.78},
 kilij:{lean:.2,turn:.11,shoulder:-.28,sweep:.19,lift:.27,prepare:.27,recover:.86},
});

export function guardianCombatAnimation(intent,combo=1){
 if(['rituel','gel','éclipse','sable','vague','soin'].includes(intent))return 'GuardianPower';
 if(intent==='rempart')return 'GuardianGuard';
 return intent==='double'?'GuardianAttack2':intent==='percée'?'GuardianAttack3':combo===3?'GuardianAttack3':'GuardianAttack';
}

/** Bake model-local wrist calibration once, against the actual imported rig.
 * The actor's mixer reads these clips without IK or allocations in its frame. */
export function guardianWeaponAnimations(model,identity,equipment,styleClips){
 const split=['dagues','baltiques','tolede','kilij'].includes(identity.weapon),gesture=gestures[identity.weapon]||gestures.rapiere;
 const profiles=[
  ['GuardianAttack',split?'SplitLight':'ThrustLight','attack'],
  ['GuardianAttack2',split?'SplitHeavy':'ThrustHeavy','second'],
  ['GuardianAttack3',split?'Bash':'Thrust','heavy'],
  ['GuardianGuard','Guard','guard'],
  ['GuardianAnticipation',split?'SplitHeavy':'ThrustHeavy','anticipation'],
  ['GuardianPower',split?'SplitHeavy':'ThrustHeavy','power'],
  ['GuardianRecover','Guard','recovery'],
 ],clips=[],mixer=new T.AnimationMixer(model),saved=[];
 model.traverse(o=>{if(o.isBone)saved.push({bone:o,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});});
 const targets=(kind,side,t)=>{
  if(kind==='guard')return new T.Vector3(side==='l'?-.15:.15,.95,.4).normalize();
  if(kind==='anticipation')return new T.Vector3((side==='l'?-1:1)*(.18+Math.abs(gesture.sweep)),.74+gesture.lift,.54).normalize();
  if(kind==='power')return new T.Vector3(side==='l'?-.28:.28,.35+gesture.lift,1).normalize();
  if(kind==='recovery')return new T.Vector3(side==='l'?-.2:.2,.28,1).normalize();
  const handed=side==='l'?-1:1,second=kind==='second';
  const sweep=split?handed*(second?-.24:.3):gesture.sweep;
  return new T.Vector3(sweep*(t<.3?-1:1),gesture.lift+(kind==='heavy'?.05:0),1).normalize();
 };
 try{
  for(const [name,sourceName,kind] of profiles){
   const source=styleClips.find(c=>c.name===sourceName);if(!source)continue;
   const held=['guard','anticipation','recovery'].includes(kind),times=[0,gesture.prepare,.38,.56,gesture.recover,1];
   const samples=held?[0,.18,.18,.18,.18,.18]:[0,.18,.38,.55,.78,1];
   const envelope=held?[0,1,1,1,1,1]:[0,-.32,1,.68,.12,0],values=new Map();
   const offsets={spine_02:[gesture.lean,gesture.turn,0],upperarm_r:[gesture.shoulder,0,-Math.abs(gesture.sweep)*.15],upperarm_l:[gesture.shoulder*.5,0,Math.abs(gesture.sweep)*.18]};
   for(const track of source.tracks){
    const bone=track.name.replace('.quaternion','');if(!track.name.endsWith('.quaternion')||!offsets[bone])continue;
    const rotations=[],interpolant=track.createInterpolant();for(let i=0;i<times.length;i++){
     const rotation=new T.Quaternion().fromArray(interpolant.evaluate(samples[i]));
     const offset=offsets[bone].map(v=>v*envelope[i]*(kind==='second'?1.15:kind==='heavy'?1.3:1));
     rotation.multiply(new T.Quaternion().setFromEuler(new T.Euler(...offset))).normalize();rotations.push(...rotation.toArray());
    }
    offsets[bone]=new T.QuaternionKeyframeTrack(track.name,times,rotations);
   }
   const posedTracks=source.tracks.map(track=>offsets[track.name.replace('.quaternion','')] instanceof T.QuaternionKeyframeTrack?offsets[track.name.replace('.quaternion','')]:track.clone());
   // A held source is a true preparation pose, not a looping attack while the
   // authoritative windup is still pending.
   if(held)for(let i=0;i<posedTracks.length;i++){
    const track=posedTracks[i];if(!track.name.endsWith('.quaternion')||offsets[track.name.replace('.quaternion','')] instanceof T.QuaternionKeyframeTrack)continue;
    const interpolant=track.createInterpolant(),rotations=[];for(const sample of samples)rotations.push(...interpolant.evaluate(sample));
    posedTracks[i]=new T.QuaternionKeyframeTrack(track.name,times,rotations);
   }
   const posed=new T.AnimationClip(name+'-source',1,posedTracks);
   for(let i=0;i<times.length;i++){
    mixer.stopAllAction();const action=mixer.clipAction(posed);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(times[i]);model.updateMatrixWorld(true);
    const modelRotation=model.getWorldQuaternion(new T.Quaternion()),weight=held?(i===0?0:1):[0,.85,1,1,.42,0][i];
    for(const root of equipment.mounts){
     const {side,kind:weaponKind}=root.userData.guardianWeapon;if(weaponKind==='gauntlet')continue;const hand=root.parent;
     const axis=weaponKind==='shield'?new T.Vector3(0,0,1):new T.Vector3(0,1,0),current=axis.applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
     const target=weaponKind==='shield'?new T.Vector3(0,.1,1).normalize():targets(kind,side,times[i]);target.applyQuaternion(modelRotation);
     const correction=new T.Quaternion().setFromUnitVectors(current,target),world=hand.getWorldQuaternion(new T.Quaternion()),desired=correction.multiply(world),parent=hand.parent.getWorldQuaternion(new T.Quaternion());
     desired.premultiply(parent.invert()).normalize();const rotation=hand.quaternion.clone().slerp(desired,weight).normalize();
     if(!values.has(hand.name))values.set(hand.name,[]);values.get(hand.name).push(...rotation.toArray());
    }
   }
   const tracks=posed.tracks.filter(track=>!values.has(track.name.replace('.quaternion',''))).map(track=>track.clone());
   for(const [hand,rotations] of values)tracks.push(new T.QuaternionKeyframeTrack(hand+'.quaternion',times,rotations));
   clips.push(new T.AnimationClip(name,1,tracks));mixer.stopAllAction();mixer.uncacheClip(posed);
  }
 }finally{mixer.stopAllAction();mixer.uncacheRoot(model);for(const entry of saved){entry.bone.position.copy(entry.position);entry.bone.quaternion.copy(entry.quaternion);entry.bone.scale.copy(entry.scale);}model.updateMatrixWorld(true);}
 return clips;
}
