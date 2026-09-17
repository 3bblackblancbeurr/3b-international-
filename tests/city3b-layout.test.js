import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_DISTRICTS,MAX_BUILDING_FOOTPRINT,boxesOverlap,districtPosition,isPlacementValid,landHalfSize,placementBox,rotatedFootprint} from '../src/city/city3b-layout.js';

test('eight City 3B districts keep unique 45 degree positions and values',()=>{
 const entries=Object.entries(CITY_DISTRICTS);assert.equal(entries.length,8);assert.equal(new Set(entries.map(([,v])=>v.angle)).size,8);assert.deepEqual(entries.map(([,v])=>v.angle).sort((a,b)=>a-b),[0,45,90,135,180,225,270,315]);assert.equal(CITY_DISTRICTS.France.value,'Justice');assert.equal(CITY_DISTRICTS.Algérie.value,'Loyauté');assert.equal(CITY_DISTRICTS.Espagne.value,'Passion');assert.equal(CITY_DISTRICTS.Maroc.value,'Noblesse');assert.equal(CITY_DISTRICTS.Italie.value,'Espoir');assert.equal(CITY_DISTRICTS.Tunisie.value,'Courage');assert.equal(CITY_DISTRICTS.Turquie.value,'Foi');assert.equal(CITY_DISTRICTS.Estonie.value,'Sagesse');
});

test('land grows deterministically over ten tiers',()=>{assert.equal(landHalfSize(1),95);assert.equal(landHalfSize(10),500);assert.equal(landHalfSize(99),500);assert.equal(landHalfSize(0),95)});

test('rotation preserves real catalog footprints including large landmarks',()=>{assert.equal(MAX_BUILDING_FOOTPRINT,64);assert.deepEqual(rotatedFootprint({footprint:{w:4,h:2}},0),{w:4,h:2});assert.deepEqual(rotatedFootprint({footprint:{w:37,h:18}},90),{w:18,h:37});assert.deepEqual(rotatedFootprint({footprint:{w:3,h:3}},270),{w:3,h:3});assert.deepEqual(rotatedFootprint({footprint:{w:100,h:2}},0),{w:64,h:2})});

test('collision check rejects occupied and out-of-bounds parcels',()=>{const city={land_tier:1},building={footprint:{w:3,h:3}},placements=[{id:'a',x:10,z:10,footprint_w:3,footprint_h:3,placement_state:'placed'}];assert.equal(isPlacementValid({city,building,x:10,z:10,placements}).valid,false);assert.equal(isPlacementValid({city,building,x:90,z:90,placements}).valid,true);assert.equal(isPlacementValid({city,building,x:94,z:94,placements}).valid,false);assert.equal(isPlacementValid({city,building,x:10,z:10,placements,excludeId:'a'}).valid,true)});

test('stored buildings do not block a parcel',()=>{const city={land_tier:1},building={footprint:{w:2,h:2}},placements=[{id:'stored',x:0,z:0,footprint_w:10,footprint_h:10,placement_state:'stored'}];assert.equal(isPlacementValid({city,building,x:0,z:0,placements}).valid,true)});

test('district positions stay on their requested radius and boxes overlap correctly',()=>{for(const country of Object.keys(CITY_DISTRICTS)){const p=districtPosition(country,150);assert.ok(Math.abs(Math.hypot(p.x,p.z)-150)<1e-8)}assert.equal(boxesOverlap(placementBox(0,0,2,2),placementBox(1,1,2,2)),true);assert.equal(boxesOverlap(placementBox(0,0,2,2),placementBox(2,2,2,2)),false)});
