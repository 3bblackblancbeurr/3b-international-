import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));

const handoff=json('unreal/ThreeBWorld/Data/France/france-nexus-handoff-v1.json');
const coop=json('unreal/ThreeBWorld/Data/France/france-coop-session-v1.json');
const reconnect=json('unreal/ThreeBWorld/Data/France/france-checkpoint-reconnect-v1.json');
const manifest=json('unreal/ThreeBWorld/Data/France/france-editor-asset-manifest.json');

test('France Nexus handoff matches the deployed one-time native launch contract',()=>{
 const launch=read('supabase/functions/world-unreal-launch/index.ts');
 const redeem=read('supabase/functions/world-unreal-redeem/index.ts');
 assert.equal(handoff.launch.request_function,'world-unreal-launch');
 assert.equal(handoff.launch.ticket_ttl_seconds,90);
 assert.equal(handoff.redeem.function,'world-unreal-redeem');
 assert.equal(handoff.redeem.native_session_ttl_seconds,1800);
 assert.equal(handoff.identity.separate_unreal_account,false);
 assert.equal(handoff.france_return.persist_before_map_transition,true);
 assert.equal(handoff.france_return.fragment_or_reward_must_already_be_server_committed,true);
 assert.match(launch,/Date\.now\(\)\+90_000/);
 assert.match(launch,/threebworld:\/\/launch\?ticket=/);
 assert.doesNotMatch(launch,/launch\?ticket=.*&api=/);
 assert.match(redeem,/p_session_ttl_seconds:1800/);
 assert.match(redeem,/Ce ticket 3B est expiré ou déjà utilisé/);
 for(const forbidden of ['access_token','refresh_token','service_role','password']){
  assert.ok(handoff.launch.forbidden_url_material.includes(forbidden),forbidden);
 }
});

test('France entry and return target only canonical manifest worlds and safe checkpoints',()=>{
 const assets=new Set(manifest.required_assets.map(x=>x.path));
 assert.ok(assets.has(handoff.france_entry.required_world));
 assert.ok(assets.has(handoff.france_return.target_world));
 const cps=new Set(reconnect.checkpoints.map(x=>x.id));
 assert.ok(cps.has(handoff.france_entry.initial_checkpoint));
 assert.ok(cps.has(handoff.france_return.safe_checkpoint));
 assert.equal(handoff.france_return.required_phase,'return_nexus');
});

test('France coop contract maps to the authoritative party runtime RPC',()=>{
 const sql=read('supabase/migrations/20260921012440_world_party_runtime_authority_v1.sql');
 assert.equal(coop.backend.rpc,'world_party_runtime_command');
 assert.deepEqual(coop.backend.actions,['status','heartbeat','down','revive','objective']);
 assert.equal(coop.backend.client_direct_table_access,false);
 assert.equal(coop.party.max_members,4);
 assert.equal(coop.party.gold_master_min_test_players,2);
 assert.deepEqual(coop.shared_objective.required_members_range,[2,4]);
 assert.equal(coop.revive.max_distance,6);
 assert.equal(coop.revive.actor_fresh_seconds,7);
 assert.equal(coop.revive.target_fresh_seconds,20);
 assert.match(sql,/p_action not in \('status','heartbeat','down','revive','objective'\)/);
 assert.match(sql,/v_required not between 2 and 4/);
 assert.match(sql,/if v_distance>6/);
 assert.match(sql,/v_actor\.updated_at<=now\(\)-interval '7 seconds'/);
 assert.match(sql,/v_target\.updated_at<=now\(\)-interval '20 seconds'/);
 assert.match(sql,/revoke all on public\.world_party_runtime,public\.world_party_runtime_receipts,public\.world_party_objectives from public,anon,authenticated/);
});

test('France coop reconnect cannot mint or replay story rewards',()=>{
 assert.equal(coop.story_rules.party_pose_or_presence_never_grants_story_reward,true);
 assert.equal(coop.story_rules.story_state_remains_separate_authority,true);
 assert.equal(coop.story_rules.fragment_justice_server_only,true);
 assert.equal(coop.story_rules.global_xp_server_only,true);
 assert.equal(coop.story_rules.reconnect_cannot_replay_reward,true);
 assert.equal(reconnect.reconnect_policy.reward_replay_allowed,false);
 assert.equal(reconnect.reconnect_policy.guardian_liberation_replay_allowed,false);
});

test('France Editor validator checks contracts and remains read-only',()=>{
 const script=read('unreal/ThreeBWorld/Scripts/validate_france_editor_assets.py');
 for(const file of [
  'france-justice-v1.json',
  'france-checkpoint-reconnect-v1.json',
  'france-npc-dialogue-v1.json',
  'france-presentation-v1.json',
  'france-nexus-handoff-v1.json',
  'france-coop-session-v1.json',
  'celiane-state-tree-spec.json'
 ])assert.match(script,new RegExp(file.replace(/[.]/g,'\\.')));
 assert.match(script,/missing_contracts/);
 assert.match(script,/mismatched_contracts/);
 assert.doesNotMatch(script,/create_asset|delete_asset|rename_asset|duplicate_asset|save_asset|make_directory/i);
});
