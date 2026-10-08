export const PLAY_ACTIONS=Object.freeze({
 jump:{label:'Sauter',duration:.72,cooldown:.82,key:' '},
 strike:{label:'Frapper',duration:.42,cooldown:.48,key:'j'},
 guard:{label:'Défendre',duration:.65,cooldown:.7,key:'k'},
 dodge:{label:'Esquiver',duration:.3,cooldown:.72,key:'x'},
 power:{label:'Pouvoir',duration:.7,cooldown:1.8,key:'l'},
});

export function battleAnimation(action,airborne=false){
 if(airborne)return null;
 return action==='enemy'?'Hit':action==='guard'?'Guard':['dodge','wait','miss'].includes(action)?'Idle':['power','support','trap'].includes(action)?'Cast':'Attack';
}

// Local movement and presentation only. Damage and rewards remain in the engine.
export function createGameplayMotion(){
 let clock=0,jumpUntil=0,action=null,actionUntil=0,heading=0;
 const cooldowns={};
 return {
  get airborne(){return clock<jumpUntil;},
  start(kind,direction=0){
   const rule=PLAY_ACTIONS[kind];if(!rule||clock<(cooldowns[kind]||0))return false;
   // Voluntary upper-body actions have their own animation mask and cooldown.
   // The jump clock still owns the pelvis/legs; a ground dodge cannot move it.
   if(kind==='dodge'&&clock<jumpUntil)return false;
   if(kind!=='jump'&&clock<actionUntil&&action!=='guard')return false;
   if(kind==='jump'&&clock<jumpUntil)return false;
   cooldowns[kind]=clock+rule.cooldown;
   if(kind==='jump'){jumpUntil=clock+rule.duration;action=null;actionUntil=0;}
   else{action=kind;actionUntil=clock+rule.duration;heading=direction;}
   return true;
  },
  update(seconds=0){
   const dt=Math.max(0,Math.min(Number.isFinite(seconds)?seconds:0,.25));clock+=dt;
   const airborne=clock<jumpUntil,progress=airborne?1-(jumpUntil-clock)/PLAY_ACTIONS.jump.duration:1;
   const active=clock<actionUntil?action:null,landed=jumpUntil>0&&!airborne;
   if(landed)jumpUntil=0;
   return {lift:airborne?Math.sin(Math.PI*progress)*2.25:0,airborne,landed,action:active,guard:active==='guard'?1:0,dodge:active==='dodge'?{x:Math.sin(heading),z:-Math.cos(heading),speed:22}:null};
  },
  reset(){clock=0;jumpUntil=actionUntil=0;action=null;for(const key of Object.keys(cooldowns))delete cooldowns[key];},
 };
}
