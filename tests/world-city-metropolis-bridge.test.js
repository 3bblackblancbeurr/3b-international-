import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const missions=JSON.parse(readFileSync(new URL('../src/world/hub/data/missions-v1.json',import.meta.url),'utf8'));
const catalog=readFileSync(new URL('../src/world/hub/mission-catalog.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../src/world/engine.js',import.meta.url),'utf8');
const worldEdge=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8');

test('World Hub no longer contains the City foundation mission',()=>{
 assert.equal(missions.some(row=>row.id==='first_foundation'),false);
 assert.doesNotMatch(catalog,/first_foundation/);
});

test('World reducer has no City proof or synchronization actions',()=>{
 assert.doesNotMatch(engine,/hubCitySync|hubCityProof/);
});

test('authoritative World engine never queries City state for progression',()=>{
 assert.doesNotMatch(worldEdge,/cityProof\(|nexus_cities\?user_id|nexus_city_placements|action=eq\.world_sync|hubCitySync|hubCityProof/);
});
