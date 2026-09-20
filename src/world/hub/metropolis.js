const hash=input=>{let h=2166136261;for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

export const HUB_METROPOLIS=Object.freeze({
  width:1800,
  depth:1400,
  radius:650,
  portalScale:10,
  roadWidth:12,
  cellSize:150,
  perceivedWidth:1800,
  perceivedDepth:1400,
});

export function hubDistrictPosition(plan,districtId){
  const district=plan.districts.find(entry=>entry.id===districtId);
  if(!district)return null;
  const [u,v]=district.center;
  return {
    x:(u-.5)*HUB_METROPOLIS.width,
    z:(v-.5)*HUB_METROPOLIS.depth,
  };
}

export function hubPortalPosition(portal){
  return {x:portal[0]*HUB_METROPOLIS.portalScale,z:portal[1]*HUB_METROPOLIS.portalScale};
}

const BUILDING_SHAPES={
  tower_circle:[38,38,92],
  heritage_welcome:[34,24,18],
  mission_hotel:[46,32,28],
  memory_archives:[62,44,34],
  living_cards_gallery:[42,30,24],
  arena_3b:[92,74,30],
  mobility_center:[54,38,24],
  house_3b:[50,34,32],
  garage_3b:[72,48,20],
  community_house:[52,38,30],
  ai_textile_lab:[58,40,38],
  mode3_studio:[46,32,28],
  central_marina:[66,30,22],
  shipyard_3b:[92,52,18],
  train_station:[84,34,24],
  workers_memorial:[40,26,18],
  wildlife_refuge:[62,46,18],
  city_planning_office:[54,38,28],
  city_gallery:[58,40,30],
};

function buildingOffset(id,index){
  const h=hash(id),angle=(h%628)/100;
  const radius=32+(h>>>8)%34+index%3*8;
  return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,angle};
}

function buildingItem(plan,building,index){
  const center=hubDistrictPosition(plan,building.district),offset=buildingOffset(building.id,index);
  const [width,depth,height]=BUILDING_SHAPES[building.id]||[42,30,22+building.tier*8];
  const buildingX=center.x+offset.x,buildingZ=center.z+offset.z,entranceDistance=Math.max(width,depth)/2+8;
  return {
    id:`hub:building:${building.id}`,
    type:'hubBuilding',
    buildingId:building.id,
    name:building.name,
    district:building.district,
    functions:building.functions||[],
    interior:building.interior||'none',
    tier:building.tier||0,
    x:buildingX+Math.cos(offset.angle)*entranceDistance,
    z:buildingZ+Math.sin(offset.angle)*entranceDistance,
    buildingX,buildingZ,
    width,depth,height,
    range:8,
  };
}

function fillerItems(plan,profile){
  const perDistrict=profile==='desktop'?8:profile==='mobileHigh'?6:4;
  return plan.districts.flatMap((district)=>{
    const center=hubDistrictPosition(plan,district.id);
    return Array.from({length:perDistrict},(_,index)=>{
      const h=hash(`${district.id}:filler:${index}`),angle=index/perDistrict*Math.PI*2+((h%100)/100)*.35;
      const ring=78+(index%3)*34+(h>>>9)%28;
      const width=22+(h%24),depth=18+((h>>>5)%22),height=18+((h>>>11)%54);
      return {
        id:`hub:structure:${district.id}:${index}`,
        type:'hubStructure',
        district:district.id,
        x:center.x+Math.cos(angle)*ring,
        z:center.z+Math.sin(angle)*ring,
        width,depth,height,
        tier:district.tier||0,
      };
    });
  });
}

function road(from,to,id,kind='avenue'){
  const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
  return {
    id:`hub:road:${id}`,
    type:'hubRoad',
    kind,
    x:(from.x+to.x)/2,
    z:(from.z+to.z)/2,
    from,to,
    length,
    width:kind==='express'?HUB_METROPOLIS.roadWidth+5:HUB_METROPOLIS.roadWidth,
    heading:Math.atan2(dx,dz),
  };
}

export function metropolisRoadItems(plan){
  const stations=plan.transport?.train?.stations||[];
  const roads=[];
  stations.forEach((id,index)=>{
    const next=stations[(index+1)%stations.length];
    roads.push(road(hubDistrictPosition(plan,id),hubDistrictPosition(plan,next),`ring:${id}:${next}`,'express'));
  });
  const heritage=hubDistrictPosition(plan,'heritage_square');
  for(const district of plan.districts){
    if(district.id==='heritage_square')continue;
    roads.push(road(heritage,hubDistrictPosition(plan,district.id),`spoke:heritage_square:${district.id}`,'avenue'));
  }
  return roads;
}

export function metropolisTrafficItems(plan,profile){
  const roads=metropolisRoadItems(plan).filter((_,index)=>index%2===0);
  const count=profile==='desktop'?12:profile==='mobileHigh'?8:5;
  return Array.from({length:count},(_,index)=>{
    const route=roads[index%roads.length],phase=(index+.5)/count;
    return {
      id:`hub:traffic:${index}`,
      type:'hubTraffic',
      routeId:route.id,
      from:route.from,
      to:route.to,
      phase,
      speed:10+(index%4)*2.5,
      x:route.from.x+(route.to.x-route.from.x)*phase,
      z:route.from.z+(route.to.z-route.from.z)*phase,
    };
  });
}

export function buildMetropolisRuntimeItems(plan,profile='mobileMedium'){
  const buildings=plan.buildings.map((building,index)=>buildingItem(plan,building,index));
  const structures=fillerItems(plan,profile);
  const roads=metropolisRoadItems(plan);
  const traffic=metropolisTrafficItems(plan,profile);
  return {
    items:[...roads,...structures,...buildings,...traffic],
    meta:{
      buildings:buildings.length,
      structures:structures.length,
      roads:roads.length,
      traffic:traffic.length,
      width:HUB_METROPOLIS.width,
      depth:HUB_METROPOLIS.depth,
      radius:HUB_METROPOLIS.radius,
    },
  };
}
