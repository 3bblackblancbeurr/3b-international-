const progress=(hub,id)=>hub?.stats?.secretProgress?.[id]||[];

export const HUB_SECRET_IMPLEMENTED = new Set([
 'secret_last_train','secret_waterfall_door','secret_three_lights','secret_rain_symbol',
 'secret_silent_cabin','secret_roof_signal','secret_abandoned_quay','secret_workers_names',
 'secret_lost_station','secret_broken_elevator','secret_arena_floor','secret_market_code',
 'secret_city_guest','secret_fog_tree','secret_archive_reverse','secret_train_window',
]);

export const HUB_SECRET_ORDER={
 secret_three_lights:[0,1,2],
 secret_archive_reverse:[3,2,1,0],
};

export function hubSecretReady(id,hub,evidence={}){
 if(!HUB_SECRET_IMPLEMENTED.has(id))return false;
 switch(id){
  case 'secret_last_train': return (hub?.stats?.nightTrainDates?.length||0)>=3;
  case 'secret_waterfall_door': return (hub?.stats?.districtVisits||[]).includes('gardens')&&(hub?.stats?.transportRides?.telepheric||0)>=1;
  case 'secret_three_lights': return progress(hub,id).length===3;
  case 'secret_rain_symbol': return evidence.weather==='heavy_rain'&&progress(hub,id).length===3;
  case 'secret_silent_cabin': return (hub?.stats?.transportRides?.telepheric||0)>=3;
  case 'secret_roof_signal': return (hub?.stats?.transportRides?.zipline||0)>=2&&(hub?.stats?.districtVisits||[]).includes('arena');
  case 'secret_abandoned_quay': return (hub?.stats?.transportRides?.boat||0)>=1&&(hub?.stats?.districtVisits||[]).includes('docks');
  case 'secret_workers_names': return progress(hub,id).length===8;
  case 'secret_lost_station': return progress(hub,id).length===4;
  case 'secret_broken_elevator': return progress(hub,id).length===1;
  case 'secret_arena_floor': return (hub?.stats?.buildingVisits||[]).includes('arena_3b')&&(hub?.stats?.districtVisits||[]).includes('arena');
  case 'secret_market_code': return (hub?.stats?.districtVisits||[]).includes('commerce')&&(hub?.stats?.npcTalks?.omar_el_fassi||0)>=1;
  case 'secret_city_guest': return (hub?.stats?.buildingVisits||[]).includes('city_gallery')&&(hub?.stats?.npcTalks?.elio_romano||0)>=1;
  case 'secret_fog_tree': return evidence.weather==='fog'&&evidence.night===true&&(hub?.stats?.districtVisits||[]).includes('gardens');
  case 'secret_archive_reverse': return progress(hub,id).length===4;
  case 'secret_train_window': return (hub?.stats?.transportRides?.train||0)>=4;
  default:return false;
 }
}

export function nextHubSecretStep(id,hub){
 const done=progress(hub,id),order=HUB_SECRET_ORDER[id];
 if(order)return order[done.length]??null;
 return done.length;
}

export function hubSecretStepAllowed(id,hub,step,count){
 const done=progress(hub,id);
 if(!Number.isInteger(step)||step<0||step>=count||done.includes(step))return false;
 const order=HUB_SECRET_ORDER[id];
 return order?step===order[done.length]:true;
}
