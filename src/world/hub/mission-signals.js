import {advanceHubMission} from './mission-runtime.js';
import {hasHubMissionActionPlan} from './mission-actions.js';

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
 first_foundation:[
  {type:'city',id:'founded'},
  {type:'city',id:'synced'},
  {type:'city',id:'built'},
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

export function applyHubMissionSignal(missions,signal){
 let next=missions,advanced=[];
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  const current=next[id];if(current?.status!=='active')continue;
  const rule=rules[current.completedObjectives];if(!matches(rule,signal))continue;
  const checkpoint=signalCheckpoint(signal);
  if(current.checkpoint===checkpoint)continue;
  next=advanceHubMission(next,id,1,{checkpoint});advanced.push(id);
 }
 return {missions:next,advanced};
}
