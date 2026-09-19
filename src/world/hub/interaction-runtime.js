import {advanceHubMission} from './mission-runtime.js';
import {HUB_DISTRICT_SET,HUB_NPC_SET,HUB_TRANSIT_SET} from './interaction-catalog.js';

const step=(hub,id,condition)=>{
 const current=hub.missions[id];
 if(!condition||current?.status!=='active')return hub;
 return {...hub,missions:advanceHubMission(hub.missions,id,1)};
};

export function recordHubDistrict(hub,id){
 if(!HUB_DISTRICT_SET.has(id))throw Error('Quartier Hub inconnu.');
 const first=!hub.districts.includes(id),districts=first?[...hub.districts,id]:hub.districts;
 let next={...hub,districts};
 const firstSteps=next.missions.first_steps;
 next=step(next,'first_steps',id==='heritage_square'&&(firstSteps?.completedObjectives===0||firstSteps?.completedObjectives===2));
 next=step(next,'first_echo',id==='archives'&&next.missions.first_echo?.completedObjectives===1);
 next=step(next,'rooftops_circle',id==='arena'&&next.missions.rooftops_circle?.completedObjectives===0);
 next=step(next,'rooftops_circle',id==='broken_circle_tower'&&next.missions.rooftops_circle?.completedObjectives===2);
 return next;
}

export function recordHubNpc(hub,id){
 if(!HUB_NPC_SET.has(id))throw Error('Personnage Hub inconnu.');
 const npcs=hub.npcs.includes(id)?hub.npcs:[...hub.npcs,id];
 let next={...hub,npcs};
 next=step(next,'first_echo',id==='ines_varga'&&next.missions.first_echo?.completedObjectives===0);
 return next;
}

export function recordHubTransit(hub,id){
 if(!HUB_TRANSIT_SET.has(id))throw Error('Transport Hub inconnu.');
 const transits=hub.transits.includes(id)?hub.transits:[...hub.transits,id];
 let next={...hub,transits};
 next=step(next,'first_steps',id.startsWith('train:')&&next.missions.first_steps?.completedObjectives===1);
 next=step(next,'boat_without_flag',id.startsWith('boat:')&&next.missions.boat_without_flag?.completedObjectives===0);
 if(next.missions.rooftops_circle?.completedObjectives===1){
   const used=transits.filter((value)=>value.startsWith('zipline:'));
   if(new Set(used).size>=2)next=step(next,'rooftops_circle',true);
 }
 return next;
}

export function recordHubEvent(hub,id){
 let next=hub;
 next=step(next,'first_echo',id==='guardian_projection'&&next.missions.first_echo?.completedObjectives===2);
 return next;
}

export function recordHubSecret(hub,id){
 let next=hub;
 next=step(next,'first_echo',id==='secret_archive_reverse'&&next.missions.first_echo?.completedObjectives===2);
 next=step(next,'boat_without_flag',id==='secret_abandoned_quay'&&next.missions.boat_without_flag?.completedObjectives===1);
 return next;
}


export function canUnlockHubSecret(hub,id){
 const mission=(missionId)=>hub.missions?.[missionId];
 const hasDistrict=(district)=>hub.districts?.includes(district);
 const transit=(prefix)=>hub.transits?.filter((value)=>value.startsWith(prefix))||[];
 const npcs=new Set(hub.npcs||[]);
 switch(id){
  case 'secret_last_train':return new Set(transit('train:')).size>=3;
  case 'secret_waterfall_door':return hasDistrict('gardens')&&mission('eight_seeds')?.status==='completed';
  case 'secret_three_lights':return hasDistrict('heritage_square')&&mission('first_steps')?.status==='completed';
  case 'secret_rain_symbol':return hub.events?.includes('heavy_rain_echo');
  case 'secret_silent_cabin':return transit('telepheric:').length>0;
  case 'secret_roof_signal':return hasDistrict('archives');
  case 'secret_abandoned_quay':return transit('boat:').length>0;
  case 'secret_workers_names':return hasDistrict('gardens')&&npcs.size>=8;
  case 'secret_lost_station':return hasDistrict('community')&&npcs.size>=4;
  case 'secret_broken_elevator':return hasDistrict('broken_circle_tower')&&mission('eight_signals')?.status==='completed';
  case 'secret_arena_floor':return hasDistrict('arena')&&mission('passion_trial')?.status==='completed';
  case 'secret_market_code':return hasDistrict('commerce')&&npcs.size>=5;
  case 'secret_city_guest':return hasDistrict('city3b_portal')&&npcs.size>=3;
  case 'secret_fog_tree':return hub.events?.includes('dock_fog');
  case 'secret_archive_reverse':return mission('first_echo')?.status==='active'&&mission('first_echo')?.completedObjectives>=2;
  case 'secret_train_window':return new Set(transit('train:')).size>=8;
  default:return false;
 }
}
