import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
const createGate=readFileSync(new URL('../supabase/migrations/20260920012315_nexus_city_require_world_souvenir.sql',import.meta.url),'utf8');

test('City API exposes a lightweight authenticated access check',()=>{
 assert.match(edge,/async function access\(uid:string\)/);
 assert.match(edge,/select=city_id,name,origin_country,city_level&limit=1/);
 assert.match(edge,/if\(action==='access'\)return reply\(await access\(uid\)\)/);
});

test('Nexus and World share one guided unlock contract',()=>{
 assert.match(gateway,/cityUnlockGuide/);
 assert.match(gateway,/city3bRequest\('access'/);
 assert.match(world,/cityUnlockGuideRequested/);
 assert.match(world,/world-city-unlock-guide/);
 assert.match(world,/followCityUnlock/);
});


test('new City 3B creation requires a server-owned World Souvenir but existing cities are returned first',()=>{
 const existingReturn=createGate.indexOf('if cid is not null then return cid');
 const souvenirGate=createGate.indexOf("jsonb_array_length(coalesce(data->'beacons','[]'::jsonb))>0");
 assert.ok(existingReturn>=0);
 assert.ok(souvenirGate>existingReturn,'existing city must bypass the new-city gate');
 assert.match(createGate,/Éveille d’abord un Souvenir dans le Monde du 3B/);
});
