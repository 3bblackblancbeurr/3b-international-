export const HUB_MISSION_GRAPH={
 first_steps:{requires:[],next:['first_echo'],optional:[]},
 first_echo:{requires:['first_steps'],next:['eight_signals','broken_record'],optional:['talk:ines_varga']},
 eight_signals:{requires:['first_echo'],next:['wagon_eight'],optional:['visit:broken_circle_tower']},
 broken_record:{requires:['first_echo'],next:['memory_under_water'],optional:[]},
 boat_without_flag:{requires:['first_steps'],next:['memory_under_water'],optional:['transport:boat']},
 storm_rescue:{requires:['boat_without_flag'],next:[],optional:['event:dock_fog']},
 memory_under_water:{requires:['broken_record','boat_without_flag'],next:[],optional:[]},
 wagon_eight:{requires:['eight_signals'],next:[],optional:['transport:train']},
 rooftops_circle:{requires:['first_steps'],next:['passion_trial'],optional:['transport:zipline']},
 passion_trial:{requires:['rooftops_circle'],next:[],optional:[]},
 blue_blackout:{requires:['first_steps'],next:['silent_cable'],optional:['event:power_flicker']},
 silent_cable:{requires:['blue_blackout'],next:[],optional:['transport:telepheric']},
 voices_square:{requires:['first_steps'],next:[],optional:['talk:amira_mansouri','talk:lucia_navaro','talk:soraya_najem']},
 first_foundation:{requires:['first_steps'],next:[],optional:[]},
 garden_listens:{requires:['first_echo'],next:['lost_wolf_signal'],optional:['weather:fog']},
 lost_wolf_signal:{requires:['garden_listens'],next:[],optional:[]},
 eight_seeds:{requires:['first_steps'],next:[],optional:[]},
 three_reflections:{requires:['first_echo'],next:[],optional:['weather:heavy_rain']},
 golden_pattern:{requires:['first_steps'],next:['living_fabric'],optional:[]},
 living_fabric:{requires:['golden_pattern'],next:[],optional:[]},
};

export function hubMissionPrerequisitesMet(id,missions){
 const rule=HUB_MISSION_GRAPH[id];if(!rule)return true;
 return rule.requires.every(req=>missions?.[req]?.status==='completed'&&missions?.[req]?.claimed);
}
export function hubMissionLockReason(id,missions){
 const rule=HUB_MISSION_GRAPH[id];if(!rule)return null;
 const missing=rule.requires.filter(req=>!(missions?.[req]?.status==='completed'&&missions?.[req]?.claimed));
 return missing.length?missing:null;
}
export function hubMissionChainProgress(missions){
 const rows=Object.keys(HUB_MISSION_GRAPH),unlocked=rows.filter(id=>hubMissionPrerequisitesMet(id,missions));
 return {total:rows.length,unlocked:unlocked.length,locked:rows.length-unlocked.length};
}
