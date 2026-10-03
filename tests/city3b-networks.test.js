import test from 'node:test';
import assert from 'node:assert/strict';
import {cityNetworkCheck,cityRailRoutes} from '../src/city/city3b-networks.js';
import {cityTrafficRoutes} from '../src/city/city3b-simulation.js';
const base={serverTime:'2026-10-03T00:00:00Z',city:{city_level:5,city:{roads:[{id:'r',x1:0,z1:0,x2:80,z2:0,width:4}],networks:[{id:'a',kind:'rail',x1:0,z1:25,x2:80,z2:25,width:2}]}},life:{available:true,population:80,employed:30,mobility:70},buildings:[{code:'RAIL_STATION_3B',metadata:{service:'rail'}},{code:'BUS_STOP_3B',metadata:{service:'transit'}}],placements:[]};
const station=(id,x)=>({id,building_code:'RAIL_STATION_3B',placement_state:'placed',x,z:30,footprint_w:4,footprint_h:4});
test('trains require population, two completed stations and continuous rails',()=>{
 assert.equal(cityRailRoutes(base).length,0);
 const city={...base,placements:[station('a',0),station('b',74)]};assert.equal(cityRailRoutes(city).length,1);
 assert.equal(cityRailRoutes({...city,life:{available:true,population:0}}).length,0);
 assert.equal(cityRailRoutes({...city,placements:[station('a',0),{...station('b',74),construction_started_at:'2026-10-03T00:00:00Z',construction_ready_at:'2026-10-03T00:01:00Z'}]}).length,0);
 assert.equal(cityRailRoutes({...city,city:{...base.city,city:{...base.city.city,networks:[]}}}).length,0);
});
test('only a completed bus facility connected to a road spawns buses',()=>{
 assert.ok(cityTrafficRoutes(base).every(r=>r.vehicleType==='car'));
 const bus={id:'b',building_code:'BUS_STOP_3B',placement_state:'placed',x:30,z:5,footprint_w:1,footprint_h:1};
 assert.ok(cityTrafficRoutes({...base,placements:[bus]}).some(r=>r.vehicleType==='bus'));
 assert.ok(cityTrafficRoutes({...base,placements:[{...bus,z:100}]}).every(r=>r.vehicleType==='car'));
 assert.ok(cityTrafficRoutes({...base,placements:[{...bus,placement_state:'stored'}]}).every(r=>r.vehicleType==='car'));
});
test('network levels and free terrain rules match bridges and tunnels',()=>{
 const f={kind:'bridge',x1:0,z1:0,x2:30,z2:0,width:4};
 assert.equal(cityNetworkCheck({...base,city:{city_level:1}},[f]).valid,false);
 assert.equal(cityNetworkCheck(base,[f]).valid,true);
 assert.equal(cityNetworkCheck(base,[{...f,x2:8}]).valid,false);
 assert.equal(cityNetworkCheck({...base,placements:[{x:12,z:-1,footprint_w:4,footprint_h:4,placement_state:'placed'}]},[f]).valid,false);
 assert.equal(cityNetworkCheck({...base,placements:[{x:12,z:-1,footprint_w:4,footprint_h:4,placement_state:'placed'}]},[{...f,kind:'tunnel'}]).valid,true);
});
