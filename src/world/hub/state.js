import {HUB_MISSIONS,HUB_MISSION_BY_ID} from './mission-catalog.js';
import {HUB_EVENT_SET,HUB_SECRET_SET} from './activity-catalog.js';

export function blankHubState(){
  return {
    missions:Object.fromEntries(HUB_MISSIONS.map(({id,objectiveCount})=>[id,{status:'available',completedObjectives:0,totalObjectives:objectiveCount,claimed:false}])),
    secrets:[],
    events:[],
  };
}

export function normalizeHubState(input){
  const base=blankHubState(),source=input&&typeof input==='object'?input:{};
  for(const [id,current] of Object.entries(base.missions)){
    const raw=source.missions?.[id];
    if(!raw||!HUB_MISSION_BY_ID[id])continue;
    const completedObjectives=Math.max(0,Math.min(current.totalObjectives,Math.floor(Number(raw.completedObjectives)||0)));
    const completed=raw.status==='completed'||completedObjectives>=current.totalObjectives;
    base.missions[id]={
      ...current,
      completedObjectives,
      status:completed?'completed':raw.status==='active'?'active':'available',
      claimed:completed&&raw.claimed===true,
    };
  }
  base.secrets=[...new Set(Array.isArray(source.secrets)?source.secrets:[])].filter((id)=>HUB_SECRET_SET.has(id));
  base.events=[...new Set(Array.isArray(source.events)?source.events:[])].filter((id)=>HUB_EVENT_SET.has(id));
  return base;
}
