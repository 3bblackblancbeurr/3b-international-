import {advanceHubMission} from './mission-runtime.js';

export const HUB_MISSION_SIGNAL_RULES={
 first_steps:[
  {type:'building',id:'heritage_welcome'},
  {type:'transport',id:'train'},
  {type:'district',id:'heritage_square'},
 ],
 first_echo:[
  {type:'building',id:'memory_archives'},
  {type:'npc',id:'ines_varga'},
  {type:'building',id:'tower_circle'},
 ],
 eight_signals:[
  {type:'building',id:'tower_circle'},
  {type:'district',id:'broken_circle_tower'},
 ],
 rooftops_circle:[
  {type:'transport',id:'zipline'},
  {type:'transport',id:'zipline'},
  {type:'district',id:'arena'},
 ],
 boat_without_flag:[
  {type:'transport',id:'boat'},
  {type:'secret',id:'secret_abandoned_quay'},
 ],
 storm_rescue:[
  {type:'npc',id:'youssef_ben_salem'},
  {type:'transport',id:'boat'},
  {type:'transport',id:'boat'},
 ],
 memory_under_water:[
  {type:'building',id:'central_marina'},
  {type:'event',id:'heavy_rain_echo'},
  {type:'npc',id:'kadra_zerrouki'},
 ],
 wagon_eight:[
  {type:'transport',id:'train'},
  {type:'npc',id:'the_conductor'},
  {type:'building',id:'train_station'},
 ],
 blue_blackout:[
  {type:'building',id:'ai_textile_lab'},
  {type:'event',id:'power_flicker'},
 ],
 garden_listens:[
  {type:'district',id:'gardens'},
  {type:'event',id:'dock_fog'},
  {type:'secret',id:'secret_fog_tree'},
 ],
 first_foundation:[
  {type:'city',id:'founded'},
  {type:'city',id:'synced'},
  {type:'city',id:'built'},
 ],
 voices_square:[
  {type:'npc',id:'amira_mansouri'},
  {type:'npc',id:'lucia_navaro'},
  {type:'npc',id:'soraya_najem'},
 ],
 passion_trial:[
  {type:'building',id:'arena_3b'},
  {type:'building',id:'mobility_center'},
 ],
 silent_cable:[
  {type:'transport',id:'telepheric'},
  {type:'district',id:'innovation'},
  {type:'transport',id:'telepheric'},
 ],
 three_reflections:[
  {type:'secretStep',id:'secret_rain_symbol',step:2},
  {type:'secret',id:'secret_rain_symbol'},
 ],
 eight_seeds:[
  {type:'district',id:'gardens'},
  {type:'building',id:'wildlife_refuge'},
 ],
 golden_pattern:[
  {type:'building',id:'house_3b'},
  {type:'building',id:'garage_3b'},
  {type:'building',id:'mode3_studio'},
 ],
 living_fabric:[
  {type:'building',id:'ai_textile_lab'},
  {type:'building',id:'mode3_studio'},
 ],
 lost_wolf_signal:[
  {type:'district',id:'gardens'},
  {type:'npc',id:'evelin_tamm'},
 ],
 broken_record:[
  {type:'secretStep',id:'secret_archive_reverse',step:3},
  {type:'secret',id:'secret_archive_reverse'},
 ],
};

export const isAutoHubMission=(id)=>Object.hasOwn(HUB_MISSION_SIGNAL_RULES,id);

function matches(rule,signal){
 if(!rule||!signal||rule.type!==signal.type)return false;
 if(rule.id!==undefined&&rule.id!==signal.id)return false;
 if(rule.step!==undefined&&rule.step!==signal.step)return false;
 return true;
}

export function applyHubMissionSignal(missions,signal){
 let next=missions,advanced=[];
 for(const [id,rules] of Object.entries(HUB_MISSION_SIGNAL_RULES)){
  const current=next[id];if(current?.status!=='active')continue;
  const rule=rules[current.completedObjectives];if(!matches(rule,signal))continue;
  next=advanceHubMission(next,id,1);advanced.push(id);
 }
 return {missions:next,advanced};
}
