export const HUB_PROGRESS_VERSION=1;

export const HUB_MISSION_IDS=Object.freeze([
  'first_steps','first_echo','eight_signals','rooftops_circle','boat_without_flag','storm_rescue','memory_under_water','wagon_eight','blue_blackout','garden_listens','first_foundation','voices_square','passion_trial','silent_cable','three_reflections','eight_seeds','golden_pattern','living_fabric','lost_wolf_signal','broken_record'
]);

export const PLAYABLE_MISSION_EVENTS=Object.freeze({
  first_steps:[
    {type:'visit',id:'heritage_welcome'},
    {type:'ride_train'},
    {type:'arrive',id:'heritage_square'}
  ],
  first_echo:[
    {type:'inspect',id:'archive_signal'},
    {type:'restore',id:'archive_memory'},
    {type:'activate',id:'archive_beacon'}
  ],
  rooftops_circle:[
    {type:'reach',id:'broken_circle_tower'},
    {type:'ride_zipline'},
    {type:'ride_zipline'}
  ],
  boat_without_flag:[
    {type:'ride_boat'},
    {type:'visit',id:'central_marina'}
  ]
});

export function blankHubProgress(){
  return {version:HUB_PROGRESS_VERSION,active:null,completed:[],missions:{},rides:{train:0,boat:0,zipline:0},visited:[],xp:0,coins:0,rewards:[]};
}

export function normalizeHubProgress(raw,missions=[]){
  const next=blankHubProgress(),known=new Set((missions.length?missions:HUB_MISSION_IDS.map(id=>({id}))).map(m=>m.id));
  if(!raw||typeof raw!=='object')return next;
  next.completed=[...new Set(Array.isArray(raw.completed)?raw.completed:[])].filter(id=>known.has(id));
  next.active=known.has(raw.active)&&!next.completed.includes(raw.active)?raw.active:null;
  for(const id of known){
    const value=raw.missions?.[id];
    if(value&&typeof value==='object')next.missions[id]={step:Math.max(0,Math.floor(Number(value.step)||0)),startedAt:Number(value.startedAt)||0,updatedAt:Number(value.updatedAt)||0};
  }
  next.rides={train:Math.max(0,Math.floor(Number(raw.rides?.train)||0)),boat:Math.max(0,Math.floor(Number(raw.rides?.boat)||0)),zipline:Math.max(0,Math.floor(Number(raw.rides?.zipline)||0))};
  next.visited=[...new Set(Array.isArray(raw.visited)?raw.visited.filter(x=>typeof x==='string').slice(0,100):[])];
  next.xp=Math.max(0,Math.floor(Number(raw.xp)||0));next.coins=Math.max(0,Math.floor(Number(raw.coins)||0));next.rewards=[...new Set(Array.isArray(raw.rewards)?raw.rewards.filter(x=>typeof x==='string').slice(0,100):[])];
  return next;
}

export function startHubMission(progress,id,missions=[]){
  const mission=missions.find(m=>m.id===id);if(!mission||progress.completed.includes(id))return {progress,changed:false,mission};
  const next=structuredClone(progress);next.active=id;next.missions[id]??={step:0,startedAt:Date.now(),updatedAt:Date.now()};return {progress:next,changed:true,mission};
}

function matches(expected,event){
  if(!expected||!event||expected.type!==event.type)return false;
  return expected.id===undefined||expected.id===event.id;
}

export function applyHubEvent(progress,event,missions=[]){
  let next=structuredClone(progress),changed=false,completedMission=null;
  if(event.type==='ride_train'){next.rides.train++;changed=true;}
  if(event.type==='ride_boat'){next.rides.boat++;changed=true;}
  if(event.type==='ride_zipline'){next.rides.zipline++;changed=true;}
  if(event.type==='visit'||event.type==='arrive'||event.type==='reach'){if(event.id&&!next.visited.includes(event.id)){next.visited.push(event.id);changed=true;}}
  const active=next.active,sequence=PLAYABLE_MISSION_EVENTS[active];
  if(active&&sequence){
    const state=next.missions[active]??={step:0,startedAt:Date.now(),updatedAt:Date.now()};
    if(matches(sequence[state.step],event)){
      state.step++;state.updatedAt=Date.now();next.missions[active]=state;changed=true;
      if(state.step>=sequence.length){next.completed=[...new Set([...next.completed,active])];next.active=null;completedMission=missions.find(m=>m.id===active)||{id:active};const rewardXp=completedMission.importance==='major'?120:completedMission.importance==='normal'?75:45;next.xp+=rewardXp;if((completedMission.rewards||[]).includes('coins'))next.coins+=60;next.rewards=[...new Set([...next.rewards,...(completedMission.rewards||[])])];}
    }
  }
  return {progress:next,changed,completedMission};
}

export function activeHubMission(progress,missions=[]){
  const mission=missions.find(m=>m.id===progress?.active);if(!mission)return null;
  const step=progress.missions?.[mission.id]?.step||0;
  return {...mission,step,currentObjective:mission.objectives?.[step]||null,total:mission.objectives?.length||0};
}

export function missionForNpc(npc,progress,missions=[]){
  if(!npc?.missionIds?.length)return null;
  return npc.missionIds.map(id=>missions.find(m=>m.id===id)).find(m=>m&&!progress.completed.includes(m.id))||null;
}
