import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMetropolisRuntimeItems,HUB_METROPOLIS,hubDistrictPosition,hubPortalPosition} from '../src/world/hub/metropolis.js';
import {HUB_MISSION_SIGNAL_RULES} from '../src/world/hub/mission-signals.js';
import {HUB_SECRET_IMPLEMENTED} from '../src/world/hub/secret-runtime.js';
import {HUB_BUILDING_IDS} from '../src/world/hub/activity-catalog.js';
import {findPath} from '../src/world/navigation.js';

const plan=JSON.parse(readFileSync(new URL('../src/world/hub/data/hub-master-plan-v2.json',import.meta.url),'utf8'));

test('Cité des Huit Héritages keeps the canonical premium scale',()=>{
 assert.equal(HUB_METROPOLIS.width,1800);
 assert.equal(HUB_METROPOLIS.depth,1400);
 assert.equal(HUB_METROPOLIS.radius,650);
 assert.equal(HUB_METROPOLIS.cellSize,150);
});

test('metropolis runtime exposes the 19 canonical buildings plus adaptive city fabric',()=>{
 const mobile=buildMetropolisRuntimeItems(plan,'mobileMedium');
 const desktop=buildMetropolisRuntimeItems(plan,'desktop');
 assert.equal(mobile.meta.buildings,19);
 assert.equal(HUB_BUILDING_IDS.length,19);
 assert.ok(mobile.meta.structures>=40);
 assert.ok(desktop.meta.structures>mobile.meta.structures);
 assert.ok(mobile.meta.roads>=19);
 assert.ok(mobile.meta.traffic>=5);
 for(const building of mobile.items.filter(i=>i.type==='hubBuilding')){
  assert.ok(Number.isFinite(building.x)&&Number.isFinite(building.z));
  assert.ok(Number.isFinite(building.buildingX)&&Number.isFinite(building.buildingZ));
  assert.ok(Math.hypot(building.buildingX,building.buildingZ)<HUB_METROPOLIS.radius);
  assert.ok(Math.hypot(building.x-building.buildingX,building.z-building.buildingZ)>building.range);
 }
});

test('all 20 canonical Hub missions are action-driven',()=>{
 assert.equal(plan.firstPlayableSlice.missions.length,4);
 assert.equal(Object.keys(HUB_MISSION_SIGNAL_RULES).length,20);
 const missionIds=JSON.parse(readFileSync(new URL('../src/world/hub/data/missions-v1.json',import.meta.url),'utf8')).map(m=>m.id).sort();
 assert.deepEqual(Object.keys(HUB_MISSION_SIGNAL_RULES).sort(),missionIds);
 for(const rules of Object.values(HUB_MISSION_SIGNAL_RULES))assert.ok(rules.length>=2);
});

test('all 16 canonical secrets have a live unlock contract',()=>{
 const secrets=JSON.parse(readFileSync(new URL('../src/world/hub/data/secrets-v1.json',import.meta.url),'utf8'));
 assert.equal(secrets.length,16);
 assert.equal(HUB_SECRET_IMPLEMENTED.size,16);
 for(const secret of secrets)assert.ok(HUB_SECRET_IMPLEMENTED.has(secret.id),secret.id);
});

test('the eight country gates sit on the outer metropolitan ring',()=>{
 const catalog=readFileSync(new URL('../src/world/catalog.js',import.meta.url),'utf8');
 const portals=[[-22,-24],[14,-40],[43,-24],[42,13],[24,42],[-9,47],[-42,25],[-48,-8]].map(hubPortalPosition);
 assert.equal(portals.length,8);
 assert.ok(portals.every(p=>Math.hypot(p.x,p.z)>300&&Math.hypot(p.x,p.z)<HUB_METROPOLIS.radius));
 assert.match(catalog,/portal:\[-22,-24\]/);
});

test('large-map pathfinding stays bounded and finds a simple long route',()=>{
 const path=findPath({x:-420,z:-260},{x:420,z:260},[],HUB_METROPOLIS.radius);
 assert.ok(path.length>=1);
 assert.deepEqual(path.at(-1),{x:420,z:260});
});

test('City 3B district remains a real metropolitan destination',()=>{
 const city=hubDistrictPosition(plan,'city3b_portal');
 assert.ok(city);
 assert.ok(Math.hypot(city.x,city.z)<HUB_METROPOLIS.radius);
 const planning=plan.buildings.find(b=>b.id==='city_planning_office');
 const gallery=plan.buildings.find(b=>b.id==='city_gallery');
 assert.equal(planning.district,'city3b_portal');
 assert.equal(gallery.district,'city3b_portal');
});
