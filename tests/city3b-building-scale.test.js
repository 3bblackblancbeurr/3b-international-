import test from 'node:test';
import assert from 'node:assert/strict';
import {cityBuildingHeight,cityModelPrimitives} from '../src/city/city3b-model-preview.js';
import {cityFootprint} from '../src/city/city3b-construction.js';

test('homes have more presence and offices remain taller than housing on an equal parcel',()=>{
 const home=cityBuildingHeight(4,4,'housing','HOME_ORIGIN');
 assert.ok(home>4*.8*1.3);
 const residence=cityBuildingHeight(4,4,'housing','RESIDENCE_3B');
 assert.ok(residence>home);
 assert.ok(cityBuildingHeight(4,4,'commerce','OFFICE_3B')>residence);
});

test('larger models keep legacy saved parcels and rotation intact',()=>{
 const definition={code:'HOME_ORIGIN',category:'home',footprint:{w:4,h:6}};
 const placement={footprint_w:2,footprint_h:3,rotation:0};
 const before=structuredClone(placement);
 assert.deepEqual(cityFootprint(definition,90,placement),{width:3,height:2});
 const model=cityModelPrimitives(definition,{w:2,h:3},'fixed');
 assert.ok(model.every(p=>[p.x,p.y,p.z,p.w,p.h,p.d].every(Number.isFinite)));
 assert.deepEqual(placement,before);
 assert.equal(cityBuildingHeight(100,100,'landmark','TOWER_3B'),24);
});
