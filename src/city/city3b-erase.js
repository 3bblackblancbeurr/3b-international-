import {citySignals} from './city3b-signals.js';
import {cityMapCustomRoads} from './city3b-map.js';
import {cityLandscape,segmentDistance,sameCityPlan} from './city3b-landscape.js';
import {cityNetworks} from './city3b-networks.js';
const names={roads:'Route',rail:'Rails',bridge:'Pont',tunnel:'Tunnel',power:'Électricité',water:'Canalisation',internet:'Internet',lake:'Lac',river:'Rivière',hill:'Montagne',basin:'Creux',tree:'Arbre',garden:'Jardin',bench:'Banc',light:'Éclairage'};
export function cityEraseTargets(data,point){
 if(!point||![point.x,point.z].every(Number.isFinite))return [];
 const buildings=(data.placements||[]).filter(p=>p.placement_state!=='stored'&&point.x>=Number(p.x)&&point.x<=Number(p.x)+Number(p.footprint_w)&&point.z>=Number(p.z)&&point.z<=Number(p.z)+Number(p.footprint_h)).map(p=>({kind:'building',index:p.id,feature:p,distance:0,label:(data.buildings||[]).find(b=>b.code===p.building_code)?.name||'Bâtiment'}));
 const displays=(data.displays||[]).filter(d=>[Number(d.x),Number(d.z)].every(Number.isFinite)).map((d,index)=>({kind:'display',index,feature:{...d,x1:Number(d.x),x2:Number(d.x),z1:Number(d.z),z2:Number(d.z),width:3},distance:Math.hypot(point.x-Number(d.x),point.z-Number(d.z)),label:'Objet exposé'}));
 const signalTargets=citySignals(data).map((s,index)=>({kind:'signals',index,feature:s,distance:Math.hypot(point.x-s.x,point.z-s.z),label:'Feux de circulation'}));
 return [...buildings,...displays,...signalTargets,...[['roads',cityMapCustomRoads(data)],['networks',cityNetworks(data)],['terrain',cityLandscape(data)]].flatMap(([kind,rows])=>rows.map((feature,index)=>({kind,index,feature,distance:segmentDistance(point,feature),label:names[feature.kind]||names[kind]})))].filter(t=>t.distance<=Math.max(2,Number(t.feature.width||t.feature.footprint_w||2)/2)).sort((a,b)=>a.distance-b.distance||Number(a.feature.width||a.feature.footprint_w||2)-Number(b.feature.width||b.feature.footprint_w||2));
}
export function cityErasePlan(data,target){
 if(target?.kind==='building'){const row=(data.placements||[]).find(p=>p.id===target.index&&p.placement_state!=='stored');if(!row||!sameCityPlan(row,target.feature))return null;return {action:'store',from:{x:Number(row.x),z:Number(row.z),rotation:Number(row.rotation)||0},to:null,placement:row.id,body:{placement:row.id}};}
 if(target?.kind==='display'){const display=(data.displays||[]).find(d=>d.item_instance_id===target.feature.item_instance_id);if(!display||Number(display.x)!==target.feature.x1||Number(display.z)!==target.feature.z1)return null;return {action:'remove_display',from:display,to:null,body:{item:display.item_instance_id}};}
 const rows=target?.kind==='signals'?citySignals(data):target?.kind==='roads'?cityMapCustomRoads(data):target?.kind==='networks'?cityNetworks(data):target?.kind==='terrain'?cityLandscape(data):null;
 if(!rows||!rows[target.index]||!sameCityPlan(rows[target.index],target.feature))return null;
 const to=rows.filter((_,i)=>i!==target.index),action=target.kind==='signals'?'plan_signals':target.kind==='roads'?'plan_roads':target.kind==='networks'?'plan_networks':'plan_terrain';
 return {action,from:rows,to,body:target.kind==='roads'?{roads:to,expectedRoads:rows}:{features:to,expected:rows}};
}
