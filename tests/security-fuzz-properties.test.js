import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldGlobalRewardIntents} from '../src/world/global-rewards.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base=()=>({
 region:'hub',
 visited:[],
 beacons:[],
 hub:{events:[],secrets:[],missions:{}},
 adventure:{discoveries:[],encounter:null}
});

test('fuzz: arbitrary unknown World actions never mint global reward intents',()=>{
 let seed=0x3b2026;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let i=0;i<1000;i++){
  const before=base(),after=structuredClone(before);
  const type='unknown_'+next().toString(36);
  const action={type,id:next().toString(36),region:'x'+next().toString(36)};
  assert.deepEqual(worldGlobalRewardIntents(before,after,action),[]);
 }
});

test('replay: unchanged state transition produces no second reward intent',()=>{
 const before=base(),after=structuredClone(before);
 after.beacons=['france:0'];
 const action={type:'beacon',id:'france:0'};
 assert.equal(worldGlobalRewardIntents(before,after,action).length,1);
 assert.deepEqual(worldGlobalRewardIntents(after,after,action),[]);
});

test('reward identifiers are deterministic for identical validated transitions',()=>{
 const before=base(),after=structuredClone(before);
 after.visited=['france'];
 const action={type:'visit',region:'france'};
 assert.deepEqual(
  worldGlobalRewardIntents(before,after,action),
  worldGlobalRewardIntents(before,after,action)
 );
});

test('database migrations encode idempotence and concurrency primitives',()=>{
 const economy=read('supabase/migrations/20260920162537_threeb_global_xp_150_antifarm_token_foundation.sql');
 const outbox=read('supabase/migrations/20260920163347_threeb_world_reward_transactional_outbox_v1.sql');
 const city=read('supabase/migrations/20260920163234_threeb_city_economy_global_level_unification.sql');

 assert.match(economy,/pg_advisory_xact_lock/i);
 assert.match(outbox,/unique\s*\(user_id,reward_code,event_id\)/i);
 assert.match(outbox,/for update skip locked/i);
 assert.match(city,/p_request_id/i);
 assert.match(city,/threeb_level_from_xp/i);
});

test('future 3BC staging remains architecturally separate from XP and Coins',()=>{
 const security=read('supabase/migrations/20260920163251_quarantine_disabled_3bc_sql_ledger_20260920.sql');
 const doc=read('docs/3B_SECURITY/INVARIANTS.md');
 assert.match(security,/3bc_disabled_security_gate/i);
 assert.match(doc,/SQL game balances are never authoritative 3BC balances/i);
});
