import {advanceHubMission} from './mission-runtime.js';

export const HUB_MISSION_SIGNAL_RULES={
 first_steps:[
  null,
  {type:'transport',id:'train'},
  {type:'district',id:'heritage_square'},
 ],
 boat_without_flag:[
  {type:'transport',id:'boat',from:'docks',night:true},
  {type:'district',id:'docks'},
 ],
 storm_rescue:[
  {type:'transport',id:'boat',from:'docks'},
  null,
  {type:'district',id:'docks'},
 ],
 silent_cable:[
  null,
  null,
  {type:'transport',id:'telepheric'},
 ],
 rooftops_circle:[
  null,
  {type:'transport',id:'zipline',count:2,uniqueBy:'route'},
  null,
 ],
 wagon_eight:[
  {type:'transport',id:'train',night:true},
  null,
  null,
 ],
 voices_square:[
  {type:'npc',ids:['amira_mansouri','lucia_navaro','soraya_najem'],count:3,uniqueBy:'id'},
  null,
  null,
 ],
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
 if(rule.ids&&!rule.ids.includes(signal.id))return false;
 if(rule.night!==undefined&&rule.night!==signal.night)return false;
 if(rule.from!==undefined&&rule.from!==signal.from)return false;
 if(rule.to!==undefined&&rule.to!==signal.to)return false;
 return true;
}

function tokenFor(rule,signal){
 if(rule.uniqueBy==='id')return String(signal.id??'');
 if(rule.uniqueBy==='route')return String(signal.route??'');
 return [signal.type,signal.id,signal.from,signal.to].filter(Boolean).join(':');
}

export function applyHubMissionSignal(missions,signalProgress={},signal){
 let next=missions,progress=signalProgress,advanced=[];
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  const current=next[id];if(current?.status!=='active')continue;
  const objective=current.completedObjectives,rule=rules[objective];if(!matches(rule,signal))continue;
  const count=Math.max(1,Math.floor(rule.count||1));
  if(count===1){next=advanceHubMission(next,id,1);advanced.push(id);continue;}
  const token=tokenFor(rule,signal);if(!token)continue;
  const missionProgress=progress[id]||{},key=String(objective),seen=Array.isArray(missionProgress[key])?missionProgress[key]:[];
  if(seen.includes(token))continue;
  const updated=[...seen,token].slice(0,count),nextMissionProgress={...missionProgress,[key]:updated};
  progress={...progress,[id]:nextMissionProgress};
  if(updated.length>=count){next=advanceHubMission(next,id,1);advanced.push(id);}
 }
 return {missions:next,progress,advanced};
}
