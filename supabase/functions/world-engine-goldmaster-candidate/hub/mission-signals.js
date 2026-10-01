import {advanceHubMission} from './mission-runtime.js';
import {hasHubMissionActionPlan} from './mission-actions.js';
import {HUB_SECRET_STEP_COUNTS} from './activity-catalog.js';

export const HUB_MISSION_SIGNAL_RULES={
 first_steps:[
  {type:'building',id:'heritage_welcome'},
  {type:'transport',id:'train'},
  {type:'district',id:'heritage_square'},
 ],
 boat_without_flag:[
  {type:'transport',id:'boat'},
  {type:'secret',id:'secret_abandoned_quay'},
 ],
 wagon_eight:[
  {type:'transport',id:'train'},
  {type:'npc',id:'the_conductor'},
  {type:'building',id:'train_station'},
 ],
 three_reflections:[
  {type:'secretStep',id:'secret_rain_symbol',step:2},
  {type:'secret',id:'secret_rain_symbol'},
 ],
 broken_record:[
  {type:'secretStep',id:'secret_archive_reverse',step:3},
  {type:'secret',id:'secret_archive_reverse'},
 ],
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id)||hasHubMissionActionPlan(id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
 if(rule.step!==undefined&&rule.step!==signal.step)return false;
 if(rule.from!==undefined&&rule.from!==signal.from)return false;
 if(rule.to!==undefined&&rule.to!==signal.to)return false;
 return true;
}

function signalCheckpoint(signal){
 const id=signal?.id??'';
 const route=signal?.from||signal?.to?`:${signal.from??''}>${signal.to??''}`:'';
 const step=signal?.step!==undefined?`:${signal.step}`:'';
 return `signal:${signal?.type??'unknown'}:${id}${route}${step}`.slice(0,80);
}

function hasPermanentEvidence(rule,hub){
 if(!hub||!rule)return false;
 if(rule.type==='secret')return hub.secrets?.includes(rule.id)===true;
 if(rule.type==='secretStep'){
  if(hub.secrets?.includes(rule.id))return true;
  const count=HUB_SECRET_STEP_COUNTS[rule.id],steps=new Set(hub.stats?.secretProgress?.[rule.id]||[]);
  return Boolean(count)&&Array.from({length:count},(_,step)=>step).every(step=>steps.has(step));
 }
 return false;
}

// Secrets and their clues are one-shot discoveries. A mission accepted later must
// acknowledge that evidence, while repeatable travel and visits stay sequential.
export function reconcileHubMissionEvidence(missions,hub){
 let next=missions;
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  while(next[id]?.status==='active'){
   const rule=rules[next[id].completedObjectives];
   if(!hasPermanentEvidence(rule,hub))break;
   next=advanceHubMission(next,id,1,{checkpoint:`evidence:${rule.type}:${rule.id}`});
  }
 }
 return next;
}

export function applyHubMissionSignal(missions,signal,hub=null){
 let next=missions,advanced=[];
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  const current=next[id];if(current?.status!=='active')continue;
  const rule=rules[current.completedObjectives];
  const matchesCurrent=rule?.type==='secretStep'&&hub
   ?signal?.type==='secretStep'&&signal.id===rule.id&&hasPermanentEvidence(rule,hub)
   :matches(rule,signal);
  if(!matchesCurrent)continue;
  const checkpoint=signalCheckpoint(signal);
  if(current.checkpoint===checkpoint)continue;
  next=advanceHubMission(next,id,1,{checkpoint});advanced.push(id);
 }
 const reconciled=reconcileHubMissionEvidence(next,hub);
 for(const id of Object.keys(HUB_MISSION_SIGNAL_RULES))if(reconciled[id]!==next[id]&&!advanced.includes(id))advanced.push(id);
 return {missions:reconciled,advanced};
}
