import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
  HUB_METROPOLIS,
  buildMetropolisRuntimeItems,
  hubDistrictPosition,
  hubCountryGatePosition,
} from '../src/world/hub/metropolis.js';

const root=resolve(new URL('..',import.meta.url).pathname);
const readJson=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const writeJson=(path,value)=>writeFileSync(resolve(root,path),JSON.stringify(value,null,2)+'\n');
const planPath='src/world/hub/data/hub-master-plan-v2.json';
const plan=readJson(planPath);
const runtime=buildMetropolisRuntimeItems(plan,'desktop',{restoredRegions:[]});
const cm=value=>Math.round(Number(value||0)*100);
const point=p=>({x:cm(p.x),y:cm(p.z),z:0});

const districts=plan.districts.map(district=>({
 id:district.id,
 name:district.name,
 location_cm:point(hubDistrictPosition(plan,district.id)),
 tier:district.tier||0,
 kind:district.kind,
 purpose:district.purpose,
}));

const buildingById=Object.fromEntries(plan.buildings.map(building=>[building.id,building]));
const buildings=runtime.items.filter(item=>item.type==='hubBuilding').map(item=>{
 const source=buildingById[item.buildingId];
 return {
  id:item.buildingId,
  name:item.name,
  district:item.district,
  location_cm:point({x:item.buildingX,z:item.buildingZ}),
  entrance_cm:point(item),
  footprint_cm:{x:cm(item.width),y:cm(item.depth),z:cm(item.height)},
  tier:item.tier||0,
  interior:source?.interior||item.interior||'none',
  functions:source?.functions||item.functions||[],
 };
});

const gates=plan.countries.map(country=>{
 const p=hubCountryGatePosition(plan,country.region||country.code);
 return {
  id:country.region,
  name:country.country,
  code:country.code,
  value:country.value,
  guardian:country.guardian,
  district:country.gateDistrict,
  color:country.color,
  location_cm:point(p),
 };
});

const roads=runtime.items.filter(item=>item.type==='hubRoad').map(item=>({
 id:String(item.id).replace(/^hub:road:/,''),
 kind:item.kind,
 width_cm:cm(item.width),
 from_cm:point(item.from),
 to_cm:point(item.to),
}));

const layout={
 version:'3.0.0',
 coordinate_system:'Unreal centimeters; X/Y horizontal, Z vertical',
 source:'La Cité des Huit Héritages · Gold Master 2026-09-24',
 visual_reference:plan.visualReference,
 world:{
  width_cm:HUB_METROPOLIS.width*100,
  depth_cm:HUB_METROPOLIS.depth*100,
  radius_cm:HUB_METROPOLIS.radius*100,
  cell_target_cm:HUB_METROPOLIS.cellSize*100,
  safe_hub:true,
 },
 districts,
 buildings,
 gates,
 roads,
 validation:{
  districts:districts.length,
  buildings:buildings.length,
  gates:gates.length,
  roads:roads.length,
  minimum_outer_gate_radius_cm:50000,
 },
};

const transport={
 version:'2.0.0',
 source:'hub-master-plan-v2.json · Gold Master 2026-09-24',
 train:{
  ...plan.transport.train,
  stations:plan.transport.train.stations.map((id,index)=>({id,index,location_cm:point(hubDistrictPosition(plan,id))})),
 },
 boats:{
  ...plan.transport.boats,
  stops:plan.transport.boats.stops.map((id,index)=>({id,index,location_cm:point(hubDistrictPosition(plan,id))})),
 },
 telepherics:plan.transport.telepherics.lines.map(line=>({
  ...line,
  from_cm:point(hubDistrictPosition(plan,line.from)),
  to_cm:point(hubDistrictPosition(plan,line.to)),
 })),
 ziplines:plan.transport.ziplines.lines.map(line=>({
  ...line,
  from_cm:point(hubDistrictPosition(plan,line.from)),
  to_cm:point(hubDistrictPosition(plan,line.to)),
 })),
};

writeFileSync(
 resolve(root,'unreal/ThreeBWorld/Data/Canonical/hub-master-plan-v2.json'),
 readFileSync(resolve(root,planPath)),
);
writeJson('unreal/ThreeBWorld/Data/Production/world-layout-unreal.json',layout);
writeJson('unreal/ThreeBWorld/Data/Production/transport-network-unreal.json',transport);

console.log(
 `Hub Unreal exporté: ${districts.length} quartiers, ${buildings.length} bâtiments, ${gates.length} Portes, ${roads.length} axes.`
);
