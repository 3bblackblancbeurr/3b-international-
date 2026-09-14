import {CUSTOMIZATION_OPTION_BY_ID,CUSTOMIZATION_SLOTS} from './customization.js';
import {DEFAULT_PLATFORM_ID,getPlatformManifest,partCompatibility,resolveVehicleAssembly} from './vehiclePlatform.js';

export const VEHICLE_ASSET_PACK_VERSION=1;
const CORE_KEYS=['chassis','bodyShell','collision','cockpit','engineBay','trunk'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);

export function normalizeVehicleAssetPack(value){
  const v=plain(value)?value:{};const platform=getPlatformManifest(v.platformId||DEFAULT_PLATFORM_ID);
  const core={};for(const key of CORE_KEYS)core[key]=typeof v.core?.[key]==='string'&&v.core[key]?v.core[key]:null;
  const materials=plain(v.materials)?Object.fromEntries(Object.entries(v.materials).filter(([k,val])=>platform.materialChannels.includes(k)&&typeof val==='string'&&val)):{};
  const parts=Array.isArray(v.parts)?v.parts.filter(plain).slice(0,2000).map((p,i)=>{
    const option=CUSTOMIZATION_OPTION_BY_ID[p.optionId];return {id:typeof p.id==='string'?p.id:`asset-part-${i+1}`,optionId:option?.id||null,slotId:option?.slot||null,assetRef:typeof p.assetRef==='string'&&p.assetRef?p.assetRef:null,
      platformIds:Array.isArray(p.platformIds)?p.platformIds.filter(Boolean):[platform.id],materialChannels:Array.isArray(p.materialChannels)?p.materialChannels.filter(x=>platform.materialChannels.includes(x)):[],
      anchorOverride:typeof p.anchorOverride==='string'?p.anchorOverride:null,lodRefs:Array.isArray(p.lodRefs)?p.lodRefs.filter(x=>typeof x==='string'&&x).slice(0,5):[],collisionRef:typeof p.collisionRef==='string'&&p.collisionRef?p.collisionRef:null};
  }):[];
  return {version:VEHICLE_ASSET_PACK_VERSION,id:typeof v.id==='string'?v.id:'u3b-vehicle-pack-draft',vehicleId:typeof v.vehicleId==='string'?v.vehicleId:'prototype-01',platformId:platform.id,label:typeof v.label==='string'?v.label:'3B Vehicle Asset Pack',core,materials,parts};
}

export function validateVehicleAssetPack(value,{requireArt=false}={}){
  const pack=normalizeVehicleAssetPack(value),errors=[],warnings=[],seen=new Set();
  if(value?.version!=null&&value.version!==VEHICLE_ASSET_PACK_VERSION)errors.push('pack-version');
  for(const key of CORE_KEYS)if(!pack.core[key])warnings.push(`core-missing:${key}`);
  for(const p of pack.parts){
    if(!p.optionId||!p.slotId){errors.push(`part-option-invalid:${p.id}`);continue;}
    if(seen.has(p.optionId))errors.push(`part-duplicate:${p.optionId}`);seen.add(p.optionId);
    const compatible=partCompatibility(pack.platformId,{id:p.id,slotId:p.slotId,assetRef:p.assetRef,platformIds:p.platformIds,materialChannels:p.materialChannels,anchorOverride:p.anchorOverride});
    if(!compatible.ok)errors.push(`part-incompatible:${p.optionId}:${compatible.reason}`);
    if(!p.assetRef)warnings.push(`part-asset-missing:${p.optionId}`);
  }
  if(requireArt){for(const key of ['chassis','bodyShell','collision','cockpit'])if(!pack.core[key])errors.push(`required-core:${key}`);}
  return {ok:errors.length===0&&(!requireArt||warnings.filter(x=>x.startsWith('part-asset-missing')).length===0),pack,errors,warnings};
}

export function compileVehicleAssetPack(value){
  const validated=validateVehicleAssetPack(value),pack=validated.pack,byOption=Object.fromEntries(pack.parts.filter(p=>p.optionId).map(p=>[p.optionId,p]));
  const bySlot={};for(const slot of CUSTOMIZATION_SLOTS)bySlot[slot.id]=slot.options.map(o=>({optionId:o.id,asset:byOption[o.id]||null}));
  return {...validated,byOption,bySlot};
}

export function resolveAssetBackedAssembly(vehicle,assetPack){
  const logical=resolveVehicleAssembly(vehicle),compiled=compileVehicleAssetPack(assetPack);if(compiled.pack.platformId!==logical.platformId)return {logical,compiled,parts:logical.parts.map(p=>({...p,finalAssetRef:null})),core:{},compatible:false};
  const parts=logical.parts.map(p=>({...p,finalAssetRef:compiled.byOption[p.optionId]?.assetRef||null,lodRefs:compiled.byOption[p.optionId]?.lodRefs||[],collisionRef:compiled.byOption[p.optionId]?.collisionRef||null}));
  return {logical,compiled,parts,core:compiled.pack.core,materials:compiled.pack.materials,compatible:true};
}

export function assetPackReadiness(value){
  const compiled=compileVehicleAssetPack(value),totalOptions=Object.keys(CUSTOMIZATION_OPTION_BY_ID).length,assetOptions=Object.values(compiled.byOption).filter(p=>p.assetRef).length,coreReady=Object.values(compiled.pack.core).filter(Boolean).length;
  return {platformId:compiled.pack.platformId,totalOptions,assetOptions,optionCoverage:totalOptions?assetOptions/totalOptions:0,coreReady,coreTotal:CORE_KEYS.length,errors:compiled.errors.length,warnings:compiled.warnings.length,readyForProxy:true,readyForFinal:coreReady>=4&&assetOptions===totalOptions&&compiled.errors.length===0};
}

export const EMPTY_ASSET_PACK=Object.freeze(normalizeVehicleAssetPack({id:'u3b-s1-empty-pack',platformId:DEFAULT_PLATFORM_ID}));
