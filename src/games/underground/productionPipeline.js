import {GOLD_MASTER_BY_ID,GOLD_MASTER_COUNTRY_ORDER,goldMastersForCountry,vehicleProductionCatalogReport} from './productionCatalog.js';

export const PRODUCTION_STAGES=Object.freeze([
  {id:'catalog',label:'Catalogue officiel',gate:'identity'},
  {id:'concept',label:'Concept Gold Master',gate:'art-direction'},
  {id:'mesh',label:'Modèle 3D',gate:'geometry'},
  {id:'pbr',label:'Textures PBR',gate:'materials'},
  {id:'tuning',label:'Tuning & variantes',gate:'customization'},
  {id:'integration',label:'Intégration jeu',gate:'runtime'},
  {id:'capture',label:'Capture réelle',gate:'visual-proof'},
  {id:'validation',label:'Validation Gold Master',gate:'quality'},
]);

export const COUNTRY_PRODUCTION_SEQUENCE=Object.freeze(
  GOLD_MASTER_COUNTRY_ORDER.map((countryId,index)=>({countryId,index,blockedBy:index?GOLD_MASTER_COUNTRY_ORDER[index-1]:null}))
);

const VALID_STAGE_IDS=new Set(PRODUCTION_STAGES.map(x=>x.id));
const assetReady=v=>typeof v?.modelAsset==='string'&&v.modelAsset.endsWith('.glb');

export function createProductionState(){
  return Object.fromEntries(GOLD_MASTER_COUNTRY_ORDER.map(countryId=>[
    countryId,
    {
      countryId,
      stage:'catalog',
      approved:false,
      vehicles:Object.fromEntries(goldMastersForCountry(countryId).map(v=>[
        v.id,{concept:true,mesh:false,pbr:false,tuning:false,integration:false,capture:false,validation:false,modelAsset:null,captureAsset:null}
      ])),
    }
  ]));
}

export function normalizeProductionState(value){
  const base=createProductionState(),source=value&&typeof value==='object'?value:{};
  for(const countryId of GOLD_MASTER_COUNTRY_ORDER){
    const incoming=source[countryId]&&typeof source[countryId]==='object'?source[countryId]:{};
    base[countryId].stage=VALID_STAGE_IDS.has(incoming.stage)?incoming.stage:base[countryId].stage;
    base[countryId].approved=Boolean(incoming.approved);
    const vehicles=incoming.vehicles&&typeof incoming.vehicles==='object'?incoming.vehicles:{};
    for(const id of Object.keys(base[countryId].vehicles)){
      const src=vehicles[id]&&typeof vehicles[id]==='object'?vehicles[id]:{};
      base[countryId].vehicles[id]={...base[countryId].vehicles[id],...src,concept:true};
    }
  }
  return base;
}

export function productionVehicleStatus(vehicleId,state){
  const spec=GOLD_MASTER_BY_ID[vehicleId];if(!spec)return null;
  const normalized=normalizeProductionState(state),runtime=normalized[spec.countryId].vehicles[vehicleId];
  return {...spec,...runtime,assetReady:assetReady(runtime)};
}

export function countryProductionReport(countryId,state){
  const specs=goldMastersForCountry(countryId),normalized=normalizeProductionState(state),country=normalized[countryId];
  if(!country)return {ok:false,countryId,total:0,errors:['country-unknown']};
  const vehicles=specs.map(spec=>productionVehicleStatus(spec.id,normalized));
  const counts={
    concept:vehicles.filter(v=>v.concept).length,
    mesh:vehicles.filter(v=>v.mesh&&v.assetReady).length,
    pbr:vehicles.filter(v=>v.pbr).length,
    tuning:vehicles.filter(v=>v.tuning).length,
    integration:vehicles.filter(v=>v.integration&&v.assetReady).length,
    capture:vehicles.filter(v=>v.capture&&v.captureAsset).length,
    validation:vehicles.filter(v=>v.validation).length,
  };
  const total=vehicles.length;
  const stageReady={
    catalog:total===20,
    concept:counts.concept===total,
    mesh:counts.mesh===total,
    pbr:counts.pbr===total,
    tuning:counts.tuning===total,
    integration:counts.integration===total,
    capture:counts.capture===total,
    validation:counts.validation===total,
  };
  return {ok:total===20,countryId,total,counts,stageReady,approved:country.approved,vehicles};
}

export function nextProductionGate(countryId,state){
  const report=countryProductionReport(countryId,state);
  for(const stage of PRODUCTION_STAGES)if(!report.stageReady[stage.id])return stage.id;
  return report.approved?null:'validation';
}

export function globalProductionReport(state){
  const catalog=vehicleProductionCatalogReport();
  const countries=Object.fromEntries(GOLD_MASTER_COUNTRY_ORDER.map(id=>[id,countryProductionReport(id,state)]));
  return {
    catalog,
    countries,
    totals:{
      countries:GOLD_MASTER_COUNTRY_ORDER.length,
      vehicles:Object.values(countries).reduce((sum,x)=>sum+x.total,0),
      validated:Object.values(countries).reduce((sum,x)=>sum+x.counts.validation,0),
    },
  };
}

export function updateVehicleProduction(state,vehicleId,patch){
  const spec=GOLD_MASTER_BY_ID[vehicleId];if(!spec)return normalizeProductionState(state);
  const next=normalizeProductionState(state),current=next[spec.countryId].vehicles[vehicleId];
  next[spec.countryId].vehicles[vehicleId]={...current,...patch,concept:true};
  return next;
}
