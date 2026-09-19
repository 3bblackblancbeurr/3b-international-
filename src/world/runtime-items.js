import {landscapeItems} from './terrain.js';
import {hubRuntime} from './hub/runtime-data.js';

export function worldRuntimeItems(region,save){
 const base=landscapeItems(region,save);
 if(region!=='hub')return base;
 const high=typeof navigator!=='undefined'&&Number(navigator.deviceMemory)>=8;
 const hub=hubRuntime(high?'mobileHigh':'mobileMedium',{
  storyProgress:(save.seals?.length||0)>0,
  storyFlag:!!save.adventure?.finished,
  hubState:save.hub,
  seals:save.seals||[],
  restoredRegions:Object.entries(save.adventure?.chapters||{}).filter(([,chapter])=>chapter?.restored===3).map(([id])=>id),
 }).items;
 return [...base,...hub];
}
