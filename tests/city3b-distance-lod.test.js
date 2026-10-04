import test from 'node:test';
import assert from 'node:assert/strict';
import {cityDistanceTier,reportCityCameraDistance,resetCityCameraDistance} from '../src/city/city3b-distance-lod.js';
import {createCityRenderBudget} from '../src/city/city3b-render-budget.js';

test('distance LOD uses stable hysteresis instead of flickering at zoom boundaries',()=>{
 assert.equal(cityDistanceTier(.2,0,false),0);
 assert.equal(cityDistanceTier(.9,0,false),1);
 assert.equal(cityDistanceTier(1.6,1,false),2);
 assert.equal(cityDistanceTier(1.4,2,false),2,'far view remains stable above the leave threshold');
 assert.equal(cityDistanceTier(1.2,2,false),1);
 assert.equal(cityDistanceTier(.7,1,false),1,'medium view remains stable above its leave threshold');
 assert.equal(cityDistanceTier(.6,1,false),0);
});

test('mobile enters reduced tiers earlier than desktop',()=>{
 assert.equal(cityDistanceTier(.7,0,false),0);
 assert.equal(cityDistanceTier(.7,0,true),1);
 assert.equal(cityDistanceTier(1.3,1,true),2);
});

test('render budget applies camera-distance quality without waiting for a slowdown',()=>{
 resetCityCameraDistance();
 const budget=createCityRenderBudget({mobile:false,pixelRatio:2});
 assert.deepEqual(budget.state(),{tier:0,performanceTier:0,distanceTier:0,pixelRatio:1.75,shadows:true});
 reportCityCameraDistance(450,500);
 assert.deepEqual(budget.sample(16,true),{tier:1,performanceTier:0,distanceTier:1,pixelRatio:1,shadows:true});
 reportCityCameraDistance(800,500);
 assert.deepEqual(budget.sample(32,true),{tier:2,performanceTier:0,distanceTier:2,pixelRatio:.85,shadows:false});
 reportCityCameraDistance(600,500);
 assert.deepEqual(budget.sample(48,true),{tier:1,performanceTier:0,distanceTier:1,pixelRatio:1,shadows:true});
 reportCityCameraDistance(300,500);
 assert.deepEqual(budget.sample(64,true),{tier:0,performanceTier:0,distanceTier:0,pixelRatio:1.75,shadows:true});
});

test('frame-pressure degradation remains one-way and combines with distance',()=>{
 resetCityCameraDistance();
 const budget=createCityRenderBudget({mobile:false,pixelRatio:2});
 let time=0,result=null;
 // Two slow 120-frame windows are required before reducing quality.
 for(let window=0;window<2;window++)for(let frame=0;frame<120;frame++){
  time+=40;result=budget.sample(time,true)||result;
 }
 assert.equal(budget.state().performanceTier,1);
 assert.equal(budget.state().tier,1);
 reportCityCameraDistance(900,500);
 result=budget.sample(time+40,true);
 assert.equal(result.tier,2);
 assert.equal(result.performanceTier,1);
 assert.equal(result.distanceTier,2);
});
