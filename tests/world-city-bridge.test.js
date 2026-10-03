import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const cityEdge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const worldEdge=readFileSync(new URL('../supabase/functions/world-engine/index.ts',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');

test('City API has no World synchronization action',()=>{
 assert.doesNotMatch(cityEdge,/action==='sync_world'|nexus_city_sync_world|markWorldSync/);
 assert.match(cityEdge,/action==='plan_roads'/);
 assert.match(cityEdge,/nexus_city_recalculate/);
});

test('City UI loads its own snapshot and progression',()=>{
 assert.match(portal,/call\('snapshot'\)/);
 assert.match(portal,/call\('life'\)/);
 assert.match(portal,/visibilitychange/);
 assert.doesNotMatch(portal,/Recalculer ma progression/);
 assert.doesNotMatch(portal,/call\('sync_world'\)|Monde 3B synchronisé/);
});

test('World UI and authoritative engine do not consume City proof',()=>{
 assert.doesNotMatch(world,/hubCitySync|hubCityProof|City3BPanel|cityUnlockGuide/);
 assert.doesNotMatch(worldEdge,/cityProof\(|hubCitySync|hubCityProof/);
});
