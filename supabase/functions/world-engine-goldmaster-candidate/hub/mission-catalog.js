export const HUB_MISSIONS = [
  ['first_steps','minor',3],['first_echo','major',3],['eight_signals','major',2],['rooftops_circle','normal',3],
  ['boat_without_flag','normal',2],['storm_rescue','normal',3],['memory_under_water','major',3],['wagon_eight','major',3],
  ['blue_blackout','normal',2],['garden_listens','normal',3],['first_foundation','normal',3],['voices_square','normal',3],
  ['passion_trial','major',2],['silent_cable','normal',3],['three_reflections','normal',2],['eight_seeds','minor',2],
  ['golden_pattern','minor',3],['living_fabric','normal',2],['lost_wolf_signal','major',2],['broken_record','normal',2],
].map(([id,importance,objectiveCount])=>({id,importance,objectiveCount}));

export const HUB_MISSION_BY_ID = Object.fromEntries(HUB_MISSIONS.map((mission)=>[mission.id,mission]));

export function hubMissionReward(mission){
  if(!mission)return {xp:0,shards:0};
  if(mission.importance==='major')return {xp:120,shards:30};
  if(mission.importance==='minor')return {xp:40,shards:10};
  return {xp:70,shards:18};
}
