const EVENT_NAMES={
 market_night:'Marché de nuit',
 heavy_rain_echo:'Écho sous la pluie',
 train_breakdown:'Incident du 3B Express',
 guardian_projection:'Projection d’un Gardien',
 dock_fog:'Brume des Docks',
 arena_public_challenge:'Défi public de l’Arène',
 power_flicker:'Panne bleue',
 memory_walk:'Marche de la Mémoire',
 city_showcase:'Vitrine des Villes 3B',
 workers_ceremony:'Cérémonie des Ouvriers'
};

const dayKey=date=>Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);

export function evaluateHubEvents(events,{date=new Date(),progress={}}={}){
  const hour=date.getHours(),day=date.getDay(),key=dayKey(date),completed=progress.completed?.length||0;
  return events.map(event=>{
    let active=false,reason='';
    if(event.trigger==='evening'){active=hour>=18&&hour<23;reason='soirée';}
    else if(event.trigger==='night'){active=hour>=20||hour<5;reason='nuit';}
    else if(event.trigger==='daily'){active=(key%3)===0;reason='rotation quotidienne';}
    else if(event.trigger==='weekly'){active=day===6||day===0;reason='week-end';}
    else if(event.trigger==='story_progress'){active=completed>=1;reason='progression';}
    else if(event.trigger==='story_flag'){active=completed>=3;reason='progression avancée';}
    else if(event.trigger==='random_safe'){active=(key%5)===2;reason='rotation sûre';}
    else if(String(event.trigger).startsWith('weather:')){active=false;reason='météo runtime non branchée';}
    return {...event,name:EVENT_NAMES[event.id]||event.id.replaceAll('_',' '),active,reason};
  }).filter(e=>e.active);
}

export function deriveHubSecrets(secrets,progress={}){
  const completed=new Set(progress.completed||[]),found=new Set(progress.secrets||[]);
  const unlocked=[];
  const unlock=id=>{const secret=secrets.find(s=>s.id===id);if(secret&&!found.has(id)){found.add(id);unlocked.push(secret);}};
  if(completed.has('boat_without_flag'))unlock('secret_abandoned_quay');
  return {ids:[...found],unlocked};
}

export function eventForDistrict(activeEvents,district){
  return activeEvents.find(e=>e.district===district)||null;
}
