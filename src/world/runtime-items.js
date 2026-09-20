import {landscapeItems} from './terrain.js';
import {hubRuntime} from './hub/runtime-data.js';

export function worldRuntimeItems(region,save){
 const base=landscapeItems(region,save);
 if(region!=='hub')return base;
 const memory=typeof navigator!=='undefined'?Number(navigator.deviceMemory):0;
 const desktop=typeof window!=='undefined'&&window.innerWidth>=1100&&memory>=8;
 const high=memory>=8;
 const hub=hubRuntime(desktop?'desktop':high?'mobileHigh':'mobileMedium',{
  storyProgress:(save.seals?.length||0)>0,
  storyFlag:!!save.adventure?.finished,
  hubState:save.hub,
  seals:save.seals||[],
  restoredRegions:Object.entries(save.adventure?.chapters||{}).filter(([,chapter])=>chapter?.restored===3).map(([id])=>id),
 }).items;
 return [...base,...hub];
}
