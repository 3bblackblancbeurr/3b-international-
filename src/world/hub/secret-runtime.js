const progress=(hub,id)=>hub?.stats?.secretProgress?.[id]||[];

export const HUB_SECRET_IMPLEMENTED = new Set([
 'secret_last_train',
 'secret_three_lights',
 'secret_rain_symbol',
 'secret_workers_names',
 'secret_lost_station',
 'secret_broken_elevator',
 'secret_fog_tree',
 'secret_archive_reverse',
]);

export const HUB_SECRET_ORDER={
 secret_three_lights:[0,1,2],
 secret_archive_reverse:[3,2,1,0],
};

export function hubSecretReady(id,hub,evidence={}){
 if(!HUB_SECRET_IMPLEMENTED.has(id))return false;
 switch(id){
  case 'secret_last_train': return (hub?.stats?.nightTrainDates?.length||0)>=3;
  case 'secret_three_lights': return progress(hub,id).length===3;
  case 'secret_rain_symbol': return evidence.weather==='heavy_rain'&&progress(hub,id).length===3;
  case 'secret_workers_names': return progress(hub,id).length===8;
  case 'secret_lost_station': return progress(hub,id).length===4;
  case 'secret_broken_elevator': return progress(hub,id).length===1;
  case 'secret_fog_tree': return evidence.weather==='fog'&&evidence.night===true&&(hub?.stats?.districtVisits||[]).includes('gardens');
  case 'secret_archive_reverse': return progress(hub,id).length===4;
  default:return false;
 }
}

export function nextHubSecretStep(id,hub){
 const done=progress(hub,id),order=HUB_SECRET_ORDER[id];
 if(order)return order[done.length]??null;
 return done.length;
}
