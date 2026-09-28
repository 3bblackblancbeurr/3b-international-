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

test('Passport is the only gameplay gate before opening City 3B',()=>{
 assert.match(gateway,/hasPassport/);
 assert.match(gateway,/account\.passport\?\.userId === uid/);
 assert.match(gateway,/setCityOpen\(true\)/);
 assert.doesNotMatch(gateway,/cityUnlockGuide|first Souvenir|#monde-3b/);
});

test('World 3B contains no City unlock mission or City gameplay panel',()=>{
 assert.doesNotMatch(world,/cityUnlockGuide|cityUnlockMission|City3BPanel|panel==='city3b'|Débloquer ma Ville 3B|Ma Ville 3B/);
});

test('City Edge no longer exposes a World-to-City progression action',()=>{
 assert.doesNotMatch(edge,/action==='sync_world'|nexus_city_sync_world|markWorldSync/);
 assert.match(edge,/action==='snapshot'/);
 assert.match(edge,/action==='plan_roads'/);
});
