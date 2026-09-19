import {activeHubEvents} from './event-runtime.js';

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
      stopIndex: index,
      district,
      name: `Bateau-taxi · ${plan.districts.find((entry) => entry.id === district)?.name || district}`,
      x: center.x + d.x,
      z: center.z + d.z,
    };
  });

  const eventItems = activeHubEvents(events,eventContext).map((event)=>{
    const center=hubDistrictPosition(plan,event.district),d=offset(`event:${event.id}`,7);
    return {id:`hub:event:${event.id}`,type:'hubEvent',eventId:event.id,district:event.district,name:event.id.replaceAll('_',' '),effect:event.effect,range:5,x:center.x+d.x,z:center.z+d.z};
  });
  const secretItems = secrets.map((secret)=>{
    const center=hubDistrictPosition(plan,secret.district),d=offset(`secret:${secret.id}`,13);
    return {id:`hub:secret:${secret.id}`,type:'hubSecret',secretId:secret.id,district:secret.district,name:'Secret de la Cité',condition:secret.condition,reward:secret.reward,range:2.8,x:center.x+d.x,z:center.z+d.z};
  });

  return {
    items: [...districtItems, ...npcItems, ...missionItems, ...stationItems, ...boatItems, ...eventItems, ...secretItems],
    meta: {
      districts: districtItems.length,
      npcsActive: npcItems.length,
      npcsTotal: npcs.length,
      missions: missionItems.length,
      trainStops: stationItems.length,
      boatStops: boatItems.length,
      events: events.length,
      activeEvents: eventItems.length,
      secrets: secretItems.length,
      profile,
    },
  };
}

export function nearestHubDestination(items, districtId, transport) {
  return items.find((item) => item.type === 'hubTransport' && item.district === districtId && (!transport || item.transport === transport)) || null;
}
