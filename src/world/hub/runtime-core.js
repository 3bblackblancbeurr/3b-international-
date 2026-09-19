const hash=text=>{let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const HUB_RADIUS=118;
export const HUB_WORLD_SCALE=280;

export function hubPoint(center){
  const [nx=.5,nz=.53]=center||[];
  return {x:(nx-.5)*HUB_WORLD_SCALE,z:(nz-.53)*HUB_WORLD_SCALE};
}

function buildingSize(building){
  if(building.id==='tower_circle')return {w:14,d:14,h:38};
  if(building.id==='memory_archives')return {w:22,d:15,h:11};
  if(building.id==='central_marina')return {w:20,d:12,h:8};
  if(building.id==='train_station')return {w:21,d:10,h:7};
  if(building.id==='city_planning_office')return {w:16,d:12,h:9};
  const tier=Number(building.tier)||0;
  return {w:10+tier*2,d:8+tier,h:6+tier*2};
}

function around(center,id,index,radius=13){
  const h=hash(id),angle=((h%6283)/1000)+index*.71,r=radius+((h>>>8)%7);
  return {x:center.x+Math.sin(angle)*r,z:center.z+Math.cos(angle)*r};
}

export function buildHubLayout(plan,npcs=[],missions=[]){
  if(!plan?.districts?.length)throw new Error('hub plan missing districts');
  const districts=plan.districts.map(d=>({...d,...hubPoint(d.center)}));
  const districtById=Object.fromEntries(districts.map(d=>[d.id,d]));
  const buildings=(plan.buildings||[]).map((b,index)=>{
    const district=districtById[b.district];
    if(!district)throw new Error('unknown hub district '+b.district);
    const p=b.id==='tower_circle'||b.id==='memory_archives'||b.id==='central_marina'||b.id==='train_station'||b.id==='city_planning_office'
      ? around(district,b.id,index,7)
      : around(district,b.id,index,12);
    return {...b,...p,...buildingSize(b)};
  });
  const npcPlacements=npcs.map((npc,index)=>{
    const district=districtById[npc.district]||districts[0];
    const p=around(district,'npc:'+npc.id,index,8);
    return {...npc,...p};
  });
  const npcById=Object.fromEntries(npcPlacements.map(n=>[n.id,n]));
  const missionPlacements=missions.map((mission,index)=>{
    const giver=npcById[mission.giver],district=districtById[mission.district]||districts[0];
    const base=giver||district,p=around(base,'mission:'+mission.id,index,2.2);
    return {...mission,x:p.x,z:p.z};
  });
  const stationIds=plan.transport?.train?.stations||[];
  const trainStations=stationIds.map((id,index)=>{
    const district=districtById[id];
    if(!district)throw new Error('unknown train station '+id);
    return {id:'train:'+id,district:id,name:'3B Express · '+district.name,x:district.x+6,z:district.z+6,index};
  });
  const boatStops=(plan.transport?.boats?.stops||[]).map((id,index)=>{
    const district=districtById[id];
    if(!district)throw new Error('unknown boat stop '+id);
    return {id:'boat:'+id,district:id,name:'Bateau-taxi · '+district.name,x:district.x-7,z:district.z+7,index};
  });
  const ziplines=(plan.transport?.ziplines?.lines||[]).map(line=>{
    const from=districtById[line.from],to=districtById[line.to];
    return {...line,from:{x:from.x,z:from.z},to:{x:to.x,z:to.z}};
  });
  const obstacles=buildings.filter(b=>b.interior!=='open').map(b=>({id:b.id,x:b.x,z:b.z,w:b.w+1.2,d:b.d+1.2,h:b.h,angle:0}));
  return {districts,districtById,buildings,npcs:npcPlacements,npcById,missions:missionPlacements,trainStations,boatStops,ziplines,obstacles,firstPlayableSlice:plan.firstPlayableSlice};
}

export function hubDistrictAt(layout,position){
  if(!layout?.districts?.length)return null;
  const nearest=layout.districts.map(d=>({...d,distance:Math.hypot(position.x-d.x,position.z-d.z)})).sort((a,b)=>a.distance-b.distance)[0];
  return nearest&&nearest.distance<=34?nearest:null;
}

export function nearestHubInteraction(layout,position,range=3.6){
  if(!layout)return null;
  const interactions=[
    ...layout.npcs.map(n=>({id:'hub-npc:'+n.id,type:'hub-npc',name:n.name,x:n.x,z:n.z,npcId:n.id,range:3.4})),
    ...layout.trainStations.map(s=>({...s,type:'hub-train',range:4})),
    ...layout.boatStops.map(s=>({...s,type:'hub-boat',range:4})),
    ...layout.ziplines.map(z=>({id:'zipline:'+z.id,type:'hub-zipline',name:'Tyrolienne '+z.id,x:z.from.x,z:z.from.z,to:z.to,range:4})),
    ...layout.buildings.filter(b=>b.tier===0).map(b=>({id:'hub-building:'+b.id,type:'hub-building',name:b.name,x:b.x,z:b.z,buildingId:b.id,range:4.2}))
  ];
  return interactions.filter(i=>Math.hypot(position.x-i.x,position.z-i.z)<Math.min(range,i.range||range)).sort((a,b)=>Math.hypot(position.x-a.x,position.z-a.z)-Math.hypot(position.x-b.x,position.z-b.z))[0]||null;
}

export function hubPopulationBudget(plan,profile='auto'){
  const p=plan?.performance||{};
  const source=profile==='light'?p.mobileMedium:profile==='high'?p.desktop:p.mobileHigh||p.mobileMedium;
  const near=source?.activeNpcNear||[12,20],distant=source?.distantNpc||[20,35];
  return {near:near[1],distant:distant[1],cells:source?.activeCells||3,targetFps:source?.targetFps||30};
}

export function nextStop(stops,currentId){
  if(!stops?.length)return null;
  const index=Math.max(0,stops.findIndex(s=>s.id===currentId));
  return stops[(index+1)%stops.length];
}
