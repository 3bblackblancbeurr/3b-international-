import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeCheck,cityDrawingView} from '../src/city/city3b-landscape.js';
import {cityMapInitialView,cityMapBlueprint} from '../src/city/city3b-map.js';
const route={x1:-20,z1:0,x2:20,z2:0,width:4};
const obstacle=kind=>({kind,x1:0,z1:0,x2:0,z2:0,width:12});
const data=terrain=>({city:{city:{map_extent:500,terrain}}});
test('road diagnostics distinguish water from relief and identify the highlighted obstacle',()=>{
 for(const kind of ['lake','river','hill','basin']){
  const feature=obstacle(kind),check=landscapeCheck(data([feature]),[route],{road:true});
  assert.equal(check.valid,false);assert.equal(check.obstacle,feature);assert.equal(check.segmentIndex,0);
  assert.match(check.reason,['lake','river'].includes(kind)?/Eau.*pont.*niveau 4/:/Relief.*tunnel.*niveau 5/);
 }
});
test('right-angle road diagnostics identify the failing segment and leave plans untouched',()=>{
 const feature={...obstacle('lake'),x1:20,x2:20,z1:20,z2:20};
 const legs=[{x1:0,z1:0,x2:20,z2:0,width:4},{x1:20,z1:0,x2:20,z2:40,width:4}];
 const snapshot=data([feature]),before=structuredClone(snapshot);
 const check=landscapeCheck(snapshot,legs,{road:true});assert.equal(check.segmentIndex,1);assert.deepEqual(snapshot,before);
 assert.equal(landscapeCheck(data([]),legs,{road:true}).valid,true);
});
test('drawing focus frames both endpoints and never mutates the saved plan',()=>{
 const snapshot=data([]),features=[route,{x1:20,z1:0,x2:20,z2:40,width:4}],before=structuredClone(features);
 const view=cityDrawingView(snapshot,features),radius=cityMapBlueprint(snapshot).half/view.zoom;
 assert.deepEqual(view.center,{x:0,z:20});assert.ok(radius>=32);assert.deepEqual(features,before);
 assert.equal(cityDrawingView(snapshot,[]),null);assert.equal(cityDrawingView(snapshot,[{...route,x1:NaN}]),null);
});
test('empty starter maps begin closer so the 4 metre road is visible',()=>{
 const snapshot={city:{city:{map_preset:'river',map_extent:500}}};
 assert.equal(cityMapBlueprint(snapshot).half/cityMapInitialView(snapshot).zoom,80);
});
