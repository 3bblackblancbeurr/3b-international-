import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const missions=JSON.parse(readFileSync(new URL('../src/world/hub/data/missions-v1.json',import.meta.url),'utf8'));
const catalog=readFileSync(new URL('../src/world/hub/mission-catalog.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../src/world/engine.js',import.meta.url),'utf8');
const worldEdge=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8');

test('World urbanism mission stays local and does not require creating Ma Ville',()=>{
 const foundation=missions.find(row=>row.id==='first_foundation');
 assert.equal(foundation.district,'city3b_portal');
 assert.equal(foundation.objectives.length,3);
 assert.match(catalog,/first_foundation/);
 assert.doesNotMatch(foundation.objectives.join(' '),/synchroniser|fonder une ville|ta ville/);
});

test('World reducer has no City proof or synchronization actions',()=>{
 assert.doesNotMatch(engine,/hubCitySync|hubCityProof/);
});

test('authoritative World engine never queries City state for progression',()=>{
 assert.doesNotMatch(worldEdge,/cityProof\(|nexus_cities\?user_id|nexus_city_placements|action=eq\.world_sync|hubCitySync|hubCityProof/);
});
