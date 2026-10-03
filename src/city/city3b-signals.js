import {cityTrafficJunctions} from './city3b-traffic.js';
import {cityMapCustomRoads} from './city3b-map.js';
export const CITY_SIGNAL_LEVEL=3;
export const citySignals=data=>Array.isArray(data?.city?.city?.signals)?data.city.city.signals.slice(0,64):[];
export function citySignalTarget(data,point){
 if(Number(data.city?.city_level||1)<CITY_SIGNAL_LEVEL)return {valid:false,reason:'Feux débloqués au niveau 3.'};
 const nodes=cityTrafficJunctions(cityMapCustomRoads(data));
 const node=nodes.map(n=>({...n,distance:Math.hypot(point.x-n.x,point.z-n.z)})).sort((a,b)=>a.distance-b.distance)[0];
 if(!node||node.distance>6)return {valid:false,reason:'Touche un carrefour de routes. Pas de feu sur une autoroute ou un chemin piéton.'};
 const existing=citySignals(data).find(s=>Math.hypot(s.x-node.x,s.z-node.z)<1);
 if(!existing&&citySignals(data).length>=64)return {valid:false,reason:'64 carrefours déjà équipés. Retire un ancien feu.'};
 return {valid:true,node,existing,reason:existing?'Régler ce carrefour':'Installer des feux à ce carrefour'};
}
