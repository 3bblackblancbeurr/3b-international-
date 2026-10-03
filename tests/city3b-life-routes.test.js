import test from 'node:test';
import assert from 'node:assert/strict';
import {cityLifeSnapshot,cityLifeNextStep,cityResidentRoutes} from '../src/city/city3b-life.js';
import {citySimulationSnapshot,cityTrafficRoutes} from '../src/city/city3b-simulation.js';
const data=()=>({city:{land_tier:1,city:{roads:[{x1:-60,z1:-12,x2:60,z2:-12,width:4}]}},districts:[{country:'France',unlocked:true}],buildings:[],placements:[{id:'home',x:-35,z:-25,footprint_w:2,footprint_h:2},{id:'shop',x:35,z:20,footprint_w:2,footprint_h:2}],life:{available:true,day:4,population:24,housingCapacity:36,jobs:12,employed:12,workingPopulation:15,happiness:62,mobility:50,needs:[{code:'water',label:'Eau',score:0,capacity:0,demand:24}],inhabitants:Array.from({length:24},(_,i)=>({id:'resident-'+i,name:'Voisin '+i,homePlacementId:'home',targetPlacementId:'shop',activity:'shopping'}))}});
test('a missing runtime cannot invent residents, traffic, jobs or events from decorative city levels',()=>{
 const value=data();delete value.life;assert.equal(cityLifeSnapshot(value).population,0);assert.equal(cityResidentRoutes(value).length,0);assert.equal(citySimulationSnapshot(value).jobs,0);assert.equal(cityTrafficRoutes(value).length,0);
 const life=cityLifeSnapshot(data());assert.equal(life.population,24);assert.equal(cityLifeNextStep(life).action.building,'WATER_3B');
});
test('resident paths connect saved homes to saved destinations along the road graph and stay within phone budget',()=>{
 const value=data(),routes=cityResidentRoutes(value,16);assert.equal(routes.length,16);
 for(const r of routes){assert.equal(r.moving,true);assert.ok(r.path.startsWith('M -34.00 -24.00'));assert.ok(r.path.endsWith('L 36.00 21.00'));assert.ok(r.path.split(' L ').length>3);assert.ok(r.duration>=8&&r.duration<=32);}
 assert.deepEqual(cityResidentRoutes(value,16),routes);
 value.placements[1].placement_state='stored';assert.equal(cityResidentRoutes(value).length,0);
});
test('home activity stays still and unknown placements never produce autonomous phantom destinations',()=>{
 const value=data();value.life.inhabitants=[{id:'resident-1',homePlacementId:'home',targetPlacementId:'home',activity:'home'},{id:'resident-2',homePlacementId:'missing',targetPlacementId:'shop',activity:'work'}];
 const routes=cityResidentRoutes(value);assert.equal(routes.length,1);assert.equal(routes[0].moving,false);assert.equal(routes[0].x,-34);
});
test('pedestrian paths carry residents while motorways are excluded from walking routes',()=>{
 const value=data();value.city.city.roads[0].roadType='pedestrian';value.city.city.roads[0].width=2;assert.ok(cityResidentRoutes(value).length>0);
 value.city.city.roads[0].roadType='motorway';value.city.city.roads[0].width=10;assert.equal(cityResidentRoutes(value).length,0);
});
