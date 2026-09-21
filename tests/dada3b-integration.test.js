import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUARDIAN_ASSETS,guardianAssetFor} from '../src/games/dada3b/guardians.js';

const clientEngine=readFileSync(new URL('../src/games/dada3b/engine.js',import.meta.url),'utf8');
const serverEngine=readFileSync(new URL('../supabase/functions/dada3b/engine.js',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/dada3b/index.ts',import.meta.url),'utf8');
const cosmeticsMigration=readFileSync(new URL('../supabase/migrations/20260921225943_dada3b_teams_cosmetics_v2.sql',import.meta.url),'utf8');
const realtimeMigration=readFileSync(new URL('../supabase/migrations/20260921230003_dada3b_realtime_broadcast_v1.sql',import.meta.url),'utf8');
const seasonMigration=readFileSync(new URL('../supabase/migrations/20260921230844_dada3b_founder_season_v1.sql',import.meta.url),'utf8');

test('DADA client and authoritative server use byte-identical rules',()=>{
  assert.equal(clientEngine,serverEngine);
  assert.match(clientEngine,/teamMode/);
  assert.match(clientEngine,/winnerTeam/);
});

test('all eight canonical guardian slots exist without invented portrait URLs',()=>{
  const ids=['fr','dz','es','ma','it','tn','tr','ee'];
  assert.deepEqual(Object.keys(GUARDIAN_ASSETS),ids);
  for(const id of ids){
    const guardian=guardianAssetFor(id);
    assert.ok(guardian?.name);
    assert.ok(guardian?.value);
    assert.equal(guardian.portrait,null);
  }
});

test('2v2 matchmaking and cosmetic actions are server authoritative',()=>{
  assert.match(edge,/team2v2/);
  assert.match(edge,/targetPlayers=teamMode\?4:2/);
  assert.match(edge,/state\.winnerTeam/);
  assert.match(edge,/market_claim_reward/);
  assert.match(edge,/Cosmétique invalide/);
  assert.match(edge,/item_instances/);
  assert.match(edge,/pay_to_win!==false/);
});

test('DADA cosmetics are permanent, non-pay-to-win and loadouts stay service-only',()=>{
  assert.match(cosmeticsMigration,/dada_cosmetic_loadouts/);
  assert.match(cosmeticsMigration,/revoke all on public\.dada_cosmetic_loadouts from anon, authenticated/);
  assert.ok((cosmeticsMigration.match(/"pay_to_win":false/g)||[]).length>=18);
  assert.match(cosmeticsMigration,/DADA_TOTEM_FR_JUSTICE/);
  assert.match(cosmeticsMigration,/DADA_TOTEM_EE_WISDOM/);
  assert.match(cosmeticsMigration,/collectible_reward_rules/);
  assert.doesNotMatch(cosmeticsMigration,/permanent,false/);
});

test('DADA realtime stays private and room membership scoped',()=>{
  assert.match(realtimeMigration,/for select\s+to authenticated/);
  assert.match(realtimeMigration,/auth\.uid\(\).*any\(r\.member_ids\)/s);
  assert.match(realtimeMigration,/dada:room:/);
});


test('DADA founder season is visual-only and contains all eight nations',()=>{
  assert.match(seasonMigration,/'dada_cercle_fondateur'/);
  assert.match(seasonMigration,/'draft'/);
  assert.match(seasonMigration,/xp_multiplier=1/);
  assert.match(seasonMigration,/coins_multiplier=1/);
  assert.match(seasonMigration,/token_budget=0/);
  assert.match(seasonMigration,/"pay_to_win":false/);
  assert.match(seasonMigration,/"competitive_rules_unchanged":true/);
  const countries=['fr','dz','es','ma','it','tn','tr','ee'];
  for(const country of countries)assert.match(seasonMigration,new RegExp('"country":"'+country+'"'));
});
