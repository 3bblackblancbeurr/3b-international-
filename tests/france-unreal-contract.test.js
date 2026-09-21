import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=url=>readFileSync(new URL(url,import.meta.url),'utf8');
const json=url=>JSON.parse(read(url));

test('France Justice contract defines ten ordered phases and five durable world states',()=>{
 const data=json('../unreal/ThreeBWorld/Data/France/france-justice-v1.json');
 assert.equal(data.slice_id,'france_justice_v1');
 assert.equal(data.territory.guardian,'Céliane');
 assert.equal(data.territory.value,'Justice');
 assert.equal(data.phases.length,10);
 assert.deepEqual(data.phases.map(p=>p.id),[
  'arrival','human_problem','rescue','investigation','pressure',
  'celiane_contact','justice_trial','liberation','aftermath','return_nexus'
 ]);
 assert.equal(data.world_states.length,5);
 assert.equal(new Set(data.world_states.map(s=>s.data_layer)).size,5);
});

test('France persistent rewards and Guardian liberation are server-only',()=>{
 const data=json('../unreal/ThreeBWorld/Data/France/france-justice-v1.json');
 for(const key of ['evidence_discovery','rescue_outcome','phase_completion','celiane_liberation','fragment_justice','global_xp','inventory_rewards']){
  assert.ok(data.authority_model.server_verified.includes(key),key);
 }
 for(const key of ['grant_global_xp','grant_fragment','mint_inventory','set_guardian_liberated','set_persistent_world_state']){
  assert.ok(data.authority_model.forbidden_client_assertions.includes(key),key);
 }
 assert.equal(data.rewards.fragment.server_only,true);
 assert.equal(data.rewards.fragment.idempotent,true);
 assert.equal(data.rewards.global_xp.server_only,true);
});

test('Justice is a non-combat gameplay system, not only a combat tag',()=>{
 const data=json('../unreal/ThreeBWorld/Data/France/france-justice-v1.json');
 const tags=data.resonance_actions.map(x=>x.tag);
 for(const expected of [
  'Ability.Resonance.Justice.RevealContradiction',
  'Ability.Resonance.Justice.LinkEvidence',
  'Ability.Resonance.Justice.StabilizeDispute',
  'Ability.Resonance.Justice.ProtectWitness'
 ])assert.ok(tags.includes(expected),expected);
 const config=read('../unreal/ThreeBWorld/Config/DefaultGameplayTags.ini');
 for(const tag of tags)assert.match(config,new RegExp(tag.replace(/[.]/g,'\\.')));
});

test('liberation cannot bypass investigation and Justice trial in the versioned graph',()=>{
 const data=json('../unreal/ThreeBWorld/Data/France/france-justice-v1.json');
 const phases=Object.fromEntries(data.phases.map(p=>[p.id,p]));
 assert.deepEqual(phases.liberation.requires,['justice_trial']);
 assert.deepEqual(phases.justice_trial.requires,['celiane_contact']);
 assert.ok(phases.celiane_contact.evidence.includes('validated_contradiction'));
 assert.ok(phases.investigation.evidence.includes('institutional_record'));
 assert.equal(phases.liberation.authority,'server_verified');
});

test('France acceptance matrix covers identity, idempotence, reconnect, coop and streaming',()=>{
 const qa=json('../unreal/ThreeBWorld/Data/France/france-justice-acceptance-tests.json');
 const cases=qa.suites.flatMap(s=>s.cases);
 for(const required of [
  'same_supabase_user_id_survives_app_ticket_unreal_handoff',
  'duplicate_story_event_is_idempotent',
  'crash_after_server_ack_does_not_duplicate_reward',
  'two_players_share_objective_without_double_completion',
  'post_liberation_data_layer_state_restores_after_restart',
  'critical_route_has_no_world_partition_empty_cell'
 ])assert.ok(cases.includes(required),required);
});

test('shared StorySlice C++ framework is data-driven and does not hard-code France rewards',()=>{
 const header=read('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBStorySliceDefinition.h');
 const source=read('../unreal/ThreeBWorld/Source/ThreeBWorld/ThreeBStorySliceDefinition.cpp');
 assert.match(header,/UThreeBStorySliceDefinition/);
 assert.match(header,/EThreeBStoryAuthority/);
 assert.match(header,/ServerVerified/);
 assert.match(header,/bCanGrantGlobalReward = false/);
 assert.match(source,/FindPhase/);
 assert.match(source,/FindEvidence/);
 assert.doesNotMatch(header,/fragment_justice|Céliane|france\.celiane_liberated/i);
});

test('candidate Unreal API remains read-only until trusted server authority exists',()=>{
 const source=read('../supabase/functions/world-unreal-api/index.ts');
 assert.match(source,/CANDIDATE ONLY — not deployed/);
 assert.match(source,/action==='heartbeat'/);
 assert.match(source,/action!=='bootstrap'/);
 assert.doesNotMatch(source,/grant_global_xp|grant_fragment|set_guardian_liberated|france\.celiane_liberated/);
});

test('France server-authority documentation forbids client-authored durable progression',()=>{
 const doc=read('../unreal/ThreeBWorld/Docs/FRANCE_SERVER_AUTHORITY.md');
 assert.match(doc,/client[\s\S]{0,160}must not mint global XP/i);
 assert.match(doc,/dedicated server/i);
 assert.match(doc,/idempotency/i);
 assert.match(doc,/expected_revision/);
 assert.match(doc,/candidate\/read-only/i);
});
