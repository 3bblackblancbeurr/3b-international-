import {CUSTOMIZATION_OPTION_BY_ID,CUSTOMIZATION_SLOTS} from './customization.js';
import {DEFAULT_PLATFORM_ID,getPlatformManifest,partCompatibility,resolveVehicleAssembly,slotBinding} from './vehiclePlatform.js';

export const VEHICLE_ASSET_PACK_VERSION=1;
const CORE_KEYS=['chassis','bodyShell','collision','cockpit','engineBay','trunk'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);

export function normalizeVehicleAssetPack(value){
  const v=plain(value)?value:{};const platform=getPlatformManifest(v.platformId||DEFAULT_PLATFORM_ID);
  const core={};for(const key of CORE_KEYS)core[key]=typeof v.core?.[key]==='string'&&v.core[key]?v.core[key]:null;
  const materials=plain(v.materials)?Object.fromEntries(Object.entries(v.materials).filter(([k,val])=>platform.materialChannels.includes(k)&&typeof val==='string'&&val)):{};
  const parts=Array.isArray(v.parts)?v.parts.filter(plain).slice(0,2000).map((p,i)=>{
    const option=CUSTOMIZATION_OPTION_BY_ID[p.optionId],binding=option?slotBinding(option.slot):null,mode=['mesh','material','light','decal'].includes(p.mode)?p.mode:(binding?.kind==='material'?'material':'mesh');
    return {id:typeof p.id==='string'?p.id:`asset-part-${i+1}`,optionId:option?.id||null,slotId:option?.slot||null,mode,assetRef:typeof p.assetRef==='string'&&p.assetRef?p.assetRef:null,
      platformIds:Array.isArray(p.platformIds)?p.platformIds.filter(Boolean):[platform.id],materialChannels:Array.isArray(p.materialChannels)?p.materialChannels.filter(x=>platform.materialChannels.includes(x)):[],
      anchorOverride:typeof p.anchorOverride==='string'?p.anchorOverride:null,lodRefs:Array.isArray(p.lodRefs)?p.lodRefs.filter(x=>typeof x==='string'&&x).slice(0,5):[],collisionRef:typeof p.collisionRef==='string'&&p.collisionRef?p.collisionRef:null,
      params:plain(p.params)?structuredClone(p.params):{}};
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
    if(p.mode==='mesh'&&!p.assetRef)warnings.push(`part-asset-missing:${p.optionId}`);
    if(p.mode==='material'&&!p.materialChannels.length)warnings.push(`part-material-channel-missing:${p.optionId}`);
  }
  if(requireArt){for(const key of ['chassis','bodyShell','collision','cockpit'])if(!pack.core[key])errors.push(`required-core:${key}`);}
  const requiredMeshOptions=Object.values(CUSTOMIZATION_OPTION_BY_ID).filter(o=>slotBinding(o.slot)?.kind!=='material').map(o=>o.id),providedMesh=new Set(pack.parts.filter(p=>p.mode==='mesh'&&p.assetRef).map(p=>p.optionId));
  if(requireArt)for(const id of requiredMeshOptions)if(!providedMesh.has(id))errors.push(`required-part:${id}`);
  return {ok:errors.length===0,pack,errors,warnings};
}

export function compileVehicleAssetPack(value){
  const validated=validateVehicleAssetPack(value),pack=validated.pack,byOption=Object.fromEntries(pack.parts.filter(p=>p.optionId).map(p=>[p.optionId,p]));
  const bySlot={};for(const slot of CUSTOMIZATION_SLOTS)bySlot[slot.id]=slot.options.map(o=>({optionId:o.id,asset:byOption[o.id]||null,kind:slotBinding(slot.id)?.kind||'mesh'}));
  return {...validated,byOption,bySlot};
}

export function resolveAssetBackedAssembly(vehicle,assetPack){
  const logical=resolveVehicleAssembly(vehicle),compiled=compileVehicleAssetPack(assetPack);if(compiled.pack.platformId!==logical.platformId)return {logical,compiled,parts:logical.parts.map(p=>({...p,finalAssetRef:null})),core:{},compatible:false};
  const parts=logical.parts.map(p=>{const asset=compiled.byOption[p.optionId]||null;return {...p,finalAssetRef:asset?.mode==='mesh'?asset.assetRef:null,materialParams:asset?.mode==='material'?asset.params:null,materialChannels:asset?.materialChannels||[],lodRefs:asset?.lodRefs||[],collisionRef:asset?.collisionRef||null};});
  return {logical,compiled,parts,core:compiled.pack.core,materials:compiled.pack.materials,compatible:true};
}

export function assetPackReadiness(value){
  const compiled=compileVehicleAssetPack(value),allOptions=Object.values(CUSTOMIZATION_OPTION_BY_ID),meshOptions=allOptions.filter(o=>slotBinding(o.slot)?.kind!=='material'),materialOptions=allOptions.filter(o=>slotBinding(o.slot)?.kind==='material');
  const meshAssets=new Set(compiled.pack.parts.filter(p=>p.mode==='mesh'&&p.assetRef).map(p=>p.optionId)),materialDefs=new Set(compiled.pack.parts.filter(p=>p.mode==='material'&&p.materialChannels.length).map(p=>p.optionId));
  const coreReady=Object.values(compiled.pack.core).filter(Boolean).length;
  return {platformId:compiled.pack.platformId,totalOptions:allOptions.length,meshOptionTotal:meshOptions.length,meshAssetOptions:meshAssets.size,materialOptionTotal:materialOptions.length,materialDefinitions:materialDefs.size,
    meshCoverage:meshOptions.length?meshAssets.size/meshOptions.length:1,materialCoverage:materialOptions.length?materialDefs.size/materialOptions.length:1,coreReady,coreTotal:CORE_KEYS.length,errors:compiled.errors.length,warnings:compiled.warnings.length,
    readyForProxy:true,readyForFinal:coreReady>=4&&meshAssets.size===meshOptions.length&&materialDefs.size===materialOptions.length&&compiled.errors.length===0};
}

export const EMPTY_ASSET_PACK=Object.freeze(normalizeVehicleAssetPack({id:'u3b-s1-empty-pack',platformId:DEFAULT_PLATFORM_ID}));
