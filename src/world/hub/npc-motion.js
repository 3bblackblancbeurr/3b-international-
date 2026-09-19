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
    safety:clamp01(weather==='heavy_rain'||weather==='storm'?.82:.18),
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
  else if(item.activity==='rencontre publique')state='Talk';

  if(context.returnToRoutine===true)state='ReturnToRoutine';
  if(tier==='abstract')return {x:baseX,z:baseZ,heading:phase,state,needs,tier,updateHz};

  const tierScale=tier==='full'?1:.55;
  const activityRadius=state==='Work'?.9:state==='Talk'?1.25:state==='Idle'?.18:2.2;
  const radius=(activityRadius+((seed>>>8)%120)/100)*tierScale;
  const speed=(state==='Idle'?.025:state==='Work'?.07:state==='Talk'?.045:.14)+((seed>>>16)%12)/1000;
  const angle=phase+timeSeconds*speed;
  const pausePulse=Math.sin(timeSeconds*.37+phase);
  const walking=state==='Walk'||state==='ReturnToRoutine'||state==='Investigate'||state==='Help'||state==='Flee';
  const movementScale=walking?1:Math.max(.18,.45+pausePulse*.15);
  const x=baseX+Math.cos(angle)*radius*movementScale;
  const z=baseZ+Math.sin(angle)*radius*movementScale;
  return {x,z,heading:angle+Math.PI/2,state,needs,tier,updateHz};
}

export function hubNpcPose(item,timeSeconds,context={}){
  const simulation=hubNpcSimulation(item,timeSeconds,context);
  return {x:simulation.x,z:simulation.z,heading:simulation.heading,state:simulation.state,needs:simulation.needs,tier:simulation.tier,updateHz:simulation.updateHz};
}
