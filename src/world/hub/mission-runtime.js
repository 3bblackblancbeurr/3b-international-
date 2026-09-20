export const MISSION_PHASES=Object.freeze([
  'LOCKED','AVAILABLE','ACTIVE','OBJECTIVE_1','OBJECTIVE_2','OBJECTIVE_3','SUCCESS','FAILED','REWARD','COMPLETED',
]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const totalFor=mission=>Math.max(0,Number(mission?.objectives?.length??mission?.objectiveCount??mission?.totalObjectives??0)||0);
const objectivePhase=(completed,total)=>completed<=0?'ACTIVE':`OBJECTIVE_${Math.min(Math.max(1,completed+1),Math.max(1,total),3)}`;

export function normalizeHubMissionRow(mission,saved={},locked=false){
  const totalObjectives=totalFor(mission)||Math.max(0,Number(saved.totalObjectives)||0);
  const completedObjectives=clamp(Math.floor(Number(saved.completedObjectives)||0),0,totalObjectives);
  const claimed=Boolean(saved.claimed);
  const completed=saved.status==='completed'||completedObjectives>=totalObjectives&&totalObjectives>0;
  const active=!completed&&saved.status==='active';
  const status=completed?'completed':active?'active':'available';
  let phase;
  if(claimed)phase='COMPLETED';
  else if(completed)phase=saved.phase==='SUCCESS'?'SUCCESS':'REWARD';
  else if(active&&saved.phase==='FAILED')phase='FAILED';
  else if(active)phase=objectivePhase(completedObjectives,totalObjectives);
  else phase=locked?'LOCKED':'AVAILABLE';
  return {
    status,
    phase,
    completedObjectives,
    totalObjectives,
    claimed:completed&&claimed,
    checkpoint:typeof saved.checkpoint==='string'?saved.checkpoint.slice(0,80):null,
    branch:typeof saved.branch==='string'?saved.branch.slice(0,48):null,
    consequences:Array.isArray(saved.consequences)?[...new Set(saved.consequences.filter(v=>typeof v==='string').map(v=>v.slice(0,64)))].slice(0,16):[],
    failedAttempts:clamp(Math.floor(Number(saved.failedAttempts)||0),0,99),
  };
}

export function createHubMissionState(missions,persisted={}){
  return Object.fromEntries(missions.map(mission=>[mission.id,normalizeHubMissionRow(mission,persisted[mission.id]||{})]));
}

export function startHubMission(state,missionId){
  const current=state[missionId];
  if(!current||current.status==='completed')return state;
  return {...state,[missionId]:{...current,status:'active',phase:'ACTIVE',checkpoint:current.checkpoint||'start'}};
}

export function advanceHubMission(state,missionId,amount=1,{checkpoint=null,branch=null,consequence=null}={}){
  const current=state[missionId];
  if(!current||current.status!=='active')return state;
  const completedObjectives=Math.min(current.totalObjectives,current.completedObjectives+Math.max(0,Math.floor(amount)));
  const done=completedObjectives>=current.totalObjectives&&current.totalObjectives>0;
  const consequences=consequence?[...new Set([...(current.consequences||[]),String(consequence).slice(0,64)])].slice(0,16):(current.consequences||[]);
  return {...state,[missionId]:{
    ...current,
    completedObjectives,
    status:done?'completed':'active',
    phase:done?'SUCCESS':objectivePhase(completedObjectives,current.totalObjectives),
    checkpoint:checkpoint?String(checkpoint).slice(0,80):`objective:${completedObjectives}`,
    branch:branch?String(branch).slice(0,48):current.branch,
    consequences,
  }};
}

export function failHubMission(state,missionId,{checkpoint=null}={}){
  const current=state[missionId];
  if(!current||current.status!=='active')return state;
  return {...state,[missionId]:{
    ...current,
    phase:'FAILED',
    checkpoint:checkpoint?String(checkpoint).slice(0,80):current.checkpoint,
    failedAttempts:Math.min(99,(current.failedAttempts||0)+1),
  }};
}

export function resumeHubMission(state,missionId){
  const current=state[missionId];
  if(!current||current.status!=='active'||current.phase!=='FAILED')return state;
  return {...state,[missionId]:{...current,phase:objectivePhase(current.completedObjectives,current.totalObjectives)}};
}

export function claimHubMission(state,missionId){
  const current=state[missionId];
  if(!current||current.status!=='completed'||current.claimed)return state;
  return {...state,[missionId]:{...current,claimed:true,phase:'COMPLETED',checkpoint:'reward:claimed'}};
}

export function hubMissionPhase(row,{locked=false}={}){
  if(!row)return locked?'LOCKED':'AVAILABLE';
  if(row.claimed)return 'COMPLETED';
  if(row.status==='completed')return row.phase==='SUCCESS'?'SUCCESS':'REWARD';
  if(row.status==='active'&&row.phase==='FAILED')return 'FAILED';
  if(row.status==='active')return objectivePhase(row.completedObjectives,row.totalObjectives);
  return locked?'LOCKED':'AVAILABLE';
}

export function hubMissionProgress(state){
  const rows=Object.values(state);
  const completed=rows.filter(row=>row.status==='completed').length;
  const claimed=rows.filter(row=>row.claimed).length;
  return {total:rows.length,completed,claimed,ratio:rows.length?completed/rows.length:0};
}
