import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMetropolisRuntimeItems,HUB_METROPOLIS,hubDistrictPosition,hubCountryGatePosition,metropolisRoadItems,pedestrianLaneMinimumClearance} from '../src/world/hub/metropolis.js';
import {HUB_MISSION_SIGNAL_RULES} from '../src/world/hub/mission-signals.js';
import {HUB_MISSION_ACTION_PLANS} from '../src/world/hub/mission-actions.js';
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

test('all 20 canonical Hub missions are action-driven through signals or physical action plans',()=>{
 assert.equal(plan.firstPlayableSlice.missions.length,4);
 const signalIds=Object.keys(HUB_MISSION_SIGNAL_RULES),actionIds=Object.keys(HUB_MISSION_ACTION_PLANS);
 const missionIds=JSON.parse(readFileSync(new URL('../src/world/hub/data/missions-v1.json',import.meta.url),'utf8')).map(m=>m.id).sort();
 const covered=[...new Set([...signalIds,...actionIds])].sort();
 assert.equal(covered.length,20);
 assert.deepEqual(covered,missionIds);
 assert.equal(signalIds.length+actionIds.length,20,'a mission must have one authoritative driver');
 for(const rules of Object.values(HUB_MISSION_SIGNAL_RULES))assert.ok(rules.length>=2);
 for(const stages of Object.values(HUB_MISSION_ACTION_PLANS))assert.ok(stages.length>=1);
});

test('all 16 canonical secrets have a live unlock contract',()=>{
 const secrets=JSON.parse(readFileSync(new URL('../src/world/hub/data/secrets-v1.json',import.meta.url),'utf8'));
 assert.equal(secrets.length,16);
 assert.equal(HUB_SECRET_IMPLEMENTED.size,16);
 for(const secret of secrets)assert.ok(HUB_SECRET_IMPLEMENTED.has(secret.id),secret.id);
});

test('the eight country gates use the canonical dispersed Cité anchors',()=>{
 const portals=plan.countries.map(country=>hubCountryGatePosition(plan,country.id));
 assert.equal(portals.length,8);
 assert.ok(portals.every(Boolean));
 assert.equal(new Set(portals.map(point=>Math.round(point.x)+':'+Math.round(point.z))).size,8);
 assert.ok(portals.every(point=>Math.hypot(point.x,point.z)>250&&Math.hypot(point.x,point.z)<HUB_METROPOLIS.radius));
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


test('human-scale pedestrian shortcuts break the hub ring-and-spoke pattern',()=>{
 const roads=metropolisRoadItems(plan),lanes=roads.filter(r=>r.kind==='lane');
 assert.equal(lanes.length,10);
 assert.ok(lanes.every(r=>r.width===6.5));
 assert.ok(lanes.every(r=>r.length>10));
 assert.ok(lanes.every(r=>pedestrianLaneMinimumClearance(plan,r)>12),'pedestrian lanes must stay clear of canonical building footprints');
 const runtime=buildMetropolisRuntimeItems(plan,'desktop');
 const trafficRoutes=new Set(runtime.items.filter(i=>i.type==='hubTraffic').map(i=>i.routeId));
 assert.ok(lanes.every(lane=>!trafficRoutes.has(lane.id)));
});


test('Cité V3 runtime materializes platforms waterways bridges skyline and eight gate sectors',()=>{
 const mobile=buildMetropolisRuntimeItems(plan,'mobileMedium');
 assert.equal(mobile.meta.platforms,10);
 assert.equal(mobile.meta.waterways,5);
 assert.equal(mobile.meta.bridges,8);
 assert.equal(mobile.meta.gateSectors,8);
 assert.ok(mobile.meta.skyline>=14);
 assert.equal(mobile.items.filter(item=>item.type==='hubPlatform').length,10);
 assert.equal(mobile.items.filter(item=>item.type==='hubWaterway').length,5);
 assert.equal(mobile.items.filter(item=>item.type==='hubBridge').length,8);
 assert.equal(mobile.items.filter(item=>item.type==='hubGateSector').length,8);
});

test('restored countries visibly drive persistent Hub evolution',()=>{
 const evolved=buildMetropolisRuntimeItems(plan,'mobileHigh',{
  seals:['france','algerie','espagne'],
  restoredRegions:['france','algerie','espagne'],
  restoredCount:3,
 });
 assert.equal(evolved.meta.restoredCount,3);
 const gates=evolved.items.filter(item=>item.type==='hubGateSector');
 assert.equal(gates.filter(item=>item.restored).length,3);
 assert.equal(evolved.items.filter(item=>item.type==='hubEvolution').length,3);
 const core=evolved.items.find(item=>item.type==='hubEvolutionCore');
 assert.equal(core.restoredCount,3);
 assert.equal(core.name,'Mémoire partagée');
});
