import test from 'node:test';import assert from 'node:assert/strict';
import {CITY_ROAD_TYPES,cityRoadType,cityRoadLaneOffset} from '../src/city/city3b-road-types.js';
import {cityTrafficRoutes} from '../src/city/city3b-simulation.js';
import {citySignalTarget,citySignals} from '../src/city/city3b-signals.js';
import {createCityTraffic,cityTrafficLight,stepCityTraffic} from '../src/city/city3b-traffic.js';
import {cityEraseTargets,cityErasePlan} from '../src/city/city3b-erase.js';
const road=(id,roadType,x1=-20,z1=0,x2=20,z2=0)=>({id,roadType,width:cityRoadType(roadType).width,x1,z1,x2,z2});
const snapshot=roads=>({city:{city_level:5,city:{roads}},life:{available:true,population:120,employed:40,mobility:80}});
test('six road models have stable carriageway widths and distinct transport roles',()=>{
 assert.deepEqual(CITY_ROAD_TYPES.map(t=>[t.id,t.width]),[['pedestrian',2],['dirt',3],['simple',4],['oneway',4],['double',8],['motorway',10]]);
 assert.equal(cityRoadLaneOffset(road('r','oneway')),0);assert.equal(cityRoadLaneOffset(road('r','double')),2);assert.notEqual(cityRoadLaneOffset(road('r','motorway'),0),cityRoadLaneOffset(road('r','motorway'),1));
});
test('pedestrian paths never generate cars, one-way never reverses, double road serves both directions',()=>{
 assert.equal(cityTrafficRoutes(snapshot([road('p','pedestrian')])).length,0);
 const one=cityTrafficRoutes(snapshot([road('r','oneway')]));assert.ok(one.length>2);assert.ok(one.every(v=>v.x2>v.x1));
 const two=cityTrafficRoutes(snapshot([road('r','double')]));assert.ok(two.some(v=>v.x1>v.x2));assert.ok(two.some(v=>v.x1<v.x2));
});
test('mayor places signals at a discovered junction, with a level gate and no motorway crossing',()=>{
 const data=snapshot([road('a','double'),road('b','simple',0,-20,0,20)]);
 assert.equal(citySignalTarget(data,{x:2,z:1}).valid,true);assert.equal(citySignalTarget(data,{x:20,z:20}).valid,false);
 data.city.city_level=1;assert.equal(citySignalTarget(data,{x:0,z:0}).valid,false);
 data.city.city_level=5;data.city.city.roads[0]=road('a','motorway');assert.equal(citySignalTarget(data,{x:0,z:0}).valid,false);
});
test('junctions have no automatic signals; installed timing and priority affect their cycle',()=>{
 const routes=[{...road('a','simple'),duration:12},{...road('b','simple',0,-20,0,20),duration:12}];
 assert.equal(createCityTraffic(routes).junctions.length,0);
 assert.equal(createCityTraffic(routes,[{x:0,z:0,green:12,mode:'balanced'}]).junctions.length,1);
 assert.equal(cityTrafficLight({green:8,mode:'balanced'},10.5),'stop');assert.equal(cityTrafficLight({green:8,mode:'x'},10.5),'x');
 // A light on another street must not block a parallel road.
 const other={...road('c','simple',-20,15,20,15),duration:10};const s=createCityTraffic([other],[{x:0,z:0,green:8}],routes);s.time=15;s.vehicles[0].distance=19;stepCityTraffic(s,.1);assert.ok(s.vehicles[0].distance>19);
});
test('traffic light removal uses the city eraser and preserves the expected server state',()=>{
 const data=snapshot([]),f={id:'signal-1',x:0,z:0,mode:'balanced',green:12};data.city.city.signals=[f];
 const target=cityEraseTargets(data,{x:1,z:0})[0],plan=cityErasePlan(data,target);
 assert.equal(plan.action,'plan_signals');assert.deepEqual(plan.body,{features:[],expected:[f]});assert.equal(citySignals(data).length,1);
});
