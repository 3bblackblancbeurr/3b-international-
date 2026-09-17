import {GOLD_MASTER_COUNTRY_ORDER,PRODUCTION_COUNTRIES} from './productionCatalog.js';

const ENV_MODULES=Object.freeze(['roads','urban-kit','terrain','vegetation','landmarks','traffic-props','weather','night-lighting']);
const QUALITY=Object.freeze({lodLevels:4,pbr:true,collision:true,streaming:true,targetFps:60});
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

export const PREMIUM_ENVIRONMENT_PACKS=Object.freeze(GOLD_MASTER_COUNTRY_ORDER.map((countryId,index)=>{
 const country=PRODUCTION_COUNTRIES[countryId];
 return Object.freeze({
  order:index+1,countryId,name:country.name,value:country.value,dna:[...country.dna],status:'awaiting-final-art',quality:QUALITY,
  root:`/world/gold-master/${countryId}`,
  modules:Object.fromEntries(ENV_MODULES.map(m=>[m,Object.freeze({id:`${countryId}-${m}`,asset:`/world/gold-master/${countryId}/${m}.glb`,status:'missing'})])),
  cityKits:country.cities.map(([city])=>Object.freeze({city,asset:`/world/gold-master/${countryId}/cities/${slug(city)}.glb`,status:'missing'})),
  acceptance:Object.freeze(['country-identity-without-text','real-pbr-materials','road-collision','lod0-lod3','streaming-cells','weather-hooks','night-readability','60fps-target'])
 });
}));

export function environmentProductionReport(records={}){
 const rows=PREMIUM_ENVIRONMENT_PACKS.map(pack=>{const r=records[pack.countryId]||{};const modules=Object.keys(pack.modules).filter(k=>r.modules?.[k]?.validated===true).length;const cities=pack.cityKits.filter(c=>r.cities?.[c.city]?.validated===true).length;const complete=modules===ENV_MODULES.length&&cities===20&&r.realBuildCapture===true&&r.performance?.fps60Pass===true;return {countryId:pack.countryId,modules,totalModules:ENV_MODULES.length,cities,totalCities:20,complete};});
 return {countries:rows,total:rows.length,complete:rows.filter(x=>x.complete).length,ready:rows.every(x=>x.complete)};
}
