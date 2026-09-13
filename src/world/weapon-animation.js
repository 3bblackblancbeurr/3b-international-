import {AnimationClip,QuaternionKeyframeTrack,Quaternion,Euler} from 'three';

// Authored upper-body poses, relative to the traveller's idle pose. Locomotion
// remains on its independent leg layer. No root translation or damage timing here.
const basePoses={
 Thrust:{spine_02:[.08,-.2,0],upperarm_r:[-.55,.15,-.25],lowerarm_r:[.1,0,0],upperarm_l:[-.35,-.15,.2],lowerarm_l:[-.55,0,0]},
 Split:{spine_02:[0,.28,0],upperarm_r:[-.4,-.2,-.7],lowerarm_r:[-.3,0,0],upperarm_l:[-.3,.2,.55]},
 Bash:{spine_02:[.16,-.12,0],upperarm_r:[-.6,.15,-.3],lowerarm_r:[-.65,0,0]},
 Guard:{spine_02:[.06,-.1,0],upperarm_r:[-.55,.1,-.25],lowerarm_r:[-1,0,0],upperarm_l:[-.35,-.1,.2],lowerarm_l:[-.65,0,0]}
};

const weaponPoses={
 paris:{Light:{Thrust:[.04,-.2,0]},Heavy:{Thrust:[.18,-.34,0], upperarm_r:[-.72,.02,-.34],lowerarm_r:[-.12,-.02,0]}},
 scissors:{Light:{Split:[0,.31,0],upperarm_l:[-.2,.32,.7]},Heavy:{Split:[.18,.12,0],upperarm_r:[-.55,-.17,-.75],lowerarm_r:[-.42,0,0]}},
 axe:{Light:{Bash:[.22,-.16,0],upperarm_r:[-.58,.18,-.31],lowerarm_r:[-.5,0,0]},Heavy:{Bash:[.31,-.08,0],upperarm_r:[-.64,.06,-.41],lowerarm_r:[-.98,0,0]}},
 claws:{Light:{upperarm_r:[-.46,-.03,.02],lowerarm_r:[-.1,0,0],spine_02:[.03,.07,0]},Heavy:{upperarm_r:[-.7,-.15,.18],lowerarm_r:[-.44,0,0],spine_02:[.14,.2,0]}},
 thread:{Light:{upperarm_r:[-.32,.13,-.4],lowerarm_r:[-.03,-.07,0],spine_02:[.02,-.1,0]},Heavy:{upperarm_r:[-.22,.09,-.65],lowerarm_r:[-.26,-.06,0],spine_02:[.14,.06,0]}},
 bow:{Light:{upperarm_r:[-.48,-.24,-.1],lowerarm_r:[.1,.08,0],spine_02:[-.08,0,0],upperarm_l:[-.18,-.03,.33],lowerarm_l:[-.25,.14,0]},Heavy:{upperarm_r:[-.58,-.28,-.16],lowerarm_r:[.08,.1,0],spine_02:[-.02,-.05,0],upperarm_l:[-.08,-.02,.43],lowerarm_l:[-.41,.16,0]}},
 wings:{Light:{spine_02:[-.06,0,0],upperarm_r:[-.24,-.04,-.02],lowerarm_r:[.17,.04,0]},Heavy:{spine_02:[.05,.16,0],upperarm_r:[-.28,-.14,-.05],lowerarm_r:[.24,0,0]}}
};

function addBoneOffset(base, bone, delta=[0,0,0]){
 return [...base.slice(0,3).map((v,i)=>v+(delta[i]||0))];
}

function createClip(base,name,idle,times=[0,.18,.38,.55,.78,1],weights=name==='Guard'?[0,1,1,1,1,1]:[0,-.22,1,.8,.25,0]){
 const tracks=idle.tracks.filter(t=>! /^(root|pelvis|thigh_|calf_|foot_|ball_)/.test(t.name)).map(t=>{
  const bone=t.name.replace('.quaternion','');
  if(!base[bone]||!t.name.endsWith('.quaternion'))return t.clone();
  const baseRotation=new Quaternion().fromArray(t.createInterpolant().evaluate(0));
  const values=weights.flatMap(w=>{
   const offset=base[bone].map(v=>v*w);
   return baseRotation.clone().multiply(new Quaternion().setFromEuler(new Euler(...offset))).normalize().toArray();
  });
  return new QuaternionKeyframeTrack(t.name,times,values);
 });
 return new AnimationClip(name,1,tracks);
}

function mapWeaponPose(weapon,action,power='Light'){
 const profile=weaponPoses[weapon]||{};
 const bonus=profile[power]||{};
 const base=basePoses[action] || {};
 const keys=new Set([...Object.keys(base),...Object.keys(bonus)]);
 const merged={};
 for(const key of keys){
  const a=base[key]||[0,0,0];
  const b=bonus[key]||[0,0,0];
  merged[key]=addBoneOffset(a,b);
 }
 return merged;
}

export function weaponAnimations(idle,weapon=''){
 if(!idle)return [];
 const base=Object.entries(basePoses).map(([name,pose])=>createClip(pose,name,idle));
 if(!weapon) return base;
 const byWeapon={
  paris:{Light:'ThrustLight',Heavy:'ThrustHeavy'},
  scissors:{Light:'SplitLight',Heavy:'SplitHeavy'},
  axe:{Light:'BashLight',Heavy:'BashHeavy'},
  claws:{Light:'Slash',Heavy:'Rake'},
  thread:{Light:'CastLean',Heavy:'CastLong'},
  bow:{Light:'Draw',Heavy:'Release'},
  wings:{Light:'Lift',Heavy:'Dive'}
 };
 const aliases=byWeapon[weapon];
 if(!aliases) return base;
 const variants=[
  {name:aliases.Light,action:'Thrust',power:'Light'},
  {name:aliases.Heavy,action:'Thrust',power:'Heavy'}
 ];
 const special={
  scissors:[{name:aliases.Light,action:'Split',power:'Light'},{name:aliases.Heavy,action:'Split',power:'Heavy'}],
  axe:[{name:aliases.Light,action:'Bash',power:'Light'},{name:aliases.Heavy,action:'Bash',power:'Heavy'}],
  claws:[{name:'Slash',action:'Split',power:'Light'},{name:'Rake',action:'Split',power:'Heavy'}],
  thread:[{name:'CastLean',action:'Thrust',power:'Light'},{name:'CastLong',action:'Thrust',power:'Heavy'}],
  bow:[{name:'Draw',action:'Thrust',power:'Light'},{name:'Release',action:'Thrust',power:'Heavy'}],
  wings:[{name:'Lift',action:'Thrust',power:'Light'},{name:'Dive',action:'Thrust',power:'Heavy'}]
 };
 const selected=special[weapon]||variants;
 const extra=selected.map(s=>createClip(mapWeaponPose(weapon,s.action,s.power),s.name,idle));
 return [...base,...extra];
}
