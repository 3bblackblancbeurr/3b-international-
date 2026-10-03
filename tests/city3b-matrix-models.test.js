import test from 'node:test';
import assert from 'node:assert/strict';
import {cityModelPrimitives,cityPreviewTriangles} from '../src/city/city3b-model-preview.js';
import {cityArchitectureFamily} from '../src/city/city3b-building-model.js';
import {cityBuildingLimit} from '../src/city/city3b-construction.js';
const hall={code:'CITY_HALL_3B',category:'community',footprint:{w:5,h:4}};
test('Matrice is a shared detailed geometry recipe with stepped planted wings',()=>{
 const model=cityModelPrimitives(hall),faces=cityPreviewTriangles(hall);
 assert.equal(cityArchitectureFamily(hall),'matrix');assert.ok(model.length>100&&model.length<220);
 assert.ok(new Set(model.map(r=>r.y.toFixed(2))).size>20);assert.ok(model.filter(r=>r.type==='sphere').length>=10);
 assert.ok(faces.length>100);assert.ok(faces.every(f=>f.points.every(p=>[p.x,p.y,p.depth].every(Number.isFinite))));
});
test('five architectural families keep distinct geometry and work for saved legacy parcels',()=>{
 const signatures=new Set();for(const architecture of ['matrix','civic','heritage','nexus','horizon']){
  const definition={code:'CUSTOM',category:'community',footprint:{w:6,h:5},metadata:{architecture}};
  const recipe=cityModelPrimitives(definition);signatures.add(JSON.stringify(recipe));
  assert.ok(cityPreviewTriangles(definition,{w:1,h:1}).every(f=>f.points.every(p=>Number.isFinite(p.y))));
 }assert.equal(signatures.size,5);
});
test('hall limit includes stored halls but permits moving the original',()=>{
 const data={placements:[{id:'a',building_code:'CITY_HALL_3B',placement_state:'stored'}]};
 assert.equal(cityBuildingLimit(data,hall).valid,false);assert.equal(cityBuildingLimit(data,hall,'a').valid,true);
 assert.equal(cityBuildingLimit(data,{code:'HOME_ORIGIN'}).valid,true);
});
