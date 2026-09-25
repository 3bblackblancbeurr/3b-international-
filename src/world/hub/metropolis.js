import {COUNTRIES} from '../catalog.js';
const hash=input=>{let h=2166136261;for(let i=0;i<input.length;i+=1){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));

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

export function hubEvolutionState(plan,{seals=[],restoredRegions=[]}={}){
  const fragments=Math.max(new Set(seals).size,new Set(restoredRegions).size);
  const stages=plan.evolution?.stages||[{stage:0,id:'foundations',label:'Fondations vivantes',minFragments:0,activeBuildingTiers:[0],densityBonus:0,trafficBonus:0,activeSkybridges:0,platformGlow:.18}];
  const stage=[...stages].filter(entry=>fragments>=Number(entry.minFragments||0)).sort((a,b)=>a.stage-b.stage).at(-1)||stages[0];
  return {...stage,fragmentCount:fragments,restoredCount:new Set(restoredRegions).size,liberatedCount:new Set(seals).size};
}

function heritagePlatformItems(plan,evolution,{seals=[],restoredRegions=[]}={}){
  const byRegion=new Map(COUNTRIES.map(country=>[country.id,country]));
  return (plan.heritagePlatforms||[]).flatMap((platform,index)=>{
    const country=byRegion.get(platform.regionId);if(!country?.portal)return[];
    const position=hubPortalPosition(country.portal),liberated=seals.includes(platform.regionId),restored=restoredRegions.includes(platform.regionId);
    return [{
      id:`hub:heritage-platform:${platform.code}`,
      type:'hubHeritagePlatform',
      code:platform.code,
      regionId:platform.regionId,
      name:platform.name,
      value:platform.value,
      district:platform.district,
      services:platform.services||[],
      visual:platform.visual||'',
      color:country.color,
      symbol:country.symbol,
      x:position.x,
      z:position.z,
      range:9,
      index,
      liberated,
      restored,
      evolutionStage:evolution.stage,
      glow:Math.min(1,Number(evolution.platformGlow||.18)+(restored?.22:liberated?.12:0)),
    }];
  });
}

function skybridgeItems(plan,evolution){
  const links=(plan.verticalLinks||[]).slice(0,Math.max(0,Number(evolution.activeSkybridges||0)));
  return links.flatMap((link,index)=>{
    const from=hubDistrictPosition(plan,link.from),to=hubDistrictPosition(plan,link.to);if(!from||!to)return[];
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
    return [{
      id:`hub:skybridge:${link.id}`,
      type:'hubSkybridge',
      bridgeId:link.id,
      fromDistrict:link.from,
      toDistrict:link.to,
      role:link.role,
      level:link.level||1,
      x:(from.x+to.x)/2,
      z:(from.z+to.z)/2,
      from,to,
      length,
      width:4.8+(link.level||1)*.35,
      height:7+(link.level||1)*6,
      heading:Math.atan2(dx,dz),
      evolutionStage:evolution.stage,
      index,
    }];
  });
}

const BUILDING_SHAPES={
  tower_circle:[42,42,118],
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

function buildingItem(plan,building,index,evolution){
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
    evolutionStage:evolution.stage,
    buildStatus:(evolution.activeBuildingTiers||[0]).includes(building.tier||0)?'active':'construction',
    prestige:evolution.stage>=4,
    x:buildingX+Math.cos(offset.angle)*entranceDistance,
    z:buildingZ+Math.sin(offset.angle)*entranceDistance,
    buildingX,buildingZ,
    width,depth,height,
    range:8,
  };
}

function fillerItems(plan,profile,evolution){
  const base=profile==='desktop'?8:profile==='mobileHigh'?6:4,perDistrict=Math.min(profile==='desktop'?13:profile==='mobileHigh'?10:8,base+Math.max(0,Number(evolution.densityBonus||0)));
  return plan.districts.flatMap((district)=>{
    const center=hubDistrictPosition(plan,district.id),districtSeed=hash(`${district.id}:layout`),baseRotation=(districtSeed%6283)/1000;
    const stretchX=.84+((districtSeed>>>7)%25)/100,stretchZ=.84+((districtSeed>>>13)%25)/100;
    return Array.from({length:perDistrict},(_,index)=>{
      const h=hash(`${district.id}:filler:${index}`),angle=baseRotation+index*GOLDEN_ANGLE+(((h>>>4)%100)/100-.5)*.22;
      const band=index%4,ring=64+band*27+((h>>>9)%31);
      const width=20+(h%26),depth=17+((h>>>5)%24),tierRoll=(h>>>11)%100,protectedVista=['heritage_square','broken_circle_tower','docks'].includes(district.id);
      let height=tierRoll<58?14+((h>>>17)%18):tierRoll<90?30+((h>>>17)%28):60+((h>>>17)%24);
      if(protectedVista&&height>52)height=34+((h>>>19)%18);
      if(district.id==='broken_circle_tower')height=Math.min(height,44);
      return {
        id:`hub:structure:${district.id}:${index}`,
        type:'hubStructure',
        district:district.id,
        x:center.x+Math.cos(angle)*ring*stretchX,
        z:center.z+Math.sin(angle)*ring*stretchZ,
        width,depth,height,
        tier:district.tier||0,
        evolutionStage:evolution.stage,
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
    width:kind==='express'?HUB_METROPOLIS.roadWidth+5:kind==='lane'?6.5:HUB_METROPOLIS.roadWidth,
    heading:Math.atan2(dx,dz),
  };
}

function segmentClearance(pointA,pointB,blockers){
  const vx=pointB.x-pointA.x,vz=pointB.z-pointA.z,lengthSq=vx*vx+vz*vz||1;
  let clearance=Infinity;
  for(const blocker of blockers){
    const wx=blocker.x-pointA.x,wz=blocker.z-pointA.z,t=Math.max(0,Math.min(1,(wx*vx+wz*vz)/lengthSq));
    const x=pointA.x+vx*t,z=pointA.z+vz*t;
    clearance=Math.min(clearance,Math.hypot(blocker.x-x,blocker.z-z)-blocker.r);
  }
  return clearance;
}

function metropolisBuildingBlockers(plan){
  return plan.buildings.map((building,index)=>{
    const center=hubDistrictPosition(plan,building.district),offset=buildingOffset(building.id,index),[width,depth]=BUILDING_SHAPES[building.id]||[42,30,22];
    return {id:building.id,x:center.x+offset.x,z:center.z+offset.z,r:Math.hypot(width,depth)/2+8};
  });
}

function laneAnchor(center,dx,dz,blockers){
  const base=Math.atan2(dz,dx),angles=[0,.28,-.28,.56,-.56,.84,-.84,1.12,-1.12,1.4,-1.4];
  let best=null;
  for(const radius of [82,96,110,124])for(const delta of angles){
    const angle=base+delta,point={x:center.x+Math.cos(angle)*radius,z:center.z+Math.sin(angle)*radius};
    const clearance=Math.min(...blockers.map(blocker=>Math.hypot(point.x-blocker.x,point.z-blocker.z)-blocker.r));
    const score=clearance-Math.abs(delta)*2;
    if(!best||score>best.score)best={...point,score};
  }
  return {x:best.x,z:best.z};
}

function pedestrianLaneRoute(plan,fromId,toId,blockers){
  const fromCenter=hubDistrictPosition(plan,fromId),toCenter=hubDistrictPosition(plan,toId),vx=toCenter.x-fromCenter.x,vz=toCenter.z-fromCenter.z,length=Math.hypot(vx,vz)||1,dx=vx/length,dz=vz/length,nx=-dz,nz=dx;
  const from=laneAnchor(fromCenter,dx,dz,blockers),to=laneAnchor(toCenter,-dx,-dz,blockers),baseMid={x:(from.x+to.x)/2,z:(from.z+to.z)/2};
  let best={mid:baseMid,clearance:Math.min(segmentClearance(from,baseMid,blockers),segmentClearance(baseMid,to,blockers))};
  for(const bend of [30,50,70,90,115,145,180,220])for(const side of [-1,1]){
    const mid={x:baseMid.x+nx*bend*side,z:baseMid.z+nz*bend*side};
    const pointClearance=Math.min(...blockers.map(blocker=>Math.hypot(mid.x-blocker.x,mid.z-blocker.z)-blocker.r));
    const clearance=Math.min(pointClearance,segmentClearance(from,mid,blockers),segmentClearance(mid,to,blockers));
    if(clearance>best.clearance)best={mid,clearance};
  }
  return {from,mid:best.mid,to,clearance:best.clearance};
}

export function pedestrianLaneMinimumClearance(plan,lane){
  return segmentClearance(lane.from,lane.to,metropolisBuildingBlockers(plan));
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

  // Human-scale shortcuts use safe district-edge anchors and deterministic
  // bends chosen for maximum clearance from canonical building footprints.
  const shortcuts=[
    ['archives','innovation'],['community','commerce'],['gardens','city3b_portal'],
    ['docks','commerce'],['arena','broken_circle_tower'],
  ],blockers=metropolisBuildingBlockers(plan);
  for(const [fromId,toId] of shortcuts){
    const route=pedestrianLaneRoute(plan,fromId,toId,blockers);
    roads.push(
      road(route.from,route.mid,`lane:${fromId}:${toId}:a`,'lane'),
      road(route.mid,route.to,`lane:${fromId}:${toId}:b`,'lane'),
    );
  }
  return roads;
}

export function metropolisTrafficItems(plan,profile,evolution={trafficBonus:0,stage:0}){
  const roads=metropolisRoadItems(plan).filter(route=>route.kind!=='lane').filter((_,index)=>index%2===0);
  const base=profile==='desktop'?12:profile==='mobileHigh'?8:5,count=Math.min(profile==='desktop'?20:profile==='mobileHigh'?14:10,base+Math.max(0,Number(evolution.trafficBonus||0)));
  return Array.from({length:count},(_,index)=>{
    const route=roads[index%roads.length],h=hash(`${route.id}:traffic:${index}`);
    const basePhase=(index+.5)/count,jitter=(((h>>>5)%100)/100-.5)*.62/count,phase=Math.max(.04,Math.min(.96,basePhase+jitter));
    return {
      id:`hub:traffic:${index}`,
      type:'hubTraffic',
      routeId:route.id,
      from:route.from,
      to:route.to,
      phase,
      speed:9+((h>>>12)%76)/10,
      evolutionStage:evolution.stage||0,
      x:route.from.x+(route.to.x-route.from.x)*phase,
      z:route.from.z+(route.to.z-route.from.z)*phase,
    };
  });
}

export function buildMetropolisRuntimeItems(plan,profile='mobileMedium',progress={}){
  const evolution=hubEvolutionState(plan,progress);
  const buildings=plan.buildings.map((building,index)=>buildingItem(plan,building,index,evolution));
  const structures=fillerItems(plan,profile,evolution);
  const roads=metropolisRoadItems(plan);
  const traffic=metropolisTrafficItems(plan,profile,evolution);
  const platforms=heritagePlatformItems(plan,evolution,progress);
  const skybridges=skybridgeItems(plan,evolution);
  return {
    items:[...roads,...skybridges,...structures,...buildings,...platforms,...traffic],
    meta:{
      buildings:buildings.length,
      structures:structures.length,
      roads:roads.length,
      traffic:traffic.length,
      heritagePlatforms:platforms.length,
      skybridges:skybridges.length,
      evolutionStage:evolution.stage,
      evolutionLabel:evolution.label,
      fragmentCount:evolution.fragmentCount,
      width:HUB_METROPOLIS.width,
      depth:HUB_METROPOLIS.depth,
      radius:HUB_METROPOLIS.radius,
    },
  };
}
