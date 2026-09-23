import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readLocation,PAGE_HASHES} from '../src/lib/navigation.js';

const sql=readFileSync(new URL('../supabase/owner-notification-center-v1.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/notification-center/index.ts',import.meta.url),'utf8');
const ecosystem=readFileSync(new URL('../supabase/functions/ecosystem-private/index.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('notification and owner routes have stable direct URLs',()=>{
 assert.equal(PAGE_HASHES.notifications,'notifications');
 assert.equal(PAGE_HASHES.owner,'centre-3b');
 assert.equal(readLocation({hash:'#notifications',search:''}).page,'notifications');
 assert.equal(readLocation({hash:'#centre-3b',search:''}).page,'owner');
});

test('owner data stays service-side while member notifications use narrow RLS grants',()=>{
 assert.match(sql,/alter table public\.owner_inbox_events enable row level security/i);
 assert.match(sql,/revoke all on public\.member_notifications,public\.owner_inbox_events/i);
 assert.match(sql,/grant update\(read_at\) on public\.member_notifications to authenticated/i);
 assert.doesNotMatch(sql,/grant\s+select\s+on\s+public\.owner_inbox_events\s+to\s+authenticated/i);
 assert.match(sql,/member_private\.session_active\(\)/);
});

test('owner identity is validated server-side against control center owner settings',()=>{
 assert.match(edge,/control_center_settings\?singleton=eq\.true/);
 assert.match(edge,/owner_user_id/);
 assert.match(edge,/requireOwner\(user\)/);
 assert.match(app,/notificationStatus\.ownerAccess/);
});

test('community writes are moderated on the server, not only in React',()=>{
 assert.match(ecosystem,/moderateFields\(uid,'post'/);
 assert.match(ecosystem,/moderateFields\(uid,'chat'/);
 assert.match(ecosystem,/moderateFields\(uid,'profile'/);
 assert.match(ecosystem,/community_moderation_state/);
 assert.match(ecosystem,/owner_inbox_events/);
});

test('owner center has workflow states and an immutable action journal',()=>{
 for(const status of ['new','in_progress','done','archived'])assert.ok(sql.includes("'"+status+"'"));
 assert.match(sql,/create table if not exists public\.owner_action_log/i);
 assert.match(edge,/owner\.inbox\.update/);
 assert.match(edge,/owner\.request\.reply/);
});
