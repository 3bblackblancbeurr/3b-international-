import missions from './data/missions-v1.json' with {type:'json'};
import {HUB_MISSION_GRAPH,hubMissionPrerequisitesMet,hubMissionLockReason} from './mission-graph.js';

const byId=Object.fromEntries(missions.map(m=>[m.id,m]));

export function hubMissionJournal(save){
 const state=save?.hub?.missions||{};
 return missions.map(mission=>{
  const row=state[mission.id]||{status:'available',completedObjectives:0,totalObjectives:mission.objectives.length,claimed:false};
  const locked=!hubMissionPrerequisitesMet(mission.id,state);
  return {
   ...mission,
   status:row.status,
   completedObjectives:row.completedObjectives,
   totalObjectives:row.totalObjectives,
   claimed:row.claimed,
   locked,
   missingPrerequisites:(hubMissionLockReason(mission.id,state)||[]).map(id=>byId[id]?.title||id),
   optional:(HUB_MISSION_GRAPH[mission.id]?.optional||[]),
   next:(HUB_MISSION_GRAPH[mission.id]?.next||[]).map(id=>byId[id]?.title||id),
  };
 });
}
export function hubMissionSummary(save){
 const rows=hubMissionJournal(save);
 return {
  total:rows.length,
  completed:rows.filter(r=>r.status==='completed').length,
  claimed:rows.filter(r=>r.claimed).length,
  active:rows.filter(r=>r.status==='active').length,
  unlocked:rows.filter(r=>!r.locked).length,
 };
}
