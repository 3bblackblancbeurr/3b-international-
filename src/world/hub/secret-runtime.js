const complete=(hub,id)=>hub?.missions?.[id]?.status==='completed';
const totalTalked=(hub)=>Object.values(hub?.stats?.npcTalks||{}).filter((count)=>count>0).length;
const trainStops=(hub)=>new Set((hub?.stats?.transportStops||[]).filter((id)=>id.startsWith('train:'))).size;

export const HUB_SECRET_IMPLEMENTED = new Set([
 'secret_last_train',
 'secret_rain_symbol',
 'secret_abandoned_quay',
 'secret_lost_station',
 'secret_broken_elevator',
 'secret_workers_names',
 'secret_arena_floor',
 'secret_city_guest',
 'secret_fog_tree',
 'secret_archive_reverse',
 'secret_train_window',
 'secret_roof_signal',
]);

export function hubSecretReady(id,hub,evidence={}){
 if(!HUB_SECRET_IMPLEMENTED.has(id))return false;
 switch(id){
  case 'secret_last_train': return (hub?.stats?.nightTrainDates?.length||0)>=3;
  case 'secret_rain_symbol': return evidence.weather==='heavy_rain'&&(hub?.stats?.districtVisits||[]).includes('commerce');
  case 'secret_abandoned_quay': return complete(hub,'boat_without_flag');
  case 'secret_lost_station': return totalTalked(hub)>=4&&(hub?.stats?.districtVisits||[]).includes('community');
  case 'secret_broken_elevator': return complete(hub,'eight_signals');
  case 'secret_workers_names': return complete(hub,'eight_seeds');
  case 'secret_arena_floor': return complete(hub,'passion_trial');
  case 'secret_city_guest': return complete(hub,'first_foundation')&&totalTalked(hub)>=3;
  case 'secret_fog_tree': return evidence.weather==='fog'&&evidence.night===true&&(hub?.stats?.districtVisits||[]).includes('gardens');
  case 'secret_archive_reverse': return complete(hub,'first_echo');
  case 'secret_train_window': return trainStops(hub)>=8;
  case 'secret_roof_signal': return complete(hub,'rooftops_circle');
  default:return false;
 }
}
