import {AnimationClip,Quaternion,QuaternionKeyframeTrack,Euler,Vector3,Box3} from 'three';

const offsets={
 Read:{spine_02:[.07,0,0],upperarm_r:[-.44,.1,-.22],lowerarm_r:[-.95,0,0],upperarm_l:[-.44,-.1,.22],lowerarm_l:[-.95,0,0]},
 Inspect:{spine_02:[.11,.08,0],upperarm_r:[-.4,.13,-.28],lowerarm_r:[-.6,0,0],upperarm_l:[-.18,-.1,.2],lowerarm_l:[-.5,0,0]},
 Sit:{spine_02:[.055,0,0]}
};
const up=new Vector3(0,1,0),forward=new Vector3(0,0,1),position=new Vector3();

function staticIdleTracks(idle){return idle.tracks.map(track=>{
 const values=Array.from(track.createInterpolant().evaluate(0)),result=track.clone();
 result.times=new Float32Array([0,1]);result.values=new Float32Array([...values,...values]);return result;
});}

// Uses the shipped skeleton rather than a guessed hip height. The seat is an
// explicit cushion height measured from the walkable floor. Low benches tilt
// shins forward so long-legged avatars keep soles above the floor.
export function createInteractionPoses(idle,model,{scale=1,seatHeight=.9}={}){
 if(!idle||!model)return {clips:[],seatRootOffset:0};
 const transforms=[];model.traverse(o=>transforms.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()]));
 const clips=[];let seatRootOffset=0;
 for(const name of ['Read','Inspect','Sit']){
  const tracks=staticIdleTracks(idle),byName=new Map(tracks.map(t=>[t.name,t]));
  for(const [bone,angles] of Object.entries(offsets[name])){
   const track=byName.get(bone+'.quaternion');if(!track)continue;
   const q=new Quaternion().fromArray(track.values).multiply(new Quaternion().setFromEuler(new Euler(...angles))).normalize();
   track.values=new Float32Array([...q.toArray(),...q.toArray()]);
  }
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
   const inverseActor=actorQuaternion.clone().invert(),worldUp=up.clone().applyQuaternion(actorQuaternion);
   const aimAt=(boneName,target)=>{
    const bone=model.getObjectByName(boneName);if(!bone)return;
    const direction=target.clone().sub(bone.getWorldPosition(new Vector3())).normalize().applyQuaternion(inverseActor);
    worldRotation(boneName,direction);
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
    aimAt('upperarm_'+side,bend);aimAt('lowerarm_'+side,reachable);worldRotation('hand_'+side,forward);
   }
   tracks.splice(0,tracks.length,...byName.values());
  }
  clips.push(new AnimationClip('Pose'+name,1,tracks));
  for(const [o,p,q,s] of transforms){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);}model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);
 }
 return {clips,seatRootOffset};
}
