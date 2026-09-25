import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMetropolisRuntimeItems,HUB_METROPOLIS,hubDistrictPosition,hubPortalPosition,metropolisRoadItems,pedestrianLaneMinimumClearance,hubEvolutionState} from '../src/world/hub/metropolis.js';
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


test('the eight heritage esplanades are dispersed at the real country portals',()=>{
 const runtime=buildMetropolisRuntimeItems(plan,'desktop');
 const platforms=runtime.items.filter(item=>item.type==='hubHeritagePlatform');
 assert.equal(platforms.length,8);
 assert.equal(runtime.meta.heritagePlatforms,8);
 assert.ok(platforms.every(item=>Math.hypot(item.x,item.z)>300&&Math.hypot(item.x,item.z)<HUB_METROPOLIS.radius));
 assert.equal(new Set(platforms.map(item=>item.regionId)).size,8);
 assert.ok(platforms.every(item=>item.evolutionStage===0));
});

test('restoring heritage visibly grows city density, transport life and vertical links',()=>{
 const stage0=buildMetropolisRuntimeItems(plan,'mobileMedium');
 const stage2=buildMetropolisRuntimeItems(plan,'mobileMedium',{seals:['france','algerie','espagne']});
 const final=buildMetropolisRuntimeItems(plan,'mobileMedium',{seals:['france','algerie','espagne','maroc','italie','tunisie','turquie','estonie'],restoredRegions:['france','algerie','espagne','maroc','italie','tunisie','turquie','estonie']});
 assert.equal(hubEvolutionState(plan,{seals:[]}).stage,0);
 assert.equal(stage2.meta.evolutionStage,2);
 assert.equal(final.meta.evolutionStage,4);
 assert.ok(stage2.meta.structures>stage0.meta.structures);
 assert.ok(stage2.meta.traffic>stage0.meta.traffic);
 assert.ok(stage2.meta.skybridges>stage0.meta.skybridges);
 assert.equal(final.meta.skybridges,8);
 assert.equal(final.items.filter(item=>item.type==='hubHeritagePlatform'&&item.restored).length,8);
 assert.ok(final.items.filter(item=>item.type==='hubBuilding').every(item=>item.buildStatus==='active'));
});


test('Hub V4 runtime materializes plazas, landmarks, water and physical transit lines',()=>{
 const runtime=buildMetropolisRuntimeItems(plan,'desktop');
 assert.equal(runtime.meta.civicPlazas,10);
 assert.equal(runtime.meta.districtLandmarks,10);
 assert.ok(runtime.meta.waterFeatures>=5);
 assert.ok(runtime.meta.transitLinks>=19);
 assert.equal(runtime.items.filter(item=>item.type==='hubCivicPlaza').length,10);
 assert.equal(runtime.items.filter(item=>item.type==='hubDistrictLandmark').length,10);
 assert.ok(runtime.items.filter(item=>item.type==='hubWaterFeature').length>=5);
 assert.ok(runtime.items.filter(item=>item.type==='hubTransitLink').length>=19);
});

test('Hub V4 decorative infrastructure never steals the player interaction focus',()=>{
 const runtime=buildMetropolisRuntimeItems(plan,'desktop');
 const decorative=new Set(['hubRoad','hubStructure','hubTraffic','hubSkybridge','hubHeritagePlatform','hubCivicPlaza','hubDistrictLandmark','hubWaterFeature','hubTransitLink']);
 const rows=runtime.items.filter(item=>decorative.has(item.type));
 assert.ok(rows.length>100);
 assert.ok(rows.every(item=>item.range===-1));
 assert.ok(runtime.items.filter(item=>item.type==='hubStructure').every(item=>item.civicUse&&item.usefulFrontage===true));
});

test('Hub V4 exposes the exact story milestone attached to city evolution',()=>{
 const four=hubEvolutionState(plan,{seals:['france','algerie','espagne','maroc']});
 const seven=hubEvolutionState(plan,{seals:['france','algerie','espagne','maroc','italie','tunisie','turquie']});
 const eight=hubEvolutionState(plan,{seals:['france','algerie','espagne','maroc','italie','tunisie','turquie','estonie']});
 assert.equal(four.milestone.id,'tower_transformation');
 assert.equal(seven.milestone.id,'beyond_the_guardians');
 assert.equal(eight.milestone.id,'circle_restored');
 assert.equal(eight.nextMilestone,null);
});


test('Hub V4 puts the current city story milestone physically at the Broken Circle Tower',()=>{
 const runtime=buildMetropolisRuntimeItems(plan,'mobileMedium',{seals:['france','algerie','espagne','maroc']});
 const stories=runtime.items.filter(item=>item.type==='hubMilestone');
 assert.equal(runtime.meta.milestoneStories,1);
 assert.equal(stories.length,1);
 assert.equal(stories[0].name,'La Tour se transforme');
 assert.equal(stories[0].fragments,4);
 assert.ok(stories[0].detail.includes('Tour'));
 assert.ok(stories[0].range>5);
});
