import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const edge=readFileSync(new URL('../supabase/functions/city-3b/index.ts',import.meta.url),'utf8');
const gateway=readFileSync(new URL('../src/components/NexusCityGateway.jsx',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/WorldPage.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20260928122225_separate_world_city_progression.sql',import.meta.url),'utf8');

test('City API exposes a lightweight authenticated access check',()=>{
 assert.match(edge,/async function access\(uid:string,slot\?:number\)/);
 assert.match(edge,/select=city_id,name,origin_country,city_level,slot_no,map_preset:city->>map_preset,updated_at/);
 assert.match(edge,/if\(action==='access'\)return reply\(await access\(uid\)\)/);
});

test('Passport and City no longer depend on World progression',()=>{
 assert.match(gateway,/hasPassport/);
 assert.match(gateway,/setCityOpen\(true\)/);
 assert.doesNotMatch(gateway,/cityUnlockGuide|#monde-3b|premier Souvenir/i);
 assert.doesNotMatch(world,/cityUnlockGuide|cityUnlockMission|hubCitySync|hubCityProof|Débloquer ma Ville 3B/);
 assert.doesNotMatch(edge,/action==='sync_world'|nexus_city_sync_world|markWorldSync/);
});

test('new City 3B creation requires an active Passport, not a World Souvenir',()=>{
 assert.match(migration,/passport_state is distinct from 'active'/);
 assert.match(migration,/Passeport 3B inactif/);
 assert.doesNotMatch(migration,/member_world_state|beacons|Éveille d’abord un Souvenir/);
 assert.match(migration,/'progression','city_only'/);
});

test('City districts advance from City level only',()=>{
 assert.match(migration,/buildings \* 250/);
 assert.match(migration,/roads \* 120/);
 assert.match(migration,/displays \* 120/);
 assert.match(migration,/unlock_count := case/);
 assert.match(migration,/ranked\.rn <= unlock_count/);
 assert.doesNotMatch(migration,/member_profiles m where m\.user_id=p_user for update;threshold/);
});
