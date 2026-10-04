import {AnimationClip,Quaternion,QuaternionKeyframeTrack,Euler,Vector3,Box3,Matrix4} from 'three';

const offsets={
 Read:{spine_02:[.07,0,0]},
 Inspect:{spine_02:[.11,.08,0]},
 Sit:{spine_02:[.055,0,0]}
};
const up=new Vector3(0,1,0),forward=new Vector3(0,0,1),position=new Vector3();

function staticIdleTracks(idle){return idle.tracks.map(track=>{
 const values=Array.from(track.createInterpolant().evaluate(0)),result=track.clone();
 result.times=new Float32Array([0,1]);result.values=new Float32Array([...values,...values]);return result;
});}

function standingArms(name,model,tracks,bindMatrices,scale){
 const byName=new Map(tracks.map(track=>[track.name,track]));
 for(const track of tracks){const dot=track.name.lastIndexOf('.'),bone=model.getObjectByName(track.name.slice(0,dot)),property=track.name.slice(dot+1);if(bone?.[property]?.fromArray)bone[property].fromArray(track.values);}
 model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
 const actorQuaternion=model.parent?.getWorldQuaternion(new Quaternion())||new Quaternion(),right=new Vector3(1,0,0).applyQuaternion(actorQuaternion),worldUp=up.clone().applyQuaternion(actorQuaternion),worldForward=forward.clone().applyQuaternion(actorQuaternion),chest=model.getObjectByName('spine_03')||model.getObjectByName('spine_02');
 if(!chest)return;
 const centre=chest.getWorldPosition(new Vector3());
 const setRotation=(bone,q)=>{bone.quaternion.copy(q).normalize();bone.updateWorldMatrix(false,true);byName.set(bone.name+'.quaternion',new QuaternionKeyframeTrack(bone.name+'.quaternion',[0,1],[...bone.quaternion.toArray(),...bone.quaternion.toArray()]));};
 const aimAt=(bone,target)=>{
  const rotation=bone.getWorldQuaternion(new Quaternion()),axis=up.clone().applyQuaternion(rotation),direction=target.clone().sub(bone.getWorldPosition(new Vector3())).normalize(),swing=new Quaternion().setFromUnitVectors(axis,direction);
  setRotation(bone,bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(swing.multiply(rotation)));
 };
 for(const side of ['l','r']){
  const shoulder=model.getObjectByName('upperarm_'+side),elbow=model.getObjectByName('lowerarm_'+side),wrist=model.getObjectByName('hand_'+side);if(!shoulder||!elbow||!wrist)continue;
  model.updateMatrixWorld(true);
  const a=shoulder.getWorldPosition(new Vector3()),b=elbow.getWorldPosition(new Vector3()),c=wrist.getWorldPosition(new Vector3()),l1=a.distanceTo(b),l2=b.distanceTo(c),sign=side==='l'?1:-1;
  // Targets share the measured lower chest height, sit outside the clothing
  // envelope and in front of the torso. Inspection reaches slightly farther
  // with the right hand; both chains keep their original bone lengths.
  const target=centre.clone().addScaledVector(worldUp,-.16*scale).addScaledVector(right,sign*.14*scale).addScaledVector(worldForward,(name==='Inspect'&&side==='r'?.34:.29)*scale);
  const direction=target.clone().sub(a).normalize(),reach=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.015*scale,a.distanceTo(target))),along=(l1*l1-l2*l2+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const pole=right.clone().multiplyScalar(sign*.8).addScaledVector(worldForward,.75);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  aimAt(shoulder,a.clone().addScaledVector(direction,along).addScaledVector(pole,height));aimAt(elbow,a.clone().addScaledVector(direction,reach));
  const handBind=bindMatrices.get(wrist.name),indexBind=bindMatrices.get('index_01_'+side),pinkyBind=bindMatrices.get('pinky_01_'+side),middleBind=bindMatrices.get('middle_01_'+side);
  if(handBind&&indexBind&&pinkyBind&&middleBind){
   const inverseHand=handBind.clone().invert(),knuckle=matrix=>new Vector3().setFromMatrixPosition(matrix).applyMatrix4(inverseHand),fingerAxis=knuckle(middleBind).normalize(),across=knuckle(indexBind).sub(knuckle(pinkyBind));across.addScaledVector(fingerAxis,-across.dot(fingerAxis)).normalize();
   const bindFrame=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across,fingerAxis,across.clone().cross(fingerAxis))),fingerWorld=worldForward.clone().addScaledVector(worldUp,name==='Read'?.25:0).normalize(),acrossWorld=right.clone().multiplyScalar(name==='Read'?sign:-sign);
   // Reading palms support an open book; inspection palms face the display.
   const palmWorld=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(acrossWorld,fingerWorld,acrossWorld.clone().cross(fingerWorld))).multiply(bindFrame.invert());
   setRotation(wrist,wrist.parent.getWorldQuaternion(new Quaternion()).invert().multiply(palmWorld));
  }
  for(const [boneName,bind] of bindMatrices){
   if(!/^(index|middle|ring|pinky|thumb)_\d+/.test(boneName)||!boneName.endsWith('_'+side))continue;
   const bone=model.getObjectByName(boneName),parentBind=bindMatrices.get(bone?.parent.name),idleTrack=byName.get(boneName+'.quaternion');if(!bone||!parentBind||!idleTrack)continue;
   const rest=new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(parentBind.clone().invert().multiply(bind))),grip=new Quaternion().fromArray(idleTrack.values);
   setRotation(bone,rest.slerp(grip,name==='Read'?.2:.14));
  }
 }
 tracks.splice(0,tracks.length,...byName.values());
}

// Uses the shipped skeleton rather than a guessed hip height. The seat is an
// explicit cushion height measured from the walkable floor. Low benches tilt
// shins forward so long-legged avatars keep soles above the floor.
export function createInteractionPoses(idle,model,{scale=1,seatHeight=.9}={}){
 if(!idle||!model)return {clips:[],seatRootOffset:0};
 const transforms=[];model.traverse(o=>transforms.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()]));
 const bindMatrices=new Map();model.traverse(o=>{if(!o.isSkinnedMesh||bindMatrices.size)return;o.skeleton.bones.forEach((bone,i)=>bindMatrices.set(bone.name,o.skeleton.boneInverses[i].clone().invert()));});
 const clips=[];let seatRootOffset=0;
 for(const name of ['Read','Inspect','Sit']){
  const tracks=staticIdleTracks(idle),byName=new Map(tracks.map(t=>[t.name,t]));
  for(const [bone,angles] of Object.entries(offsets[name])){
   const track=byName.get(bone+'.quaternion');if(!track)continue;
   const q=new Quaternion().fromArray(track.values).multiply(new Quaternion().setFromEuler(new Euler(...angles))).normalize();
   track.values=new Float32Array([...q.toArray(),...q.toArray()]);
  }
  if(name==='Read'||name==='Inspect')standingArms(name,model,tracks,bindMatrices,scale);
  if(name==='Sit'){
   // Calibrate in the current Idle frame, then restore it after authoring.
   for(const track of tracks){const dot=track.name.lastIndexOf('.'),bone=model.getObjectByName(track.name.slice(0,dot)),property=track.name.slice(dot+1);if(bone?.[property]?.fromArray)bone[property].fromArray(track.values);}
   model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
   const actor=model.parent,actorQuaternion=actor?.getWorldQuaternion(new Quaternion())||new Quaternion();
   const worldRotation=(boneName,direction)=>{
    const bone=model.getObjectByName(boneName);if(!bone)return;
    const q=new Quaternion().setFromUnitVectors(up,direction).premultiply(actorQuaternion),parent=bone.parent.getWorldQuaternion(new Quaternion());
    bone.quaternion.copy(parent.invert().multiply(q));bone.updateWorldMatrix(false,true);
    byName.set(boneName+'.quaternion',new QuaternionKeyframeTrack(boneName+'.quaternion',[0,1],[...bone.quaternion.toArray(),...bone.quaternion.toArray()]));
   };
   const pelvis=model.getObjectByName('pelvis');
   if(pelvis&&actor){
    pelvis.getWorldPosition(position);actor.worldToLocal(position);seatRootOffset=Math.max(0,Number.isFinite(seatHeight)?seatHeight:.9)-position.y*Math.max(.01,scale);
   }
   const shins=[];
   for(const side of ['l','r']){
    worldRotation('thigh_'+side,forward);
    const foot=model.getObjectByName('foot_'+side),calf=model.getObjectByName('calf_'+side),worldScale=calf?.getWorldScale(new Vector3()).y||scale;
    calf?.getWorldPosition(position);actor?.worldToLocal(position);
    const kneeHeight=position.y*scale+seatRootOffset;
    const shin=Math.max(.05,(foot?.position.length()||.46)*worldScale),drop=Math.min(shin,Math.max(.05,kneeHeight-.11*scale));
    shins.push({side,shin,drop});
    worldRotation('calf_'+side,new Vector3(0,-drop,Math.sqrt(Math.max(0,shin*shin-drop*drop))).normalize());
    worldRotation('foot_'+side,forward);
   }
   // Morphological height and footwear change the ankle-to-sole distance.
   // Inspect the actual skinned shoes only when entering a chair, then adjust
   // shin inclination. This keeps contact without a per-frame vertex pass.
   const shoes=[];model.traverse(o=>{if(o.isMesh&&o.visible&&/^Boots_\d+$/.test(o.name))shoes.push(o);});
   const floor=actor?.getWorldPosition(new Vector3()).y||0;
   for(let iteration=0;iteration<4&&shoes.length;iteration++){
    model.updateMatrixWorld(true);let sole=Infinity;
    for(const shoe of shoes)sole=Math.min(sole,new Box3().setFromObject(shoe,true).min.y+seatRootOffset-floor);
    const correction=.025-sole;if(Math.abs(correction)<.004)break;
    for(const leg of shins){leg.drop=Math.min(leg.shin,Math.max(.02,leg.drop-correction));worldRotation('calf_'+leg.side,new Vector3(0,-leg.drop,Math.sqrt(Math.max(0,leg.shin*leg.shin-leg.drop*leg.drop))).normalize());worldRotation('foot_'+leg.side,forward);}
   }
   // Place wrists over the actual thigh centres. Solving the shipped shoulder,
   // elbow and wrist chain avoids additive Idle angles sending an arm behind
   // the backrest; each elbow bends outward and towards the knees.
   const worldUp=up.clone().applyQuaternion(actorQuaternion);
   const setRotation=(bone,q)=>{bone.quaternion.copy(q).normalize();bone.updateWorldMatrix(false,true);byName.set(bone.name+'.quaternion',new QuaternionKeyframeTrack(bone.name+'.quaternion',[0,1],[...bone.quaternion.toArray(),...bone.quaternion.toArray()]));};
   const aimAt=(boneName,target)=>{
    const bone=model.getObjectByName(boneName);if(!bone)return;
    const rotation=bone.getWorldQuaternion(new Quaternion()),currentAxis=up.clone().applyQuaternion(rotation),direction=target.clone().sub(bone.getWorldPosition(new Vector3())).normalize();
    // Swing the authored rotation onto the target instead of rebuilding it
    // from Y alone: retain the rig's forearm/upper-arm roll and sleeve volume.
    const swing=new Quaternion().setFromUnitVectors(currentAxis,direction);
    setRotation(bone,bone.parent.getWorldQuaternion(new Quaternion()).invert().multiply(swing.multiply(rotation)));
   };
   for(const side of ['l','r']){
    const shoulder=model.getObjectByName('upperarm_'+side),elbow=model.getObjectByName('lowerarm_'+side),wrist=model.getObjectByName('hand_'+side),hip=model.getObjectByName('thigh_'+side),knee=model.getObjectByName('calf_'+side);
    if(![shoulder,elbow,wrist,hip,knee].every(Boolean))continue;
    model.updateMatrixWorld(true);
    const a=shoulder.getWorldPosition(new Vector3()),b=elbow.getWorldPosition(new Vector3()),c=wrist.getWorldPosition(new Vector3());
    const l1=a.distanceTo(b),l2=b.distanceTo(c),target=hip.getWorldPosition(new Vector3()).lerp(knee.getWorldPosition(new Vector3()),.52).addScaledVector(worldUp,.12*scale);
    const direction=target.clone().sub(a).normalize(),reach=Math.max(Math.abs(l1-l2)+.01,Math.min(l1+l2-.015*scale,a.distanceTo(target)));
    const along=(l1*l1-l2*l2+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const pole=new Vector3(side==='l'?.8:-.8,0,.7).applyQuaternion(actorQuaternion);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
    const bend=a.clone().addScaledVector(direction,along).addScaledVector(pole,height),reachable=a.clone().addScaledVector(direction,reach);
    aimAt('upperarm_'+side,bend);aimAt('lowerarm_'+side,reachable);
    const handBind=bindMatrices.get(wrist.name),indexBind=bindMatrices.get('index_01_'+side),pinkyBind=bindMatrices.get('pinky_01_'+side),middleBind=bindMatrices.get('middle_01_'+side);
    if(handBind&&indexBind&&pinkyBind&&middleBind){
     const inverseHand=handBind.clone().invert(),knuckle=matrix=>new Vector3().setFromMatrixPosition(matrix).applyMatrix4(inverseHand);
     const fingerAxis=knuckle(middleBind).normalize(),across=knuckle(indexBind).sub(knuckle(pinkyBind));across.addScaledVector(fingerAxis,-across.dot(fingerAxis)).normalize();
     const bindFrame=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across,fingerAxis,across.clone().cross(fingerAxis)));
     // Index side faces the centre of the body. The mirrored bind frames put
     // both anatomical palms down, fingers towards the knees, with no guess
     // about which local X/Z axis is the dorsal side of either hand.
     const fingerWorld=forward.clone().applyQuaternion(actorQuaternion),acrossWorld=new Vector3(side==='l'?-1:1,0,0).applyQuaternion(actorQuaternion);
     const palmWorld=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(acrossWorld,fingerWorld,acrossWorld.clone().cross(fingerWorld))).multiply(bindFrame.invert());
     setRotation(wrist,wrist.parent.getWorldQuaternion(new Quaternion()).invert().multiply(palmWorld));
    }
    // Idle is the equipped grip (around 77° per finger joint). Use the actual
    // open bind pose with a small fraction of that authored curl for resting
    // fingers and thumb; this leaves the combat grip unchanged on other clips.
    for(const [boneName,bind] of bindMatrices){
     if(!/^(index|middle|ring|pinky|thumb)_\d+/.test(boneName)||!boneName.endsWith('_'+side))continue;
     const bone=model.getObjectByName(boneName),parentBind=bindMatrices.get(bone?.parent.name),idleTrack=byName.get(boneName+'.quaternion');if(!bone||!parentBind||!idleTrack)continue;
     const local=parentBind.clone().invert().multiply(bind),rest=new Quaternion().setFromRotationMatrix(new Matrix4().extractRotation(local)),grip=new Quaternion().fromArray(idleTrack.values);
     setRotation(bone,rest.slerp(grip,.14));
    }
   }
   tracks.splice(0,tracks.length,...byName.values());
  }
  clips.push(new AnimationClip('Pose'+name,1,tracks));
  for(const [o,p,q,s] of transforms){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);}model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
 }
 return {clips,seatRootOffset};
}
