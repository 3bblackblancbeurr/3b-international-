import {advanceHubMission} from './mission-runtime.js';
import {HUB_DISTRICT_SET,HUB_NPC_SET,HUB_TRANSIT_SET} from './interaction-catalog.js';

const step=(hub,id,condition)=>{
 const current=hub.missions[id];
 if(!condition||current?.status!=='active')return hub;
 return {...hub,missions:advanceHubMission(hub.missions,id,1)};
};

export function recordHubDistrict(hub,id){
 if(!HUB_DISTRICT_SET.has(id))throw Error('Quartier Hub inconnu.');
 const first=!hub.districts.includes(id),districts=first?[...hub.districts,id]:hub.districts;
 let next={...hub,districts};
 const firstSteps=next.missions.first_steps;
 next=step(next,'first_steps',id==='heritage_square'&&(firstSteps?.completedObjectives===0||firstSteps?.completedObjectives===2));
 next=step(next,'first_echo',id==='archives'&&next.missions.first_echo?.completedObjectives===1);
 next=step(next,'rooftops_circle',id==='arena'&&next.missions.rooftops_circle?.completedObjectives===0);
 next=step(next,'rooftops_circle',id==='broken_circle_tower'&&next.missions.rooftops_circle?.completedObjectives===2);
 return next;
}

export function recordHubNpc(hub,id){
 if(!HUB_NPC_SET.has(id))throw Error('Personnage Hub inconnu.');
 const npcs=hub.npcs.includes(id)?hub.npcs:[...hub.npcs,id];
 let next={...hub,npcs};
 next=step(next,'first_echo',id==='ines_varga'&&next.missions.first_echo?.completedObjectives===0);
 return next;
}

export function recordHubTransit(hub,id){
 if(!HUB_TRANSIT_SET.has(id))throw Error('Transport Hub inconnu.');
 const transits=hub.transits.includes(id)?hub.transits:[...hub.transits,id];
 let next={...hub,transits};
 next=step(next,'first_steps',id.startsWith('train:')&&next.missions.first_steps?.completedObjectives===1);
 next=step(next,'boat_without_flag',id.startsWith('boat:')&&next.missions.boat_without_flag?.completedObjectives===0);
 if(next.missions.rooftops_circle?.completedObjectives===1){
   const used=transits.filter((value)=>value.startsWith('zipline:'));
   if(new Set(used).size>=2)next=step(next,'rooftops_circle',true);
 }
 return next;
}

export function recordHubEvent(hub,id){
 let next=hub;
 next=step(next,'first_echo',id==='guardian_projection'&&next.missions.first_echo?.completedObjectives===2);
 return next;
}

export function recordHubSecret(hub,id){
 let next=hub;
 next=step(next,'first_echo',id==='secret_archive_reverse'&&next.missions.first_echo?.completedObjectives===2);
 next=step(next,'boat_without_flag',id==='secret_abandoned_quay'&&next.missions.boat_without_flag?.completedObjectives===1);
 return next;
}
