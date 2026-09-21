import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));

const story=json('unreal/ThreeBWorld/Data/France/france-justice-v1.json');
const layout=json('unreal/ThreeBWorld/Data/France/france-blockout-layout.json');
const npc=json('unreal/ThreeBWorld/Data/France/france-npc-dialogue-v1.json');
const reconnect=json('unreal/ThreeBWorld/Data/France/france-checkpoint-reconnect-v1.json');
const presentation=json('unreal/ThreeBWorld/Data/France/france-presentation-v1.json');

const phases=new Set(story.phases.map(x=>x.id));
const zones=new Set(layout.zones.map(x=>x.id));
const facts=new Set([
 ...story.evidence.map(x=>x.fact_key),
 'france.rescue_outcome',
 'france.justice_trial_outcome',
 'france.guardian_liberated'
]);

test('France NPC roles reference canonical zones, phases, intents and server facts',()=>{
 const ids=npc.npc_roles.map(x=>x.id);
 assert.equal(ids.length,new Set(ids).size);
 const intents=new Set(npc.dialogue_intents.map(x=>x.id));
 for(const role of npc.npc_roles){
  assert.ok(zones.has(role.zone),role.zone);
  for(const phase of role.active_phases)assert.ok(phases.has(phase),phase);
  for(const intent of role.intents)assert.ok(intents.has(intent),intent);
  for(const fact of role.memory_fact_keys){
   assert.match(fact,/^france\./);
   assert.ok(facts.has(fact),fact);
  }
 }
 assert.equal(npc.localization.final_dialogue_in_json,false);
 assert.equal(npc.guardian_reference.contract,'celiane-state-tree-spec.json');
});

test('France checkpoints are revisioned, server-owned and never replay rewards',()=>{
 assert.equal(reconnect.snapshot.authority,'server_only');
 assert.equal(reconnect.snapshot.last_known_good,true);
 const ids=reconnect.checkpoints.map(x=>x.id);
 assert.equal(ids.length,new Set(ids).size);
 for(const cp of reconnect.checkpoints){
  for(const phase of cp.requires_phases)assert.ok(phases.has(phase),phase);
  assert.ok(zones.has(cp.safe_zone)||cp.safe_zone==='nexus',cp.safe_zone);
  assert.ok(phases.has(cp.resume_phase),cp.resume_phase);
 }
 assert.equal(reconnect.reconnect_policy.server_snapshot_wins,true);
 assert.equal(reconnect.reconnect_policy.compare_and_swap_revision,true);
 assert.equal(reconnect.reconnect_policy.reward_replay_allowed,false);
 assert.equal(reconnect.reconnect_policy.guardian_liberation_replay_allowed,false);
});

test('France presentation reacts to story state but cannot author progression',()=>{
 const expected=new Set(story.world_states.map(x=>x.id));
 const actual=new Set(presentation.world_state_profiles.map(x=>x.world_state));
 assert.deepEqual([...actual].sort(),[...expected].sort());
 assert.equal(presentation.authority.persistent_mutation,false);
 assert.equal(presentation.authority.gameplay_reward,false);
 for(const beat of presentation.cinematic_beats){
  assert.ok(phases.has(beat.phase),beat.phase);
  assert.equal(beat.persistent_mutation,false);
 }
 const raw=JSON.stringify(presentation);
 assert.doesNotMatch(raw,/grant_global_xp|grant_fragment|mint_inventory|set_guardian_liberated/i);
});

test('France vertical slice documentation points to the complementary preproduction contracts',()=>{
 const doc=read('unreal/ThreeBWorld/Docs/FRANCE_VERTICAL_SLICE.md');
 for(const file of [
  'france-npc-dialogue-v1.json',
  'france-checkpoint-reconnect-v1.json',
  'france-presentation-v1.json'
 ])assert.match(doc,new RegExp(file.replace(/[.]/g,'\\.')));
});
