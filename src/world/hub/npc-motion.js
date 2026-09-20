function hash(input){
  let value=0;
  for(let i=0;i<input.length;i+=1)value=(Math.imul(value,31)+input.charCodeAt(i))>>>0;
  return value;
}

const clamp01=value=>Math.max(0,Math.min(1,value));

export const NPC_SIMULATION_STATES=Object.freeze([
  'Idle','Walk','Work','Talk','Observe','React','Flee','Investigate','Help','Follow','Combat','ReturnToRoutine',
]);

export function npcSimulationTier(distance=Infinity){
  const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
  if(d<=24)return {tier:'full',updateHz:10};
  if(d<=70)return {tier:'simplified',updateHz:3};
  return {tier:'abstract',updateHz:.25};
}

export function hubNpcNeeds(item,timeSeconds=0,{weather='clear'}={}){
  const seed=hash(item.npcId||item.id||'npc');
  const cycle=(timeSeconds+(seed%900))/900;
  const wave=offset=>Math.sin((cycle+offset)*Math.PI*2)*.5+.5;
  const resting=item.activity==='repos';
  const working=item.activity==='travail'||item.activity==='préparation';
  const social=item.activity==='rencontre publique';
  return {
    rest:clamp01((resting?.2:working?.72:.48)+wave(.13)*.18),
    food:clamp01(.28+wave(.42)*.6),
    social:clamp01((social?.16:.52)+wave(.71)*.28),
    safety:clamp01((weather==='heavy_rain'||weather==='storm') ? .82 : .18),
    purpose:clamp01((working?.2:.48)+wave(.04)*.26),
  };
}

export function hubNpcSimulation(item,timeSeconds=0,context={}){
  const seed=hash(item.npcId||item.id||'npc');
  const distance=Number.isFinite(context.distance)?context.distance:Infinity;
  const {tier,updateHz}=npcSimulationTier(distance);
  const needs=hubNpcNeeds(item,timeSeconds,context);
  const phase=(seed%628)/100;
  const baseX=item.homeX??item.x??0,baseZ=item.homeZ??item.z??0;

  let state='Walk';
  if(context.threat===true)state=distance<18?'Flee':'Investigate';
  else if(context.helpRequested===true&&distance<26)state='Help';
  else if(context.inConversation===true)state='Talk';
  else if(context.playerVisible===true&&distance<9)state='Observe';
  else if(item.activity==='repos')state='Idle';
  else if(item.activity==='travail'||item.activity==='préparation')state='Work';
  else if(item.activity==='rencontre publique'||item.activity==='pause de midi')state='Talk';
  else if(item.activity==='abri météo')state='Idle';
  else if(item.activity==='promenade')state='Walk';

  if(context.returnToRoutine===true)state='ReturnToRoutine';
  const moving=['Walk','ReturnToRoutine','Investigate','Help','Flee'].includes(state);
  if(tier==='abstract')return {x:baseX,z:baseZ,heading:phase,state,needs,tier,updateHz,moving:false};

  const tierScale=tier==='full'?1:.62;
  if(!moving){
    // Work, Talk, Observe and Idle should read as intentional activities, not people
    // orbiting their home point. Keep only a few centimetres of root drift.
    const stanceRadius=(state==='Work'?.12:state==='Talk'?.09:state==='Observe'?.055:.035)*tierScale;
    const stanceSpeed=.08+((seed>>>16)%7)/100;
    const sway=timeSeconds*stanceSpeed+phase;
    const x=baseX+Math.cos(sway*1.13)*stanceRadius;
    const z=baseZ+Math.sin(sway*.87)*stanceRadius;
    const heading=phase+Math.sin(timeSeconds*.16+phase)*.22;
    return {x,z,heading,state,needs,tier,updateHz,moving:false};
  }

  // A pair of incommensurate harmonics produces a compact, deterministic
  // pedestrian loop without the obvious circular "NPC orbit" pattern.
  const urgency=state==='Flee'?1.55:state==='Help'?1.18:state==='Investigate'?.92:1;
  const radius=(1.65+((seed>>>8)%125)/100)*tierScale*urgency;
  const speed=(.11+((seed>>>16)%15)/1000)*urgency;
  const t=timeSeconds*speed+phase;
  const skew=.72+((seed>>>24)%20)/100;
  const x=baseX+(Math.cos(t)*.78+Math.cos(t*.47+phase*1.7)*.31)*radius;
  const z=baseZ+(Math.sin(t)*skew+Math.sin(t*.63-phase*.8)*.24)*radius;
  const eps=.025;
  const t2=t+eps;
  const x2=baseX+(Math.cos(t2)*.78+Math.cos(t2*.47+phase*1.7)*.31)*radius;
  const z2=baseZ+(Math.sin(t2)*skew+Math.sin(t2*.63-phase*.8)*.24)*radius;
  const heading=Math.atan2(x2-x,z2-z);
  return {x,z,heading,state,needs,tier,updateHz,moving:true};
}

export function hubNpcPose(item,timeSeconds,context={}){
  const simulation=hubNpcSimulation(item,timeSeconds,context);
  return {x:simulation.x,z:simulation.z,heading:simulation.heading,state:simulation.state,needs:simulation.needs,tier:simulation.tier,updateHz:simulation.updateHz,moving:simulation.moving};
}
