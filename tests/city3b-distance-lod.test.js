import test from 'node:test';
import assert from 'node:assert/strict';
import {cityDistanceTier} from '../src/city/city3b-distance-lod.js';
import {createCityRenderBudget} from '../src/city/city3b-render-budget.js';

const near={distance:20,half:100,mapId:'city-a'};
const far={...near,distance:200};

function timeline(budget,initialView=near){
 let time=0,view=initialView;
 budget.sample(time,true,view);
 const sample=(gap=45,nextView=view,active=true)=>{
  time+=gap;view=nextView;
  return budget.sample(time,active,view);
 };
 return {sample,frames(count,gap=45){
  const updates=[];
  for(let i=0;i<count;i++){const update=sample(gap);if(update)updates.push(update);}
  return updates;
 }};
}

test('desktop distance thresholds retain quality at their exit boundaries',()=>{
 for(const [ratio,current,expected] of [
  [.819,0,0],[.82,0,1],[1.549,1,1],[1.55,1,2],
  [.66,1,1],[.659,1,0],[1.30,2,2],[1.299,2,1],
 ])assert.equal(cityDistanceTier(ratio,current),expected,`ratio ${ratio}, previous tier ${current}`);
});

test('phones simplify earlier and have their own stable return thresholds',()=>{
 for(const [ratio,current,expected] of [
  [.619,0,0],[.62,0,1],[1.199,1,1],[1.20,1,2],
  [.48,1,1],[.479,1,0],[.98,2,2],[.979,2,1],
 ])assert.equal(cityDistanceTier(ratio,current,true),expected,`phone ratio ${ratio}, previous tier ${current}`);
 assert.equal(cityDistanceTier(.7,0,false),0);
 assert.equal(cityDistanceTier(.7,0,true),1);
});

test('small back-and-forth camera movements cannot oscillate distance quality',()=>{
 let tier=cityDistanceTier(.83);
 for(const ratio of [.81,.79,.82,.70,.67,.66]){
  tier=cityDistanceTier(ratio,tier);
  assert.equal(tier,1);
 }
 tier=cityDistanceTier(.65,tier);assert.equal(tier,0);
 tier=cityDistanceTier(1.56,tier);assert.equal(tier,2);
 for(const ratio of [1.54,1.50,1.55,1.40,1.31,1.30]){
  tier=cityDistanceTier(ratio,tier);
  assert.equal(tier,2);
 }
 assert.equal(cityDistanceTier(1.29,tier),1);
});

test('instant close-to-far and far-to-close moves emit only the final required quality',()=>{
 for(const mobile of [false,true]){
  const budget=createCityRenderBudget({mobile}),clock=timeline(budget);
  assert.equal(clock.sample(16.7,far).tier,2);
  assert.equal(clock.sample(16.7,near).tier,0);
  assert.equal(clock.sample(16.7,near),null);
  assert.equal(cityDistanceTier(.2,2,mobile),0);
 }
});

test('invalid distance observations preserve the last valid quality',()=>{
 for(const value of [undefined,null,NaN,Infinity,-1,'invalid']){
  assert.equal(cityDistanceTier(value,1),1);
  assert.equal(cityDistanceTier(value,2),2);
 }
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.sample(16.7,far);
 for(const view of [
  {...near,distance:NaN},{...near,distance:-1},{...near,half:0},
  {...near,half:Infinity},{mapId:'different-city'},
 ]){
  assert.equal(clock.sample(16.7,view),null);
  assert.equal(budget.state().distanceTier,2);
 }
});

test('distance transitions restore resolution and shadows without exceeding device density',()=>{
 for(const [mobile,maximum] of [[false,1.75],[true,1.35]]){
  const budget=createCityRenderBudget({mobile,pixelRatio:3}),clock=timeline(budget);
  assert.equal(budget.state().pixelRatio,maximum);
  const medium=clock.sample(16.7,{...near,distance:90});
  assert.equal(medium.tier,1);assert.equal(medium.pixelRatio,1);assert.equal(medium.shadows,true);
  const distant=clock.sample(16.7,far);
  assert.equal(distant.pixelRatio,.85);assert.equal(distant.shadows,false);
  const close=clock.sample(16.7,near);
  assert.equal(close.pixelRatio,maximum);assert.equal(close.shadows,true);
 }
 const lowDensity=createCityRenderBudget({pixelRatio:.75}),clock=timeline(lowDensity);
 assert.equal(clock.sample(16.7,far).pixelRatio,.75);
 assert.equal(clock.sample(16.7,near).pixelRatio,.75);
});

test('separate scenes and a remounted scene do not inherit another camera or performance floor',()=>{
 const original=createCityRenderBudget(),originalClock=timeline(original);
 originalClock.frames(480);originalClock.sample(16.7,far);
 assert.equal(original.state().performanceTier,2);
 assert.equal(original.state().distanceTier,2);
 const remounted=createCityRenderBudget(),remountedClock=timeline(remounted);
 assert.equal(remounted.state().tier,0);
 assert.equal(remounted.state().performanceTier,0);
 assert.equal(remountedClock.sample(16.7,{...near,distance:90}).tier,1);
 assert.equal(original.state().tier,2);
 assert.equal(original.state().distanceTier,2);
});

test('a larger map recomputes distance quality even when the camera has not moved',()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.sample(16.7,{...near,distance:90});
 const largerMap=clock.sample(16.7,{...near,distance:90,half:1000});
 assert.equal(largerMap.distanceTier,0);assert.equal(largerMap.tier,0);
 const smallerMap=clock.sample(16.7,{...near,distance:90});
 assert.equal(smallerMap.distanceTier,1);assert.equal(smallerMap.tier,1);
});

for(const [label,newView] of [
 ['save identity',{...near,mapId:'city-b',distance:70}],
 ['map extent',{...near,half:200,distance:140}],
])test(`changing ${label} clears inherited distance hysteresis`,()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.sample(16.7,{...near,distance:90});
 assert.equal(budget.state().distanceTier,1);
 assert.equal(clock.sample(16.7,{...near,distance:70}),null);
 const changed=clock.sample(16.7,newView);
 assert.equal(changed.distanceTier,0);assert.equal(changed.tier,0);
});

for(const [label,newView] of [
 ['save identity',{...near,mapId:'city-b'}],
 ['map extent',{...near,half:200}],
])test(`changing ${label} discards partial pressure while retaining established performance limits`,()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.frames(120);assert.equal(budget.state().performanceTier,0);
 clock.sample(45,newView);
 clock.frames(120);assert.equal(budget.state().performanceTier,0);
 clock.frames(120);assert.equal(budget.state().performanceTier,1);
 clock.sample(45,near);
 assert.equal(budget.state().performanceTier,1);
 clock.frames(120);assert.equal(budget.state().performanceTier,1);
 clock.frames(120);assert.equal(budget.state().performanceTier,2);
});

test('inactive or reduced-motion views still change distance quality without recording slow frames',()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.frames(120);
 const distant=clock.sample(45,far,false);
 assert.equal(distant.distanceTier,2);assert.equal(distant.performanceTier,0);
 for(let i=0;i<500;i++)assert.equal(clock.sample(45,far,false),null);
 const close=clock.sample(45,near,false);
 assert.equal(close.tier,0);assert.equal(close.performanceTier,0);
 clock.sample(45,near,true);
 clock.frames(120);assert.equal(budget.state().performanceTier,0);
 clock.frames(120);assert.equal(budget.state().performanceTier,1);
});

test('returning close never overrides a performance reduction and camera motion does not reset pressure',()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 assert.deepEqual(clock.frames(240).map(update=>update.tier),[1]);
 const distant=clock.sample(45,far);
 assert.equal(distant.tier,2);assert.equal(distant.performanceTier,1);
 const close=clock.sample(45,near);
 assert.equal(close.distanceTier,0);assert.equal(close.tier,1);
 clock.frames(238);
 assert.equal(budget.state().performanceTier,2);
 assert.equal(budget.state().tier,2);assert.equal(budget.state().shadows,false);
});

test('distance changes masked by the performance floor do not trigger redundant GPU reconfiguration',()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.frames(480);
 assert.equal(clock.sample(16.7,far),null);
 assert.equal(budget.state().distanceTier,2);
 assert.equal(clock.sample(16.7,near),null);
 assert.equal(budget.state().distanceTier,0);
 assert.equal(budget.state().tier,2);
});

test('a suspension at or above 100 ms breaks consecutive slow windows',()=>{
 for(const gap of [100,10000]){
  const budget=createCityRenderBudget(),clock=timeline(budget);
  clock.frames(120);
  clock.sample(gap);
  clock.frames(120);
  assert.equal(budget.state().performanceTier,0,`suspension of ${gap} ms`);
  clock.frames(120);
  assert.equal(budget.state().performanceTier,1);
 }
});

test('a healthy frame window prevents isolated slow windows from accumulating',()=>{
 const budget=createCityRenderBudget(),clock=timeline(budget);
 clock.frames(120,45);
 clock.frames(120,16.7);
 clock.frames(120,45);
 assert.equal(budget.state().performanceTier,0);
 clock.frames(120,45);
 assert.equal(budget.state().performanceTier,1);
});
