import {activeHubEvents} from './event-runtime.js';
import {hubSecretReady,HUB_SECRET_ORDER} from './secret-runtime.js';
import {HUB_SECRET_STEP_COUNTS} from './activity-catalog.js';
import {HUB_MISSION_TASKS} from './mission-tasks.js';

const DEFAULT_SCALE = 74;

export function hubDistrictPosition(plan, districtId, scale = DEFAULT_SCALE) {
  const district = plan.districts.find((entry) => entry.id === districtId);
  if (!district) return null;
  const [u, v] = district.center;
  return { x: (u - 0.5) * scale * 2, z: (v - 0.5) * scale * 2 };
}

function hash(input) {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function offset(id, radius = 6) {
  const h = hash(id);
  const angle = ((h % 360) / 180) * Math.PI;
  const distance = 2 + ((h >>> 8) % 1000) / 1000 * radius;
  return { x: Math.cos(angle) * distance, z: Math.sin(angle) * distance };
}

export function selectNpcBudget(plan, profile = 'mobileMedium') {
  const budget = plan.performance?.[profile] || plan.performance?.mobileMedium;
  return Math.max(1, budget?.activeNpcNear?.[1] || 18);
}

export function buildHubRuntimeItems({
  plan,
  npcs = [],
  missions = [],
  events = [],
  secrets = [],
  profile = 'mobileMedium',
  eventContext = {},
  hubState = null,
}) {
  const districtItems = plan.districts.map((district) => ({
    id: `hub:district:${district.id}`,
    type: 'hubDistrict',
    district: district.id,
    name: district.name,
    purpose: district.purpose,
    ...hubDistrictPosition(plan, district.id),
  }));

  const maxNpcs = selectNpcBudget(plan, profile);
  const npcItems = npcs.slice(0, maxNpcs).map((npc) => {
    const center = hubDistrictPosition(plan, npc.district);
    const d = offset(npc.id, 8);
    return {
      id: `hub:npc:${npc.id}`,
      type: 'hubNpc',
      npcId: npc.id,
      district: npc.district,
      name: npc.name,
      role: npc.role,
      rarity: npc.rarity,
      missionIds: npc.missionIds || [],
      x: center.x + d.x,
      z: center.z + d.z,
    };
  });

  const missionItems = missions.map((mission) => {
    const center = hubDistrictPosition(plan, mission.district);
    const d = offset(`mission:${mission.id}`, 11);
    return {
      id: `hub:mission:${mission.id}`,
      type: 'hubMission',
      missionId: mission.id,
      district: mission.district,
      name: mission.title,
      category: mission.category,
      importance: mission.importance,
      giver: mission.giver,
      objectives: mission.objectives || [],
      rewards: mission.rewards || [],
      x: center.x + d.x,
      z: center.z + d.z,
    };
  });

  const missionTaskItems=Object.entries(HUB_MISSION_TASKS).flatMap(([missionId,tasks])=>{
    const state=hubState?.missions?.[missionId];if(state?.status!=='active')return[];
    const mission=missions.find((entry)=>entry.id===missionId);if(!mission)return[];
    const done=hubState?.stats?.missionTasks?.[missionId]||[],center=hubDistrictPosition(plan,mission.district);
    return tasks.filter((task)=>task.objective===state.completedObjectives&&!done.includes(task.id)&&(task.weather?task.weather===eventContext.weather:true)).map((task,index)=>{
      const d=offset(`mission-task:${missionId}:${task.id}`,5+index*1.15);
      return {id:`hub:mission-task:${missionId}:${task.id}`,type:'hubMissionTask',missionId,taskId:task.id,district:mission.district,name:task.label,objective:task.objective,evidence:{weather:eventContext.weather,night:eventContext.hour>=20||eventContext.hour<6},range:3.2,x:center.x+d.x,z:center.z+d.z};
    });
  });

  const stationItems = (plan.transport?.train?.stations || []).map((district, index) => ({
    id: `hub:train:${district}`,
    type: 'hubTransport',
    transport: 'train',
    line: plan.transport.train.name,
    stopIndex: index,
    district,
    name: `${plan.transport.train.name} · ${plan.districts.find((d) => d.id === district)?.name || district}`,
    ...hubDistrictPosition(plan, district),
  }));

  const boatItems = (plan.transport?.boats?.stops || []).map((district, index) => {
    const center = hubDistrictPosition(plan, district);
    const d = offset(`boat:${district}`, 5);
    return {
      id: `hub:boat:${district}`,
      type: 'hubTransport',
      transport: 'boat',
      line: 'boat-loop',
      stopIndex: index,
      district,
      name: `Bateau-taxi · ${plan.districts.find((entry) => entry.id === district)?.name || district}`,
      x: center.x + d.x,
      z: center.z + d.z,
    };
  });

  const telephericItems=(plan.transport?.telepherics?.lines||[]).flatMap((line)=>[line.from,line.to].map((district,stopIndex)=>{
    const center=hubDistrictPosition(plan,district),d=offset(`telepheric:${line.id}:${stopIndex}`,3);
    return {id:`hub:telepheric:${line.id}:${stopIndex}`,type:'hubTransport',transport:'telepheric',line:line.id,stopIndex,district,name:`Téléphérique ${line.id} · ${plan.districts.find((entry)=>entry.id===district)?.name||district}`,x:center.x+d.x,z:center.z+d.z};
  }));
  const ziplineItems=(plan.transport?.ziplines?.lines||[]).flatMap((line)=>[line.from,line.to].map((district,stopIndex)=>{
    const center=hubDistrictPosition(plan,district),d=offset(`zipline:${line.id}:${stopIndex}`,3.5);
    return {id:`hub:zipline:${line.id}:${stopIndex}`,type:'hubTransport',transport:'zipline',line:line.id,stopIndex,district,boardable:stopIndex===0,name:`Tyrolienne ${line.id} · ${plan.districts.find((entry)=>entry.id===district)?.name||district}`,x:center.x+d.x,z:center.z+d.z};
  }));

  const eventItems = activeHubEvents(events,eventContext).map((event)=>{
    const center=hubDistrictPosition(plan,event.district),d=offset(`event:${event.id}`,7);
    return {id:`hub:event:${event.id}`,type:'hubEvent',eventId:event.id,district:event.district,name:event.id.replaceAll('_',' '),effect:event.effect,range:5,x:center.x+d.x,z:center.z+d.z};
  });
  const evidence={weather:eventContext.weather,night:eventContext.hour>=20||eventContext.hour<6};
  const stepLabels={
   secret_three_lights:'Lampe scellée',
   secret_rain_symbol:'Reflet de vitrine',
   secret_workers_names:'Nom du mémorial',
   secret_lost_station:'Rumeur du quartier',
   secret_broken_elevator:'Panneau d’ascenseur',
   secret_archive_reverse:'Fragment de chronologie',
  };
  const secretStepItems=secrets.flatMap((secret)=>{
   const count=HUB_SECRET_STEP_COUNTS[secret.id]||0;if(!count)return[];
   if(secret.id==='secret_rain_symbol'&&eventContext.weather!=='heavy_rain')return[];
   const done=hubState?.stats?.secretProgress?.[secret.id]||[],center=hubDistrictPosition(plan,secret.district),order=HUB_SECRET_ORDER[secret.id];
   return Array.from({length:count},(_,step)=>{
    const d=offset(`secret-step:${secret.id}:${step}`,5+step*.8);
    return {id:`hub:secret-step:${secret.id}:${step}`,type:'hubSecretStep',secretId:secret.id,step,district:secret.district,name:(stepLabels[secret.id]||'Indice secret')+' '+(step+1),done:done.includes(step),expected:order?order[done.length]===step:true,range:3,x:center.x+d.x,z:center.z+d.z};
   });
  });
  const secretItems = secrets.filter((secret)=>!(hubState?.secrets||[]).includes(secret.id)&&hubSecretReady(secret.id,hubState,evidence)).map((secret)=>{
    const center=hubDistrictPosition(plan,secret.district),d=offset(`secret:${secret.id}`,13);
    return {id:`hub:secret:${secret.id}`,type:'hubSecret',secretId:secret.id,district:secret.district,name:'Secret de la Cité',condition:secret.condition,reward:secret.reward,evidence,range:2.8,x:center.x+d.x,z:center.z+d.z};
  });

  return {
    items: [...districtItems, ...npcItems, ...missionItems, ...missionTaskItems, ...stationItems, ...boatItems, ...telephericItems, ...ziplineItems, ...eventItems, ...secretStepItems, ...secretItems],
    meta: {
      districts: districtItems.length,
      npcsActive: npcItems.length,
      npcsTotal: npcs.length,
      missions: missionItems.length,
      activeMissionTasks: missionTaskItems.length,
      trainStops: stationItems.length,
      boatStops: boatItems.length,
      telephericStops: telephericItems.length,
      ziplineStarts: ziplineItems.filter((item)=>item.boardable).length,
      events: events.length,
      activeEvents: eventItems.length,
      secrets: secrets.length,
      activeSecrets: secretItems.length,
      secretSteps: secretStepItems.length,
      profile,
    },
  };
}

export function nearestHubDestination(items, districtId, transport) {
  return items.find((item) => item.type === 'hubTransport' && item.district === districtId && (!transport || item.transport === transport)) || null;
}
