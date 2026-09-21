import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const initial=read('20260921162711_world_unreal_story_state_v1.sql');
const hardening=read('20260921162758_world_unreal_story_state_privilege_hardening_v1.sql');
const authFix=read('20260921162838_world_unreal_story_state_auth_dependency_fix_v1.sql');

test('Unreal story state is RLS-protected and not client-granted',()=>{
 assert.match(initial,/alter table public\.world_unreal_story_state enable row level security/i);
 assert.match(initial,/alter table public\.world_unreal_story_receipts enable row level security/i);
 assert.match(initial,/revoke all on public\.world_unreal_story_state from public, anon, authenticated/i);
 assert.match(initial,/revoke all on public\.world_unreal_story_receipts from public, anon, authenticated/i);
 assert.match(initial,/revoke all on function public\.world_unreal_story_commit_server[\s\S]*from public, anon, authenticated/i);
});

test('service role receives least privilege and receipts remain append-only',()=>{
 assert.match(hardening,/revoke all on public\.world_unreal_story_state from service_role/i);
 assert.match(hardening,/revoke all on public\.world_unreal_story_receipts from service_role/i);
 assert.match(hardening,/grant select, insert, update on public\.world_unreal_story_state to service_role/i);
 assert.match(hardening,/grant select, insert on public\.world_unreal_story_receipts to service_role/i);
 assert.doesNotMatch(hardening,/grant[^;]*update[^;]*world_unreal_story_receipts/i);
 assert.doesNotMatch(hardening,/grant[^;]*delete[^;]*world_unreal_story_receipts/i);
});

test('final story commit function is invoker-only and has no auth.users privilege dependency',()=>{
 assert.match(authFix,/security invoker/i);
 assert.match(authFix,/set search_path=''/i);
 assert.doesNotMatch(authFix,/auth\.users/i);
 assert.match(authFix,/unreal_story_revision_conflict/);
 assert.match(authFix,/unreal_story_event_id_conflict/);
 assert.match(authFix,/pg_advisory_xact_lock/);
 assert.match(authFix,/state_sha256/);
 assert.match(authFix,/grant execute on function public\.world_unreal_story_commit_server[\s\S]*to service_role/i);
});

test('story persistence migration never grants gameplay rewards',()=>{
 const combined=initial+'\n'+hardening+'\n'+authFix;
 assert.doesNotMatch(combined,/loyalty_grant|threeb_process_reward|grant_global_xp|fragment_justice/i);
});
