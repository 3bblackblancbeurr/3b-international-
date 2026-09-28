import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worldEngine=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8');
const cityEdge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
const cityPanel=readFileSync(new URL('../src/city/City3BPanel.jsx',import.meta.url),'utf8');
const missionCatalog=readFileSync(new URL('../src/world/hub/mission-catalog.js',import.meta.url),'utf8');
const missionSignals=readFileSync(new URL('../src/world/hub/mission-signals.js',import.meta.url),'utf8');
const missions=readFileSync(new URL('../src/world/hub/data/missions-v1.json',import.meta.url),'utf8');

test('authoritative World engine never reads City 3B state',()=>{
 assert.doesNotMatch(worldEngine,/async function cityProof|nexus_cities\?user_id|nexus_city_placements|action=eq\.world_sync/);
 assert.match(worldEngine,/hubCityProof'\|\|entry\.action\.type==='hubCitySync'\)throw Error\('Action inconnue\.'/);
});

test('World mission system contains no City-builder objectives',()=>{
 assert.doesNotMatch(missionCatalog,/first_foundation/);
 assert.doesNotMatch(missionSignals,/first_foundation|type:'city'/);
 assert.doesNotMatch(missions,/first_foundation|Ville 3B|synchroniser la ville avec le Monde/);
});

test('World UI and City UI have independent gameplay flows',()=>{
 assert.doesNotMatch(world,/City3BPanel|cityUnlockGuide|hubCitySync|hubCityProof|Ma Ville 3B|Débloquer ma Ville 3B/);
 assert.doesNotMatch(cityPanel,/onWorldCitySync|sync_world|Monde du 3B/);
 assert.doesNotMatch(cityEdge,/action==='sync_world'|nexus_city_sync_world|markWorldSync/);
 assert.match(cityEdge,/action==='snapshot'/);
 assert.match(cityEdge,/action==='plan_roads'/);
});
