import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/20260919_world_city_bridge.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const portal=readFileSync(new URL('../src/components/City3BPortal.jsx',import.meta.url),'utf8');

test('legacy World-to-City bridge remains inaccessible to browser roles',()=>{
 assert.match(sql,/revoke all on function public\.nexus_city_sync_world\(uuid\) from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function public\.nexus_city_sync_world\(uuid\) to service_role/i);
});

test('public City gameplay no longer invokes the legacy bridge',()=>{
 assert.doesNotMatch(edge,/action==='sync_world'|nexus_city_sync_world/);
 assert.doesNotMatch(portal,/call\('sync_world'\)|Monde 3B synchronisé/);
 assert.match(portal,/call\('snapshot'\)/);
 assert.match(edge,/https:\/\/localhost/);
 assert.match(edge,/capacitor:\/\/localhost/);
});
