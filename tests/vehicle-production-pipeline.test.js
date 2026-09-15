import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeVehicle} from '../src/games/underground/carModel.js';
import {GOLD_MASTER_COUNTRY_ORDER,GOLD_MASTER_VEHICLES,GOLD_MASTER_BY_ID,goldMastersForCountry,vehicleProductionCatalogReport} from '../src/games/underground/productionCatalog.js';
import {createProductionState,countryProductionReport,globalProductionReport,nextProductionGate,updateVehicleProduction} from '../src/games/underground/productionPipeline.js';
import {bindGoldMasterAsset,createGoldMasterVehicle} from '../src/games/underground/productionVehicleFactory.js';

test('Gold Master catalogue defines 20 city heroes for each of the 8 countries',()=>{
  assert.equal(GOLD_MASTER_COUNTRY_ORDER.length,8);
  assert.equal(GOLD_MASTER_VEHICLES.length,160);
  for(const id of GOLD_MASTER_COUNTRY_ORDER)assert.equal(goldMastersForCountry(id).length,20);
  assert.equal(vehicleProductionCatalogReport().ok,true);
});

test('France Gold Master locks Saint-Etienne Soleil into the canonical catalogue',()=>{
  const saintEtienne=goldMastersForCountry('france').find(v=>v.city==='Saint-Étienne');
  assert.ok(saintEtienne);
  assert.equal(saintEtienne.heroModel,'Soleil');
  assert.equal(saintEtienne.displayName,'3B Stéphanoise Soleil');
});

test('every Gold Master carries distinct city DNA, materials, silhouette and target GLB path',()=>{
  const ids=new Set(),names=new Set();
  for(const vehicle of GOLD_MASTER_VEHICLES){
    assert.ok(!ids.has(vehicle.id));ids.add(vehicle.id);
    assert.ok(!names.has(vehicle.displayName));names.add(vehicle.displayName);
    assert.ok(vehicle.silhouette.length>3);
    assert.ok(vehicle.materials.length>=4);
    assert.match(vehicle.expectedAsset,/^\/vehicles\/gold-master\/[a-z-]+\/[a-z0-9-]+\/u3b-gm-.+\.glb$/);
  }
});

test('production gates do not pretend art is ready before GLB, capture and validation exist',()=>{
  const state=createProductionState(),fr=countryProductionReport('france',state);
  assert.equal(fr.counts.concept,20);
  assert.equal(fr.counts.mesh,0);
  assert.equal(nextProductionGate('france',state),'mesh');
  const global=globalProductionReport(state);
  assert.equal(global.totals.vehicles,160);
  assert.equal(global.totals.validated,0);
});

test('real GLB paths survive vehicle normalization and can enter production state',()=>{
  const id='u3b-gm-france-paris',asset=GOLD_MASTER_BY_ID[id].expectedAsset;
  const vehicle=createGoldMasterVehicle(id,{modelAsset:asset});
  assert.equal(vehicle.modelAsset,asset);
  assert.equal(normalizeVehicle(vehicle).modelAsset,asset);
  assert.equal(vehicle.productionRef,id);
  const rebound=bindGoldMasterAsset(vehicle,asset);
  assert.equal(rebound.modelAsset,asset);
  let state=createProductionState();
  state=updateVehicleProduction(state,id,{mesh:true,modelAsset:asset});
  const report=countryProductionReport('france',state);
  assert.equal(report.counts.mesh,1);
  assert.equal(report.counts.integration,0);
});

test('race renderer and Vehicle Lab both contain production GLB loading with proxy fallback',()=>{
  const race=fs.readFileSync(new URL('../src/games/underground/ThreeRaceView.js',import.meta.url),'utf8');
  const lab=fs.readFileSync(new URL('../src/games/underground/VehicleLabPreview.jsx',import.meta.url),'utf8');
  for(const source of [race,lab]){
    assert.match(source,/loadProductionVehicle/);
    assert.match(source,/proxy/i);
  }
  assert.match(race,/vehicleAssetState/);
  assert.match(lab,/MODÈLE 3D GOLD MASTER/);
});
