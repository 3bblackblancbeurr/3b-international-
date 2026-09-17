import {GOLD_MASTER_VEHICLES} from './productionCatalog.js';
export const CONCEPT_STATUS=Object.freeze({missing:'missing',briefed:'briefed',generated:'generated',approved:'approved'});
export const CONCEPT_ART_REGISTRY=Object.freeze(Object.fromEntries(GOLD_MASTER_VEHICLES.map(v=>[v.id,{vehicleId:v.id,countryId:v.countryId,city:v.city,status:CONCEPT_STATUS.briefed,imageRef:null,approved:false,productionAsset:false}])));
export function conceptArtReport(registry=CONCEPT_ART_REGISTRY){const rows=Object.values(registry),counts=Object.fromEntries(Object.values(CONCEPT_STATUS).map(s=>[s,rows.filter(r=>r.status===s).length]));return {total:rows.length,counts,approved:rows.filter(r=>r.approved).length,productionReady:rows.filter(r=>r.productionAsset).length};}
export function updateConceptArt(registry,vehicleId,patch={}){if(!registry[vehicleId])return registry;return {...registry,[vehicleId]:{...registry[vehicleId],...patch,productionAsset:false}};}
