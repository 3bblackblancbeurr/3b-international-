import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');

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
