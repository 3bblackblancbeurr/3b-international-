import test from 'node:test';import assert from 'node:assert/strict';
import {cityModelPrimitives} from '../src/city/city3b-model-preview.js';
const definition={code:'HOME_ORIGIN',category:'home',footprint:{w:4,h:4}};
test('individual homes have persistent distinct geometry, not recoloured copies',()=>{
 const signatures=new Set();for(let i=0;i<50;i++){const model=cityModelPrimitives(definition,undefined,`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`);assert.ok(model.every(p=>[p.x,p.y,p.z,p.w,p.h,p.d].every(Number.isFinite)));signatures.add(JSON.stringify(model.map(({color,...p})=>p)));}
 assert.equal(signatures.size,50);assert.deepEqual(cityModelPrimitives(definition,undefined,'fixed'),cityModelPrimitives(definition,undefined,'fixed'));
});
test('town hall retains one common model while institutions and sports have distinct meshes',()=>{
 const hall={code:'CITY_HALL_3B',category:'community',footprint:{w:4,h:4}};assert.deepEqual(cityModelPrimitives(hall,undefined,'one'),cityModelPrimitives(hall,undefined,'two'));
 const sports=['TENNIS_3B','BASKET_3B','POOL_3B','GYM_3B','STADIUM_3B','ARENA_3B'];assert.equal(new Set(sports.map(code=>JSON.stringify(cityModelPrimitives({...definition,category:'sport',code})))).size,6);
});
