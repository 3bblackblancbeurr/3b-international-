import {HUB_MISSION_BY_ID} from './hub/mission-catalog.js';

const has=(list,value)=>Array.isArray(list)&&list.includes(value);
const claimed=(save,id)=>!!save?.hub?.missions?.[id]?.claimed;

export function worldGlobalRewardIntents(before,after,action){
 const intents=[];
 if(!before||!after||!action?.type)return intents;
 const push=(rewardCode,eventId,source='world')=>intents.push({rewardCode,eventId,source});

 if(action.type==='visit'&&action.region&&action.region!=='hub'&&!has(before.visited,action.region)&&has(after.visited,action.region)){
  push('country_entry','country:'+action.region);
 }

 if(action.type==='hubMissionClaim'&&action.id&&!claimed(before,action.id)&&claimed(after,action.id)){
  const mission=HUB_MISSION_BY_ID[action.id];
  push(mission?.importance==='major'?'mission_main':'mission_side','hub_mission:'+action.id,'hub');
 }

 if(action.type==='hubEventDiscover'&&action.id&&!has(before?.hub?.events,action.id)&&has(after?.hub?.events,action.id)){
  push('city_event','hub_event:'+action.id,'hub');
 }

 if(action.type==='hubSecretUnlock'&&action.id&&!has(before?.hub?.secrets,action.id)&&has(after?.hub?.secrets,action.id)){
  push('world_secret','hub_secret:'+action.id,'hub');
 }

 if(action.type==='beacon'&&action.id&&!has(before.beacons,action.id)&&has(after.beacons,action.id)){
  push('world_memory','memory:'+action.id);
 }

 if(action.type==='survey'&&action.id){
  const key=before.region+':'+action.id;
  if(!has(before?.adventure?.discoveries,key)&&has(after?.adventure?.discoveries,key))push('world_zone','zone:'+key);
 }

 if(action.type==='battle'||action.type==='field'){
  const previous=before?.adventure?.encounter,now=after?.adventure?.encounter;
  if(previous&&!previous.result&&now?.result==='victory'&&now?.rewarded){
   if(previous.final)push('world_final','final:union-v1');
   else if(previous.boss&&!previous.patrol&&previous.region)push('guardian','guardian:'+previous.region);
  }
 }

 return intents;
}
