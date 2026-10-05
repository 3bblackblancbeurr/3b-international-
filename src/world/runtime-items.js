import {landscapeItems} from './terrain.js';
import {hubRuntime} from './hub/runtime-data.js';
import hubPlan from './hub/data/hub-master-plan-v2.json' with {type:'json'};
import {hubPublicPlaces} from './hub/platform-life.js';
import {HUB_SCALE} from './hub/platform-layout.js';
import {platformRuntimeItems} from './hub/platform-layout.js';
import {hubReferenceLandmarkItems} from './hub/reference-landmarks.js';

export function worldRuntimeItems(region,save,context={}){
 const base=landscapeItems(region,save);
 if(region!=='hub')return base;
 const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory):0;
 const desktop=typeof window!=='undefined'&&window.innerWidth>=1100&&memory>=8;
 const high=memory>=8;
 const hub=hubRuntime(desktop?'desktop':high?'mobileHigh':'mobileMedium',{
  ...context,
  storyProgress:(save.seals?.length||0)>0,
  storyFlag:!!save.adventure?.finished,
  hubState:save.hub,
  seals:save.seals||[],
  restoredRegions:Object.entries(save.adventure?.chapters||{}).filter(([,chapter])=>chapter?.restored===3).map(([id])=>id),
 }).items;
 const creatures=[
  {id:'hub:creature:refuge',type:'hubCreature',kind:'creature',district:'gardens',card:'C166',x:-52*HUB_SCALE,z:105*HUB_SCALE,name:'Esprit du refuge',detail:'Cette créature de résonance est protégée par les habitants. Les créatures ne sont pas toutes des ennemies : observe leur posture et écoute le refuge avant de choisir un compagnon. Ici, aucun combat ni récompense de royaume ne se déclenche.',range:5},
  {id:'hub:creature:arena',type:'hubCreature',kind:'creature',district:'arena',card:'C171',x:66*HUB_SCALE,z:-57*HUB_SCALE,name:'Projection du défi',detail:'Une projection de créature prépare les voyageurs aux rencontres avec l’Oubli. La cité reste une zone sûre. Rejoins l’entrée de l’Arène pour accéder aux entraînements et aux duels existants.',range:5},
 ];
 return [...platformRuntimeItems(base,hub,hubPlan),...hubPublicPlaces(),...hubReferenceLandmarkItems(),...creatures];
}
