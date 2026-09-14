import test from 'node:test';
import assert from 'node:assert/strict';
import {CUSTOMIZATION_SLOTS,normalizeCustomization} from '../src/games/underground/customization.js';
import {DEFAULT_VEHICLE,normalizeVehicle} from '../src/games/underground/carModel.js';
import {DEFAULT_PLATFORM_ID,DEFAULT_PLATFORM_MANIFEST,calculateStanceTransforms,partCompatibility,platformReadinessReport,resolveVehicleAssembly,slotBinding,validatePlatformContract} from '../src/games/underground/vehiclePlatform.js';
import {EMPTY_ASSET_PACK,assetPackReadiness,resolveAssetBackedAssembly,validateVehicleAssetPack} from '../src/games/underground/vehicleAssetPack.js';
import {INSPECTION_PRESETS,inspectionState,validateInspectionContract,VEHICLE_MECHANISMS} from '../src/games/underground/vehicleInspection.js';
import {createModularVehicleProxy} from '../src/games/underground/ModularVehicleProxy.js';

test('every customization slot is bound to a modular platform anchor',()=>{
  const report=validatePlatformContract();assert.equal(report.ok,true);assert.equal(report.slotCount,CUSTOMIZATION_SLOTS.length);assert.equal(report.missingSlots.length,0);assert.equal(report.invalidAnchors.length,0);
  for(const slot of CUSTOMIZATION_SLOTS)assert.ok(slotBinding(slot.id)?.anchor,slot.id);
});

test('vehicle normalization pins a known platform without final model asset',()=>{
  const v=normalizeVehicle({...DEFAULT_VEHICLE,platformId:'unknown-platform',modelAsset:'should-not-survive.glb'});
  assert.equal(v.platformId,DEFAULT_PLATFORM_ID);assert.equal(v.modelAsset,null);assert.ok(v.platformVersion>=1);
});

test('assembly resolves all selected slots before any final art exists',()=>{
  const assembly=resolveVehicleAssembly(DEFAULT_VEHICLE);assert.equal(assembly.platformId,DEFAULT_PLATFORM_ID);assert.equal(assembly.parts.length,CUSTOMIZATION_SLOTS.length);assert.equal(assembly.parts.every(p=>p.assetRef===null),true);assert.equal(assembly.decals.vinylLayers.length,0);
});

test('stance changes wheel transforms mathematically',()=>{
  const stock=calculateStanceTransforms(normalizeCustomization());const lowered=normalizeCustomization();lowered.stance.rideHeight=1;lowered.stance.frontTrack=1;const tuned=calculateStanceTransforms(lowered);
  assert.ok(tuned.rideOffsetM<stock.rideOffsetM);assert.ok(Math.abs(tuned.wheels.fl.position[0])>Math.abs(stock.wheels.fl.position[0]));
});

test('future part contracts can be checked against the platform',()=>{
  const ok=partCompatibility(DEFAULT_PLATFORM_ID,{id:'future-seat',slotId:'seats',assetRef:'seat.glb',platformIds:[DEFAULT_PLATFORM_ID],materialChannels:['interior']});assert.equal(ok.ok,true);assert.equal(ok.anchor,'interior.seats');
  const bad=partCompatibility(DEFAULT_PLATFORM_ID,{id:'bad',slotId:'not-a-slot',assetRef:'x.glb'});assert.equal(bad.ok,false);
});

test('readiness explicitly separates data-ready from art-ready',()=>{
  const report=platformReadinessReport(DEFAULT_VEHICLE);assert.equal(report.totalSlots,CUSTOMIZATION_SLOTS.length);assert.equal(report.dataReady,true);assert.equal(report.artReady,false);assert.equal(report.missingCore.length,3);assert.ok(report.missingSelectedParts>0);
});

test('modular proxy already consumes the platform assembly',()=>{
  const group=createModularVehicleProxy(DEFAULT_VEHICLE);assert.equal(group.name,'U3B_ModularVehicleProxy');assert.equal(group.userData.platformId,DEFAULT_PLATFORM_ID);assert.ok(group.children.length>10);group.traverse(o=>o.geometry?.dispose?.());
});

test('platform manifest stays assetless until real art arrives',()=>{
  assert.equal(DEFAULT_PLATFORM_MANIFEST.chassisAsset,null);assert.equal(DEFAULT_PLATFORM_MANIFEST.cockpitAsset,null);assert.equal(DEFAULT_PLATFORM_MANIFEST.collisionAsset,null);
});

test('empty future asset pack is valid as a draft but not final-ready',()=>{
  const validated=validateVehicleAssetPack(EMPTY_ASSET_PACK);assert.equal(validated.errors.length,0);const readiness=assetPackReadiness(EMPTY_ASSET_PACK);assert.equal(readiness.readyForProxy,true);assert.equal(readiness.readyForFinal,false);assert.equal(readiness.meshAssetOptions,0);assert.equal(readiness.materialDefinitions,0);assert.ok(readiness.meshOptionTotal>0);assert.ok(readiness.materialOptionTotal>0);
});

test('asset-backed assembly can replace one selected proxy part without changing save data',()=>{
  const selected=DEFAULT_VEHICLE.customization.selections.seats;const pack={version:1,id:'partial',platformId:DEFAULT_PLATFORM_ID,core:{},parts:[{id:'seat-art',optionId:selected,assetRef:'/cars/s1/seat.glb',platformIds:[DEFAULT_PLATFORM_ID],materialChannels:['interior']}]};
  const resolved=resolveAssetBackedAssembly(DEFAULT_VEHICLE,pack);assert.equal(resolved.compatible,true);const seat=resolved.parts.find(p=>p.slotId==='seats');assert.equal(seat.finalAssetRef,'/cars/s1/seat.glb');assert.equal(DEFAULT_VEHICLE.customization.selections.seats,selected);
});

test('material-only customization can be defined without duplicating a mesh',()=>{
  const finish=DEFAULT_VEHICLE.customization.selections.finish;const pack={version:1,id:'material-partial',platformId:DEFAULT_PLATFORM_ID,parts:[{id:'paint-finish',optionId:finish,mode:'material',materialChannels:['bodyPrimary'],params:{roughness:.22,clearcoat:.9}}]};
  const validated=validateVehicleAssetPack(pack);assert.equal(validated.errors.length,0);assert.equal(validated.warnings.some(x=>x===`part-asset-missing:${finish}`),false);const resolved=resolveAssetBackedAssembly(DEFAULT_VEHICLE,pack);const paint=resolved.parts.find(p=>p.slotId==='finish');assert.deepEqual(paint.materialParams,{roughness:.22,clearcoat:.9});
});

test('inspection contract opens detachable areas without final art',()=>{
  const contract=validateInspectionContract();assert.equal(contract.ok,true);assert.ok(contract.mechanisms>=4);assert.ok(contract.presets>=8);const engine=inspectionState(DEFAULT_VEHICLE,'engineBay');assert.equal(engine.mechanisms.hood.amount,1);assert.equal(engine.mechanisms.trunk.amount,0);assert.ok(engine.visibleGroups.includes('engineBay'));assert.equal(INSPECTION_PRESETS.cockpit.open.includes('doorRight'),true);assert.ok(VEHICLE_MECHANISMS.trunk.exposes.includes('audio.trunk'));
});
