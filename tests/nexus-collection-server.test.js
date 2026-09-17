import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/nexus-collection-v2.sql',import.meta.url),'utf8');const client=readFileSync(new URL('../src/nexus/nexus-state-client.js',import.meta.url),'utf8');
test('collectible display requires authenticated ownership and current city revision',()=>{assert.match(sql,/auth\.uid\(\)/);assert.match(sql,/owner_id=v_uid/);assert.match(sql,/revision<>p_expected_revision/);assert.match(sql,/item_not_owned/);});
test('display cannot overlap buildings or another display',()=>{assert.match(sql,/nexus_can_place_v2/);assert.match(sql,/display_blocked/);assert.match(sql,/city_id=v_city\.city_id and x=p_x and z=p_z/);});
test('collection mutations remain crypto-free and server journaled',()=>{assert.ok((sql.match(/'token',0/g)||[]).length>=3);assert.match(sql,/nexus_city_journal/);assert.doesNotMatch(sql,/coins\s*=\s*coins\s*[+-]/);});
test('client uses only guarded display RPCs',()=>{assert.match(client,/nexus_display_collectible/);assert.match(client,/nexus_remove_collectible_display/);assert.match(client,/p_expected_revision/);});
