import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMetropolisRuntimeItems,hubCountryGatePosition} from '../src/world/hub/metropolis.js';

const plan=JSON.parse(readFileSync(new URL('../src/world/hub/data/hub-master-plan-v2.json',import.meta.url),'utf8'));
const scene=readFileSync(new URL('../src/world/scene.js',import.meta.url),'utf8');
const visuals=readFileSync(new URL('../src/world/premium-hub-visuals.js',import.meta.url),'utf8');
const cartography=readFileSync(new URL('../src/world/Cartography.jsx',import.meta.url),'utf8');
const home=readFileSync(new URL('../src/components/WorldPortalCard.jsx',import.meta.url),'utf8');
const hud=readFileSync(new URL('../src/world/WorldHUD.jsx',import.meta.url),'utf8');

test('Cité V3 is a multi-district metropolis and never a small eight-button ring',()=>{
 assert.equal(plan.districts.length,10);
 assert.equal(plan.buildings.length,19);
 assert.equal(plan.countries.length,8);
 assert.equal(plan.visualLaw.safeZone,true);
 assert.match(plan.visualLaw.rule,/métropole multi-quartiers/i);
 assert.match(plan.visualLaw.rule,/jamais.*petit cercle/i);
 assert.match(home,/cite-huit-heritages-canon-v3\.svg/);
 assert.doesNotMatch(home,/CircleArtwork|nexus-ring-scene|nexus-authentic-circle/);
});

test('the eight Gates are spatially dispersed around the real Hub map',()=>{
 const points=plan.countries.map(country=>({country,...hubCountryGatePosition(plan,country.id)}));
 assert.equal(points.length,8);
 assert.equal(new Set(points.map(point=>Math.round(point.x)+':'+Math.round(point.z))).size,8);
 for(const point of points){
  assert.ok(Math.hypot(point.x,point.z)>250,point.country.country+' must not collapse into the center');
 }
});

test('Hub V3 runtime exposes useful city infrastructure on mobile',()=>{
 const runtime=buildMetropolisRuntimeItems(plan,'mobileMedium');
 const counts=type=>runtime.items.filter(item=>item.type===type).length;
 assert.equal(counts('hubBuilding'),19);
 assert.equal(counts('hubPlatform'),10);
 assert.equal(counts('hubWaterway'),5);
 assert.equal(counts('hubBridge'),8);
 assert.equal(counts('hubGateSector'),8);
 assert.ok(counts('hubSkyline')>=14);
 assert.ok(counts('hubRoad')>=19);
 assert.ok(counts('hubTraffic')>=5);
});

test('scene renders every V3 infrastructure family instead of treating them as data only',()=>{
 for(const name of [
  'createPremiumHubPlatform','createPremiumHubWaterway','createPremiumHubBridge',
  'createPremiumHubSkyline','createPremiumHubGateSector','createPremiumHubEvolution',
 ]){
  assert.match(scene,new RegExp(name));
  assert.match(visuals,new RegExp('export function '+name));
 }
 for(const type of ['hubWaterway','hubPlatform','hubBridge','hubGateSector','hubSkyline','hubEvolution']){
  assert.match(scene,new RegExp("item\\.type==='"+type+"'"));
 }
});

test('world cartography presents canals bridges platforms and territorial Gates',()=>{
 assert.match(cartography,/HubInfrastructure/);
 assert.match(cartography,/hubWaterway/);
 assert.match(cartography,/hubBridge/);
 assert.match(cartography,/hubPlatform/);
 assert.match(cartography,/hubGateSector/);
 assert.match(cartography,/traits or = passerelles/);
 assert.match(cartography,/bleu = canaux/);
});

test('city progression creates persistent visible return signals for restored countries',()=>{
 const progress=['france','algerie','espagne','maroc'];
 const runtime=buildMetropolisRuntimeItems(plan,'mobileMedium',{seals:progress,restoredRegions:progress,restoredCount:4});
 assert.equal(runtime.meta.restoredCount,4);
 assert.equal(runtime.items.filter(item=>item.type==='hubGateSector'&&item.restored).length,4);
 assert.equal(runtime.items.filter(item=>item.type==='hubEvolution').length,4);
 const core=runtime.items.find(item=>item.type==='hubEvolutionCore');
 assert.equal(core.restoredCount,4);
 assert.equal(core.name,'Cité en mouvement');
});


test('Hub HUD makes the safe zone and eight-step evolution explicit',()=>{
 assert.match(hud,/world-hub-state/);
 assert.match(hud,/ZONE SÛRE/);
 assert.match(hud,/HÉRITAGES RELIÉS/);
 assert.match(hud,/nexusLevel\(save\)/);
});
