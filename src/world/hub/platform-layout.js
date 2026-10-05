/** Physical layout of the reference hub. Coordinates are metres, on one safe deck.
 * Existing mission/NPC IDs stay unchanged: a new layout never resets a save. */
import {REFERENCE_GATE_SECTORS} from './gate-identity.js';
import {citeSurfaceDistance,CITE_GATE_SITES} from './platform-topology.js';
import {HUB_MISSION_SIGNAL_RULES} from './mission-signals.js';
import {referenceTransportSite} from './transport-motion.js';
export const HUB_SCALE=1.7;
export const HUB_PLATFORM = Object.freeze({radius:288*HUB_SCALE,walkRadius:286*HUB_SCALE,portalRadius:238*HUB_SCALE,spawn:{x:8*HUB_SCALE,z:38*HUB_SCALE},core:{x:0,z:0}});
const DISTRICT_SITES = {
 heritage_square:{x:0,z:35},broken_circle_tower:{x:0,z:0},
 archives:{x:-66,z:-66},arena:{x:66,z:-66},commerce:{x:94,z:0},
 community:{x:-94,z:0},innovation:{x:0,z:-94},docks:{x:0,z:100},
 city3b_portal:{x:66,z:66},gardens:{x:-66,z:66},
};
export const PLATFORM_DISTRICTS=Object.freeze(Object.fromEntries(Object.entries(DISTRICT_SITES).map(([id,p])=>[id,{x:p.x*HUB_SCALE,z:p.z*HUB_SCALE}])));
const SITES={
 tower_circle:[0,-38,14,10,8],heritage_welcome:[-22,36,13,11,8],mission_hotel:[22,36,13,11,9],
 memory_archives:[-82,-74,18,15,16],living_cards_gallery:[-57,-89,13,11,10],
 arena_3b:[82,-74,28,24,13],mobility_center:[57,-91,12,11,8],
 house_3b:[109,-16,15,13,11],garage_3b:[107,18,18,15,10],
 community_house:[-111,0,18,16,13],ai_textile_lab:[-16,-111,15,14,15],mode3_studio:[16,-111,15,14,12],
 central_marina:[-23,112,15,12,9],shipyard_3b:[23,112,16,13,8],train_station:[0,132,14,11,10],
 workers_memorial:[-84,80,14,12,9],wildlife_refuge:[-56,100,13,12,8],
 city_planning_office:[59,95,14,12,10],city_gallery:[85,81,14,12,10],
};
export function platformBuilding(building){
 const [x,z,width,depth,height]=(SITES[building.id]||[0,48,12,10,8]).map((v,i)=>v*(i===4?1.5:HUB_SCALE));
 return {id:'hub:building:'+building.id,type:'hubBuilding',buildingId:building.id,
 name:building.name,district:building.district,functions:building.functions||[],interior:building.interior,
 x,z:z-depth/2+3*HUB_SCALE,buildingX:x,buildingZ:z,width,depth,height,range:4.5,physicalInterior:true,
 entrance:{x,z:z+depth/2+2*HUB_SCALE},tier:building.tier||0,buildStatus:'active'};
}
export function platformPortal(index){
 const site=CITE_GATE_SITES[REFERENCE_GATE_SECTORS[index]];
 return {x:site.x*HUB_SCALE,z:site.z*HUB_SCALE};
}
export function platformWalls(b){
 const x=b.buildingX,z=b.buildingZ,w=b.width,d=b.depth,t=.55*HUB_SCALE,gap=(b.buildingId==='arena_3b'?8:5)*HUB_SCALE;
 return [{x,z:z-d/2,width:w,depth:t},{x:x-w/2,z,width:t,depth:d},{x:x+w/2,z,width:t,depth:d},
 ...[-1,1].map(side=>({x:x+side*(w+gap)/4,z:z+d/2,width:(w-gap)/2,depth:t}))];
}
export function platformInteriorAt(position,buildings){
 return buildings.find(b=>Math.abs(position.x-b.buildingX)<b.width/2-.7&&Math.abs(position.z-b.buildingZ)<b.depth/2-.7)||null;
}
export function safePlatformPosition(point){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||Math.hypot(point.x,point.z)>HUB_PLATFORM.walkRadius||citeSurfaceDistance(point.x/HUB_SCALE,point.z/HUB_SCALE)>-1.25/HUB_SCALE)return {...HUB_PLATFORM.spawn};
 return {x:point.x,z:point.z};
}
const hash=s=>{let h=0;for(const c of s)h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;return h;};
const SEMANTIC=new Set(['hubNpc','hubGuardian','hubDistrict','hubMission','hubMissionAction','hubEvent','hubSecret','hubSecretStep','hubMilestone','hubTransport']);
/** Keep authored activities; replace all legacy metropolis filler/roads/buildings. */
export function platformRuntimeItems(base,runtime,plan){
 const buildings=plan.buildings.map(platformBuilding),portals=base.filter(i=>i.type==='portal').map((item,index)=>({...item,...platformPortal(index)}));
 const semantic=runtime.filter(i=>SEMANTIC.has(i.type)).map(item=>{
  // Boarding signs, map destinations and ride endpoints share one authored site.
  // Do not apply the old district-centre offsets to the physical transit network.
  if(item.type==='hubTransport'){
   const site=referenceTransportSite(item);
   if(site)return {...item,...site,homeX:site.x,homeZ:site.z};
  }
  const old=plan.districts.find(d=>d.id===item.district),center=PLATFORM_DISTRICTS[item.district]||PLATFORM_DISTRICTS.heritage_square;
  const oldX=old?(old.center[0]-.5)*1800:0,oldZ=old?(old.center[1]-.5)*1400:0;
  let x=center.x+Math.max(-13,Math.min(13,(item.x-oldX)*.7))*HUB_SCALE,z=center.z+Math.max(-13,Math.min(13,(item.z-oldZ)*.7))*HUB_SCALE;
  if(item.district==='broken_circle_tower'){const a=(hash(item.id)%628)/100;x=Math.sin(a)*29*HUB_SCALE;z=Math.cos(a)*29*HUB_SCALE;}
  // All semantic markers remain outside furniture and rooms unless specifically hosted inside.
  for(const b of buildings)if(Math.abs(x-b.buildingX)<b.width/2+4*HUB_SCALE&&Math.abs(z-b.buildingZ)<b.depth/2+4*HUB_SCALE){z=b.buildingZ+b.depth/2+5*HUB_SCALE;}
  for(const [wx,wz] of [[48,48],[-48,48],[48,-48],[-48,-48]]){const px=wx*HUB_SCALE,pz=wz*HUB_SCALE,dx=x-px,dz=z-pz,d=Math.hypot(dx,dz);if(d<19*HUB_SCALE){x=px+dx/(d||1)*19*HUB_SCALE;z=pz+dz/(d||1)*19*HUB_SCALE;}}
  // Sheltered residents stand in their actual service room, in the clear
  // front-centre aisle shared with the physical furniture specification.
  if(item.type==='hubNpc'&&(item.shelter||item.indoor)){
   const room=buildings.find(b=>b.buildingId===item.activityBuildingId);
   if(room){const identity=hash(item.npcId||item.id);x=room.buildingX+((identity%5)-2)*.9*HUB_SCALE;z=room.buildingZ+room.depth*(.12+(identity%4)*.06);}
  }
  return {...item,x,z,homeX:x,homeZ:z};
 });
 const final=base.find(i=>i.type==='final');
 return [...portals,...(final?[{...final,x:0,z:23*HUB_SCALE}]:[]),...buildings,...semantic];
}
export function platformNextObjective(items,save){
 const active=items.find(i=>i.type==='hubMissionAction');
 if(active)return {label:active.name,item:active};
 const claim=items.find(i=>i.type==='hubMission'&&save.hub?.missions?.[i.missionId]?.status==='completed'&&!save.hub.missions[i.missionId].claimed);
 if(claim)return {label:'Récupérer la récompense · '+claim.name,item:claim};
 const running=items.find(i=>i.type==='hubMission'&&save.hub?.missions?.[i.missionId]?.status==='active');
 if(running){
  const stage=save.hub.missions[running.missionId].completedObjectives,rule=HUB_MISSION_SIGNAL_RULES[running.missionId]?.[stage];
  const target=rule&&items.find(i=>rule.type==='building'?i.type==='hubBuilding'&&i.buildingId===rule.id:
   rule.type==='transport'?i.type==='hubTransport'&&i.transport===rule.id:
   rule.type==='district'?i.type==='hubDistrict'&&i.district===rule.id:
   rule.type==='npc'?i.type==='hubNpc'&&i.npcId===rule.id:
   rule.type==='secretStep'?i.type==='hubSecretStep'&&i.secretId===rule.id&&i.step===rule.step:
   rule.type==='secret'?i.type==='hubSecret'&&i.secretId===rule.id:false);
  return {label:running.objectives?.[stage]||running.name,item:target||running};
 }
 const available=items.find(i=>i.type==='hubMission'&&!i.locked&&save.hub?.missions?.[i.missionId]?.status==='available');
 return available?{label:'Rencontrer '+available.giver+' · '+available.name,item:items.find(i=>i.type==='hubNpc'&&i.missionIds?.includes(available.missionId))||available}:null;
}
