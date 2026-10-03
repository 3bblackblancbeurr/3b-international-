import {cityMapCustomRoads} from './city3b-map.js';
import {cityLandscape,segmentDistance,sameCityPlan} from './city3b-landscape.js';
import {cityNetworks} from './city3b-networks.js';
const names={roads:'Route',rail:'Rails',bridge:'Pont',tunnel:'Tunnel',power:'Électricité',water:'Canalisation',internet:'Internet',lake:'Lac',river:'Rivière',hill:'Montagne',basin:'Creux',tree:'Arbre',garden:'Jardin',bench:'Banc',light:'Éclairage'};
export function cityEraseTargets(data,point){
 if(!point||![point.x,point.z].every(Number.isFinite))return [];
 const displays=(data.displays||[]).filter(d=>[Number(d.x),Number(d.z)].every(Number.isFinite)).map((d,index)=>({kind:'display',index,feature:{...d,x1:Number(d.x),x2:Number(d.x),z1:Number(d.z),z2:Number(d.z),width:3},distance:Math.hypot(point.x-Number(d.x),point.z-Number(d.z)),label:'Objet exposé'}));
 return [...displays,...[['roads',cityMapCustomRoads(data)],['networks',cityNetworks(data)],['terrain',cityLandscape(data)]].flatMap(([kind,rows])=>rows.map((feature,index)=>({kind,index,feature,distance:segmentDistance(point,feature),label:names[feature.kind]||names[kind]})))].filter(t=>t.distance<=Math.max(2,t.feature.width/2)).sort((a,b)=>a.distance-b.distance||a.feature.width-b.feature.width);
}
export function cityErasePlan(data,target){
 if(target?.kind==='display'){const display=(data.displays||[]).find(d=>d.item_instance_id===target.feature.item_instance_id);if(!display||Number(display.x)!==target.feature.x1||Number(display.z)!==target.feature.z1)return null;return {action:'remove_display',from:display,to:null,body:{item:display.item_instance_id}};}
 const rows=target?.kind==='roads'?cityMapCustomRoads(data):target?.kind==='networks'?cityNetworks(data):target?.kind==='terrain'?cityLandscape(data):null;
 if(!rows||!rows[target.index]||!sameCityPlan(rows[target.index],target.feature))return null;
 const to=rows.filter((_,i)=>i!==target.index),action=target.kind==='roads'?'plan_roads':target.kind==='networks'?'plan_networks':'plan_terrain';
 return {action,from:rows,to,body:target.kind==='roads'?{roads:to,expectedRoads:rows}:{features:to,expected:rows}};
}
