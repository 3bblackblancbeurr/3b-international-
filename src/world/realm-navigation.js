import {COUNTRIES} from './catalog.js';
import {realmTravelItems,realmPositionValid} from './realm-layout.js';
import {toLandscape} from './terrain.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const requireThat=(ok,text)=>{if(!ok)throw Error(text);};
export const realmRelayIdSet=new Set(COUNTRIES.flatMap(c=>realmTravelItems(c.id).map(item=>item.id)));
// This authored clearing is separate from the automatic Hub portal at (0,20).
// It is dry and protected from procedural trees in every country's core.
export const realmCorePosition=region=>toLandscape(region,0,10);
export function realmDiscoveredRelays(save,region=save.region){return(save.adventure?.realmRelays||[]).filter(id=>id.startsWith(region+':'));}
export function realmTravelDestinations(save,region=save.region){
 const discovered=new Set(realmDiscoveredRelays(save,region));
 const relays=realmTravelItems(region).filter(item=>discovered.has(item.id)||item.province===-1||item.id.includes(':province-'));
 return[{id:region+':realm:core',name:'Retour au noyau historique',...realmCorePosition(region),range:6},...relays];
}
export function realmRelayAvailable(save,region,id){return realmTravelDestinations(save,region).some(destination=>destination.id===id);}
export function applyRealmRelayDiscover(save,action){
 const relay=realmTravelItems(save.region).find(item=>item.id===action.id);requireThat(relay,'Relais inconnu dans ce royaume.');
 requireThat(realmPositionValid(save.region,action.position)&&distance(action.position,relay)<=6.5,'Rejoins physiquement ce relais avant de le découvrir.');
 return(save.adventure.realmRelays||[]).includes(relay.id)?null:[...(save.adventure.realmRelays||[]),relay.id];
}
export function applyRealmTravel(save,action){
 const source=realmTravelItems(save.region).find(item=>item.id===action.from)||realmTravelDestinations(save).find(item=>item.id===save.region+':realm:core'&&item.id===action.from);
 requireThat(source&&realmPositionValid(save.region,action.position)&&distance(action.position,source)<=6.5,'Commence le voyage à un relais réel.');
 const destination=realmTravelDestinations(save).find(item=>item.id===action.to);requireThat(destination,'Découvre ce relais sur place avant de l’utiliser.');
 requireThat(realmPositionValid(save.region,destination),'Le point d’arrivée est temporairement inaccessible.');
 const relays=[...new Set([...(save.adventure.realmRelays||[]),...(realmRelayIdSet.has(source.id)?[source.id]:[]),...(realmRelayIdSet.has(destination.id)?[destination.id]:[])])];
 return{realmRelays:relays,realmTravel:{region:save.region,x:destination.x,z:destination.z,nonce:Math.min(1e9,(save.adventure.realmTravel?.nonce||0)+1),to:destination.id}};
}
