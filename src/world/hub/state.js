import {HUB_MISSIONS,HUB_MISSION_BY_ID} from './mission-catalog.js';
import {HUB_EVENT_SET,HUB_SECRET_SET,HUB_DISTRICT_SET,HUB_NPC_SET,HUB_TRANSPORT_TYPES,HUB_SECRET_STEP_COUNTS} from './activity-catalog.js';

export function blankHubState(){
  return {
    missions:Object.fromEntries(HUB_MISSIONS.map(({id,objectiveCount})=>[id,{status:'available',completedObjectives:0,totalObjectives:objectiveCount,claimed:false}])),
    secrets:[],
    events:[],
    stats:{
      npcTalks:{},
      districtVisits:[],
      transportRides:Object.fromEntries(HUB_TRANSPORT_TYPES.map((type)=>[type,0])),
      transportStops:[],
      nightTrainDates:[],
      secretProgress:{},
    },
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
  const stats=source.stats&&typeof source.stats==='object'?source.stats:{};
  for(const [id,count] of Object.entries(stats.npcTalks||{}))if(HUB_NPC_SET.has(id))base.stats.npcTalks[id]=Math.max(0,Math.min(99,Math.floor(Number(count)||0)));
  base.stats.districtVisits=[...new Set(Array.isArray(stats.districtVisits)?stats.districtVisits:[])].filter((id)=>HUB_DISTRICT_SET.has(id));
  for(const type of HUB_TRANSPORT_TYPES)base.stats.transportRides[type]=Math.max(0,Math.min(999,Math.floor(Number(stats.transportRides?.[type])||0)));
  base.stats.transportStops=[...new Set(Array.isArray(stats.transportStops)?stats.transportStops:[])].filter((id)=>typeof id==='string'&&/^(train|boat|telepheric|zipline):[A-Za-z0-9_]+$/.test(id)).slice(0,96);
  base.stats.nightTrainDates=[...new Set(Array.isArray(stats.nightTrainDates)?stats.nightTrainDates:[])].filter((value)=>/^\d{4}-\d{2}-\d{2}$/.test(value)).slice(-16);
  for(const [id,count] of Object.entries(HUB_SECRET_STEP_COUNTS)){
   const steps=[...new Set(Array.isArray(stats.secretProgress?.[id])?stats.secretProgress[id]:[])].filter((step)=>Number.isInteger(step)&&step>=0&&step<count).slice(0,count);
   if(steps.length)base.stats.secretProgress[id]=steps;
  }
  return base;
}
