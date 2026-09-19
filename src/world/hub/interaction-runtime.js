import {advanceHubMission} from './mission-runtime.js';
import {HUB_DISTRICT_SET,HUB_BUILDING_SET,HUB_NPC_SET,HUB_TRANSIT_SET} from './interaction-catalog.js';

const step=(hub,id,condition)=>{
 const current=hub.missions[id];
 if(!condition||current?.status!=='active')return hub;
 return {...hub,missions:advanceHubMission(hub.missions,id,1)};
};

export function recordHubDistrict(hub,id){
 if(!HUB_DISTRICT_SET.has(id))throw Error('Quartier Hub inconnu.');
 const first=!hub.districts.includes(id),districts=first?[...hub.districts,id]:hub.districts;
 let next={...hub,districts},stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 next=step(next,'first_steps',id==='heritage_square'&&stage('first_steps',2));
 next=step(next,'rooftops_circle',id==='arena'&&stage('rooftops_circle',0));
 next=step(next,'rooftops_circle',id==='broken_circle_tower'&&stage('rooftops_circle',2));
 next=step(next,'storm_rescue',id==='docks'&&stage('storm_rescue',2));
 next=step(next,'eight_seeds',id==='gardens'&&stage('eight_seeds',1));
 next=step(next,'golden_pattern',id==='commerce'&&stage('golden_pattern',1));
 next=step(next,'lost_wolf_signal',id==='gardens'&&stage('lost_wolf_signal',1));
 return next;
}

export function recordHubBuilding(hub,id){
 if(!HUB_BUILDING_SET.has(id))throw Error('Bâtiment Hub inconnu.');
 const buildings=hub.buildings.includes(id)?hub.buildings:[...hub.buildings,id];
 let next={...hub,buildings},stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 next=step(next,'first_steps',id==='heritage_welcome'&&stage('first_steps',0));
 next=step(next,'first_echo',id==='memory_archives'&&stage('first_echo',1));
 next=step(next,'broken_record',id==='memory_archives'&&stage('broken_record',1));
 next=step(next,'first_foundation',id==='city_planning_office'&&stage('first_foundation',1));
 next=step(next,'living_fabric',id==='ai_textile_lab'&&stage('living_fabric',1));
 return next;
}

export function recordHubNpc(hub,id){
 if(!HUB_NPC_SET.has(id))throw Error('Personnage Hub inconnu.');
 const npcs=hub.npcs.includes(id)?hub.npcs:[...hub.npcs,id];
 let next={...hub,npcs},stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 const map=[
  ['first_echo','ines_varga',0],['storm_rescue','youssef_ben_salem',0],['memory_under_water','kadra_zerrouki',0],
  ['wagon_eight','the_conductor',0],['blue_blackout','arda_kaya',0],['garden_listens','maarja_saar',0],
  ['first_foundation','elio_romano',0],['voices_square','amira_mansouri',0],['voices_square','lucia_navaro',1],
  ['voices_square','soraya_najem',2],['passion_trial','sofia_vega',0],['silent_cable','leyla_demir',0],
  ['three_reflections','nora_khelifi',0],['eight_seeds','giulia_ferri',0],['golden_pattern','omar_el_fassi',0],
  ['living_fabric','meryem_alaoui',0],['lost_wolf_signal','evelin_tamm',0],['broken_record','celine_moreau',0],
  ['eight_signals','noah_leroux',0],
 ];
 for(const [mission,npc,objective] of map)next=step(next,mission,id===npc&&stage(mission,objective));
 if(id==='elio_romano'&&stage('first_foundation',2))next=step(next,'first_foundation',true);
 return next;
}

export function recordHubTransit(hub,id){
 if(!HUB_TRANSIT_SET.has(id))throw Error('Transport Hub inconnu.');
 const transits=hub.transits.includes(id)?hub.transits:[...hub.transits,id];
 let next={...hub,transits},stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 next=step(next,'first_steps',id.startsWith('train:')&&stage('first_steps',1));
 next=step(next,'boat_without_flag',id.startsWith('boat:')&&stage('boat_without_flag',0));
 next=step(next,'storm_rescue',id.startsWith('boat:')&&stage('storm_rescue',1));
 next=step(next,'memory_under_water',id.startsWith('boat:')&&stage('memory_under_water',1));
 next=step(next,'wagon_eight',id.startsWith('train:')&&stage('wagon_eight',1));
 next=step(next,'silent_cable',id.startsWith('telepheric:')&&stage('silent_cable',1));
 if(stage('rooftops_circle',1)){
   const used=transits.filter((value)=>value.startsWith('zipline:'));
   if(new Set(used).size>=2)next=step(next,'rooftops_circle',true);
 }
 return next;
}

export function recordHubEvent(hub,id){
 let next=hub,stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 next=step(next,'first_echo',id==='guardian_projection'&&stage('first_echo',2));
 next=step(next,'eight_signals',id==='guardian_projection'&&stage('eight_signals',1));
 next=step(next,'blue_blackout',id==='power_flicker'&&stage('blue_blackout',1));
 next=step(next,'garden_listens',id==='dock_fog'&&stage('garden_listens',1));
 next=step(next,'passion_trial',id==='arena_public_challenge'&&stage('passion_trial',1));
 next=step(next,'memory_under_water',id==='dock_fog'&&stage('memory_under_water',2));
 return next;
}

export function recordHubSecret(hub,id){
 let next=hub,stage=(mission,n)=>next.missions[mission]?.completedObjectives===n;
 next=step(next,'first_echo',id==='secret_archive_reverse'&&stage('first_echo',2));
 next=step(next,'boat_without_flag',id==='secret_abandoned_quay'&&stage('boat_without_flag',1));
 next=step(next,'wagon_eight',id==='secret_train_window'&&stage('wagon_eight',2));
 next=step(next,'garden_listens',id==='secret_fog_tree'&&stage('garden_listens',2));
 next=step(next,'silent_cable',id==='secret_silent_cabin'&&stage('silent_cable',2));
 next=step(next,'three_reflections',id==='secret_rain_symbol'&&stage('three_reflections',1));
 next=step(next,'golden_pattern',id==='secret_market_code'&&stage('golden_pattern',2));
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
