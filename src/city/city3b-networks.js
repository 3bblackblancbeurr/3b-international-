import {segmentDistance,segmentsDistance,cityLandscape,isWater,isRelief,footprintRadius} from './city3b-landscape.js';
import {cityMapBlueprint,cityMapCustomRoads} from './city3b-map.js';
import {cityConstructionState} from './city3b-building-progress.js';
export const CITY_NETWORK_TOOLS=[['road','Route',1],['bridge','Pont',4],['tunnel','Tunnel',5],['rail','Rails',5],['power','Électricité',2],['water','Canalisation',2],['internet','Téléphone / Internet',4]];
export const CITY_NETWORK_COLORS={rail:0xbeb3a0,power:0xe3bf62,water:0x42aeda,internet:0x7b82df,bridge:0xc8b888,tunnel:0x455863};
export function cityNetworks(data={}){return (Array.isArray(data.city?.city?.networks)?data.city.city.networks:[]).filter(r=>r.kind!=='road'&&CITY_NETWORK_TOOLS.some(([k])=>k===r.kind)&&[r.x1,r.z1,r.x2,r.z2,r.width].every(Number.isFinite)).slice(0,128);}
export function cityNetworkCheck(data,features){
 const level=Number(data.city?.city_level)||1;
 for(const f of features){const required=CITY_NETWORK_TOOLS.find(([k])=>k===f.kind)?.[2];if(!required||level<required)return {valid:false,reason:`Disponible au niveau ${required||5}`};
  if(![f.x1,f.z1,f.x2,f.z2,f.width].every(Number.isFinite)||f.width<2||f.width>8)return {valid:false,reason:'Dimensions invalides'};
  if([f.x1,f.z1,f.x2,f.z2].some(v=>Math.abs(v)+f.width/2>cityMapBlueprint(data).half))return {valid:false,reason:'Hors du terrain'};
  if(Math.hypot(f.x2-f.x1,f.z2-f.z1)<(f.kind==='bridge'?12:6))return {valid:false,reason:'Allonge le tracé (pont : 12 m minimum)'};
  if(['rail','bridge'].includes(f.kind)&&(data.placements||[]).some(b=>b.placement_state!=='stored'&&segmentDistance({x:Number(b.x)+Number(b.footprint_w)/2,z:Number(b.z)+Number(b.footprint_h)/2},f)<f.width/2+footprintRadius(b)))return {valid:false,reason:'Ce tracé traverse un bâtiment'};
  if(f.kind==='rail'&&cityLandscape(data).some(r=>(isWater(r)||isRelief(r))&&segmentsDistance(f,r)<f.width/2+r.width/2))return {valid:false,reason:'Les rails nécessitent un terrain libre'};
 }
 return {valid:features.length>0,reason:features.length?'Tracé prêt · valide pour enregistrer':'Choisis deux points'};
}
export function cityOperationalPlacements(data,now=Date.parse(data.serverTime)||Date.now()){
 const definitions=new Map((data.buildings||[]).map(b=>[b.code,b]));
 return (data.placements||[]).filter(p=>p.placement_state!=='stored'&&cityConstructionState(p,now).progress===1).map(p=>({...p,definition:definitions.get(p.building_code)||{},center:{x:Number(p.x)+(Number(p.footprint_w)||1)/2,z:Number(p.z)+(Number(p.footprint_h)||1)/2}}));
}
export function cityRailRoutes(data){
 if(!data.life?.available||!data.life.population)return [];
 const rails=cityNetworks(data).filter(n=>n.kind==='rail'),stations=cityOperationalPlacements(data).filter(p=>p.definition.metadata?.service==='rail'||p.building_code==='TRAM_STATION_3B');
 // Endpoint graph; branches are traversed, disconnected tracks never spawn trains.
 const nodes=[],edges=[],node=p=>{let i=nodes.findIndex(q=>Math.hypot(q.x-p.x,q.z-p.z)<.01);if(i<0){i=nodes.length;nodes.push(p);edges.push([]);}return i;};
 const cuts=rails.map(()=>[0,1]);
 for(let i=0;i<rails.length;i++)for(let j=i+1;j<rails.length;j++){
  const a=rails[i],b=rails[j],dx=a.x2-a.x1,dz=a.z2-a.z1,ex=b.x2-b.x1,ez=b.z2-b.z1,det=dx*ez-dz*ex;
  if(Math.abs(det)<.0001)continue;const rx=b.x1-a.x1,rz=b.z1-a.z1,t=(rx*ez-rz*ex)/det,u=(rx*dz-rz*dx)/det;
  if(t>=0&&t<=1&&u>=0&&u<=1){cuts[i].push(t);cuts[j].push(u);}
 }
 const served=[];for(const station of stations){let best=null;for(let i=0;i<rails.length;i++){
  const r=rails[i],dx=r.x2-r.x1,dz=r.z2-r.z1,l=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((station.center.x-r.x1)*dx+(station.center.z-r.z1)*dz)/l)),point={x:r.x1+dx*t,z:r.z1+dz*t},distance=Math.hypot(station.center.x-point.x,station.center.z-point.z);
  if(!best||distance<best.distance)best={i,t,point,distance};
 }if(best&&best.distance<=12){cuts[best.i].push(best.t);served.push({...station,node:{i:node(best.point)}});}}
 for(let i=0;i<rails.length;i++){const r=rails[i],list=[...new Set(cuts[i])].sort((a,b)=>a-b).map(t=>node({x:r.x1+(r.x2-r.x1)*t,z:r.z1+(r.z2-r.z1)*t}));for(let k=1;k<list.length;k++){edges[list[k-1]].push(list[k]);edges[list[k]].push(list[k-1]);}}
 const routes=[];for(let i=0;i<served.length&&routes.length<3;i++)for(let j=i+1;j<served.length&&routes.length<3;j++){
  const from=served[i].node.i,to=served[j].node.i;if(from===to)continue;const queue=[[from]],seen=new Set([from]);let found=null;
  while(queue.length){const route=queue.shift(),tail=route.at(-1);if(tail===to){found=route;break;}for(const next of edges[tail])if(!seen.has(next)){seen.add(next);queue.push([...route,next]);}}
  if(found)routes.push({id:'train-'+routes.length,path:found.map(i=>nodes[i]),duration:Math.max(12,found.slice(1).reduce((s,id,k)=>s+Math.hypot(nodes[id].x-nodes[found[k]].x,nodes[id].z-nodes[found[k]].z),0)/3),delay:routes.length*4});
 }return routes;
}
export function cityRoadNetwork(data){return [...cityMapCustomRoads(data),...cityNetworks(data).filter(n=>['bridge','tunnel'].includes(n.kind))];}
