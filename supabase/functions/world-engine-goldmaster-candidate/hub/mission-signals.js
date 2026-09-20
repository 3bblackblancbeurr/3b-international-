import {advanceHubMission} from './mission-runtime.js';

export const HUB_MISSION_SIGNAL_RULES={
 first_steps:[
  {type:'district',id:'heritage_square'},
  {type:'transport',id:'train'},
  {type:'district',id:'heritage_square'},
 ],
 boat_without_flag:[
  {type:'transport',id:'boat'},
  {type:'district',id:'docks'},
 ],
 rooftops_circle:[
  {type:'transport',id:'zipline'},
  {type:'transport',id:'zipline'},
  {type:'district',id:'arena'},
 ],
 storm_rescue:[
  {type:'npc',id:'youssef_ben_salem'},
  {type:'transport',id:'boat'},
  {type:'transport',id:'boat'},
 ],
 voices_square:[
  {type:'npc',id:'amira_mansouri'},
  {type:'npc',id:'lucia_navaro'},
  {type:'npc',id:'soraya_najem'},
 ],
 blue_blackout:[
  {type:'district',id:'innovation'},
  {type:'event',id:'power_flicker'},
 ],
 silent_cable:[
  {type:'transport',id:'telepheric'},
  {type:'district',id:'innovation'},
  {type:'transport',id:'telepheric'},
 ],
 passion_trial:[
  {type:'district',id:'arena'},
  {type:'district',id:'arena'},
 ],
 broken_record:[
  {type:'secretStep',id:'secret_archive_reverse',step:3},
  {type:'secret',id:'secret_archive_reverse'},
 ],
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
 if(rule.step!==undefined&&rule.step!==signal.step)return false;
 return true;
}

export function applyHubMissionSignal(missions,signal){
 let next=missions,advanced=[];
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  const current=next[id];if(current?.status!=='active')continue;
  const rule=rules[current.completedObjectives];if(!matches(rule,signal))continue;
  next=advanceHubMission(next,id,1);advanced.push(id);
 }
 return {missions:next,advanced};
}
