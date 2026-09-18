import test from 'node:test';
import assert from 'node:assert/strict';
import {createFranceVerticalSliceVehicle,franceVerticalSliceEvent,createFranceVerticalSlicePursuit,createFranceVerticalSliceGarage,franceVerticalSliceReport,FRANCE_VERTICAL_SLICE_VEHICLE_ID} from '../src/games/underground/FranceVerticalSliceV1.js';
import {hasProductionVehicleAsset,loadProductionVehicle,productionVehicleRuntimeReport} from '../src/games/underground/ProductionVehicleLoader.js';

test('France vertical slice binds the first Gold Master candidate to Quais de Justice',()=>{
  const vehicle=createFranceVerticalSliceVehicle(),event=franceVerticalSliceEvent();
  assert.equal(vehicle.id,FRANCE_VERTICAL_SLICE_VEHICLE_ID);
  assert.equal(vehicle.productionRef,FRANCE_VERTICAL_SLICE_VEHICLE_ID);
  assert.equal(event.countryId,'france');
  assert.equal(event.routeId,'fr-r1');
  assert.equal(event.verticalSlice,true);
});

test('France vertical slice starts with meaningful pursuit pressure and a garage-owned car',()=>{
  const pursuit=createFranceVerticalSlicePursuit(),garage=createFranceVerticalSliceGarage();
  assert.ok(pursuit.state.heat>=4);
  assert.ok(pursuit.budget.maxUnits>=6);
  assert.ok(garage.owned.includes(FRANCE_VERTICAL_SLICE_VEHICLE_ID));
  assert.equal(garage.activeVehicleId,FRANCE_VERTICAL_SLICE_VEHICLE_ID);
});

test('Parisienne Montara candidate is a real PBR runtime model, but remains honestly not final QA',async()=>{
  const vehicle=createFranceVerticalSliceVehicle();
  assert.equal(hasProductionVehicleAsset(vehicle),true);
  const model=await loadProductionVehicle(vehicle);
  const report=productionVehicleRuntimeReport(model);
  assert.equal(report.ok,true);
  assert.equal(model.userData.productionMeta.candidate,true);
  assert.equal(model.userData.productionCandidate,true);
  assert.equal(model.userData.candidateGate.qa,false);
  model.userData.disposeProductionAsset?.();
});

test('vertical slice report separates code-ready from Gold Master validation',()=>{
  const r=franceVerticalSliceReport();
  assert.equal(r.codeReady,true);
  assert.equal(r.goldMasterValidated,false);
  assert.ok(r.blockers.includes('validation 60 FPS'));
});
