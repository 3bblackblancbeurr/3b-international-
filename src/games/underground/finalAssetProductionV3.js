import {GOLD_MASTER_COUNTRY_ORDER,PRODUCTION_COUNTRIES} from './productionCatalog.js';
import {ALL_POLICE_VEHICLE_SPECS} from './policeVehicleSpec.js';
import {PREMIUM_ENVIRONMENT_PACKS} from './environmentAssetManifestV3.js';

const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export const FINAL_GOLD_MASTER_SLOTS=Object.freeze(GOLD_MASTER_COUNTRY_ORDER.flatMap(countryId=>PRODUCTION_COUNTRIES[countryId].cities.map(([city,family,model,silhouette,tuning,...materials],index)=>Object.freeze({type:'gold-master',countryId,city,vehicleId:`u3b-gm-${countryId}-${slug(city)}`,name:`3B ${family} ${model}`,order:index+1,silhouette,tuning,materials,required:['model','collision','cockpit','lod0','lod1','lod2','lod3','baseColor','normal','roughness','metallic','tuningParts','realBuildCapture','fps60','qa'],status:'awaiting-3d'}))));
export const FINAL_POLICE_SLOTS=Object.freeze(ALL_POLICE_VEHICLE_SPECS.map((v,index)=>Object.freeze({...v,type:'police-asset',order:index+1,required:['model','collision','lod0','lod1','lod2','lod3','pbr','emergencyLights','damageStates','realBuildCapture','fps60','qa'],status:'awaiting-3d'})));
export const FINAL_ENVIRONMENT_SLOTS=PREMIUM_ENVIRONMENT_PACKS;

const done=r=>r?.validated===true&&r?.realAsset===true&&r?.realBuildCapture===true&&r?.fps60Pass===true&&r?.qaPass===true;
export function finalAssetProductionReport(records={}){
 const goldDone=FINAL_GOLD_MASTER_SLOTS.filter(x=>done(records.vehicles?.[x.vehicleId])).length;
 const policeDone=FINAL_POLICE_SLOTS.filter(x=>done(records.police?.[x.id])).length;
 const envDone=FINAL_ENVIRONMENT_SLOTS.filter(x=>records.environments?.[x.countryId]?.validated===true&&records.environments?.[x.countryId]?.realBuildCapture===true&&records.environments?.[x.countryId]?.fps60Pass===true).length;
 return {goldMasters:{done:goldDone,total:160},police:{done:policeDone,total:40},environments:{done:envDone,total:8},complete:goldDone===160&&policeDone===40&&envDone===8};
}
export function nextFinalAssetTask(records={}){
 for(const countryId of GOLD_MASTER_COUNTRY_ORDER){for(const v of FINAL_GOLD_MASTER_SLOTS.filter(x=>x.countryId===countryId))if(!done(records.vehicles?.[v.vehicleId]))return {kind:'gold-master',countryId,id:v.vehicleId,name:v.name};}
 for(const p of FINAL_POLICE_SLOTS)if(!done(records.police?.[p.id]))return {kind:'police',countryId:p.countryId,id:p.id,name:p.type};
 for(const e of FINAL_ENVIRONMENT_SLOTS)if(records.environments?.[e.countryId]?.validated!==true)return {kind:'environment',countryId:e.countryId,id:e.countryId,name:e.name};
 return null;
}
