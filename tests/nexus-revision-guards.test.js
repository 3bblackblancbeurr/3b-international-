import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const client=readFileSync(new URL('../src/nexus/nexus-state-client.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../src/nexus/NexusCityPageV2.jsx',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/nexus-upgrade-remove-revision-guards.sql',import.meta.url),'utf8');
test('upgrade and removal send the current city revision',()=>{assert.match(client,/upgradeNexusBuilding\(\{placementId,expectedRevision/);assert.match(client,/removeNexusBuilding\(\{placementId,expectedRevision/);assert.match(client,/p_expected_revision:Number\(expectedRevision\)/);assert.match(page,/upgradeNexusBuilding\(\{placementId:p\.id,expectedRevision:sceneRevision\}\)/);assert.match(page,/removeNexusBuilding\(\{placementId:p\.id,expectedRevision:sceneRevision\}\)/);});
test('server rejects stale upgrade and removal snapshots',()=>{assert.match(sql,/nexus_upgrade_building\([\s\S]*p_expected_revision bigint/);assert.match(sql,/nexus_remove_building\([\s\S]*p_expected_revision bigint/);assert.equal((sql.match(/revision_conflict/g)||[]).length>=2,true);assert.match(sql,/for update/);});
test('stale multi-device errors are surfaced to the player',()=>{const count=(page.match(/Ta ville a changé sur un autre appareil/g)||[]).length;assert.ok(count>=4);});
