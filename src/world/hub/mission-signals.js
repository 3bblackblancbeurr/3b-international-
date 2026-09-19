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
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
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
