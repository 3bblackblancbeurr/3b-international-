import {municipalLevelProgress} from './city3b-progression.js';
import {cityGridPoint} from './city3b-grid-snap.js';
import {cityMapBlueprint, cityMapPlacementPolicy, cityBuildingKind} from './city3b-map.js';

export const CITY_BUILD_CATEGORIES = [
  ['all', 'Tout'], ['housing', 'Logements'], ['commerce', 'Commerces'],
  ['civic', 'Services'], ['mobility', 'Transports'], ['green', 'Parcs'], ['culture', 'Culture & loisirs'], ['landmark', 'Monuments'],
];
export function cityFootprint(definition, rotation = 0, placement) {
  // Existing placements keep their saved footprint even when the catalogue evolves.
  const raw = placement ? {w:placement.footprint_w,h:placement.footprint_h} : definition?.footprint || {};
  let width = Math.max(1, Number(raw.w ?? raw.width) || 1);
  let height = Math.max(1, Number(raw.h ?? raw.height) || 1);
  const quarter = value => ((Math.round((Number(value)||0)/90)%4)+4)%4%2;
  if (quarter(rotation) !== (placement ? quarter(placement.rotation) : 0)) [width,height]=[height,width];
  return {width,height};
}
export function cityPlacementCheck(data, point, size, ignoreId) {
  if (![point?.x,point?.z,size?.width,size?.height].every(Number.isFinite)) return {valid:false,reason:'Coordonnées invalides'};
  const policy=cityMapPlacementPolicy(data,point,size);
  if(!policy.valid)return policy;
  const hit=(data.placements||[]).some(row=>row.id!==ignoreId&&row.placement_state!=='stored'
    &&point.x<Number(row.x)+Number(row.footprint_w||1)&&point.x+size.width>Number(row.x)
    &&point.z<Number(row.z)+Number(row.footprint_h||1)&&point.z+size.height>Number(row.z));
  return hit?{valid:false,reason:'Parcelle occupée'}:policy;
}
export function citySuggestedParcel(data, definition, near={x:0,z:0}) {
  const size=cityFootprint(definition),half=cityMapBlueprint(data).half;
  // Search a bounded spiral, independent of rendered pixel positions.
  for(let radius=4;radius<=Math.min(80,half);radius+=2) {
    for(let x=-radius;x<=radius;x+=2)for(const z of [-radius,radius]) {
      const p=cityGridPoint({x:near.x+x,z:near.z+z});
      if(cityPlacementCheck(data,p,size).valid)return p;
    }
    for(let z=-radius+2;z<radius;z+=2)for(const x of [-radius,radius]) {
      const p=cityGridPoint({x:near.x+x,z:near.z+z});
      if(cityPlacementCheck(data,p,size).valid)return p;
    }
  }
  return {x:0,z:0};
}
export function cityCatalogue(data, {query='',category='all',availableOnly=true}={}) {
  const text=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const level=Number(data.city?.city_level)||1;
  return (data.buildings||[]).filter(row=>row.code!=='ROAD_MATRIX').filter(row=>(category==='all'||(category==='culture'?['culture','sport'].includes(row.category):cityBuildingKind(row)===category))
    &&(!availableOnly||Number(row.unlock_level||1)<=level)
    &&`${row.name} ${row.code}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(text))
    .sort((a,b)=>Number(!!a.metadata?.mega)-Number(!!b.metadata?.mega)||Number(a.unlock_level)-Number(b.unlock_level)||Number(a.cost_coins)-Number(b.cost_coins));
}
export function cityLevelProgress(xp=0,curve='legacy') {
  if(curve==='municipal-v2')return municipalLevelProgress(xp);
  // Mirrors the server's independent City XP curve.
  const value=Math.max(0,Number(xp)||0),level=Math.min(50,Math.floor(value/1000)+1);
  const floor=1000*(level-1),next=1000*level;
  return {level,current:value,next,percent:level===50?100:Math.min(100,(value-floor)/(next-floor)*100)};
}

export function cityBuildingLimit(data={},definition,ignoreId){
 const maximum=definition?.code==='CITY_HALL_3B'?1:Number(definition?.metadata?.max_per_city)||0;
 const count=(data.placements||[]).filter(p=>p.building_code===definition?.code&&p.id!==ignoreId).length;
 return maximum&&count>=maximum?{valid:false,reason:definition?.code==='CITY_HALL_3B'?'Ta ville possède déjà sa mairie. Déplace-la ou replace-la depuis la réserve.':`Limite de ${maximum} bâtiment(s) par ville`}:{valid:true};
}

// Stored buildings are owned objects: reuse them rather than buying another instance.
export function cityStoredBuilding(data={},definition){
 return (data.placements||[]).find(p=>p.building_code===definition?.code&&p.placement_state==='stored')||null;
}
