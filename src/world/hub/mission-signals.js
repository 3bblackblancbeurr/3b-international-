import {advanceHubMission} from './mission-runtime.js';

export const HUB_MISSION_SIGNAL_RULES={
 first_steps:[
  null,
  {type:'transport',id:'train'},
  {type:'district',id:'heritage_square'},
 ],
 boat_without_flag:[
  {type:'transport',id:'boat',night:true},
  {type:'district',id:'docks'},
 ],
 storm_rescue:[
  {type:'transport',id:'boat'},
  null,
  {type:'district',id:'docks'},
 ],
 silent_cable:[
  null,
  null,
  {type:'transport',id:'telepheric'},
 ],
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
 if(rule.night!==undefined&&rule.night!==signal.night)return false;
 if(rule.from!==undefined&&rule.from!==signal.from)return false;
 if(rule.to!==undefined&&rule.to!==signal.to)return false;
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
