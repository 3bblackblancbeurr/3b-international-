import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../supabase/owner-notification-center-v1.sql',import.meta.url),'utf8');
const deletion=readFileSync(new URL('../supabase/functions/delete-account/index.ts',import.meta.url),'utf8');

test('community content cannot block account deletion',()=>{
 assert.match(sql,/community_posts_author_id_fkey[\s\S]*on delete cascade/i);
 assert.match(sql,/community_chat_author_id_fkey[\s\S]*on delete cascade/i);
});

test('sport review history survives reviewer deletion without a restrictive foreign key',()=>{
 assert.match(sql,/sport_challenge_reviews alter column reviewer_id drop not null/i);
 assert.match(sql,/sport_challenge_reviews_reviewer_id_fkey[\s\S]*on delete set null/i);
});

test('owned penalty clubs are prepared transactionally before auth deletion',()=>{
 assert.match(sql,/create or replace function public\.prepare_account_deletion\(p_user uuid\)/i);
 assert.match(sql,/order by \(m\.role='captain'\) desc,m\.joined_at asc/i);
 assert.match(sql,/delete from public\.penalty_clubs where id=v_club\.id/i);
 assert.match(sql,/update public\.penalty_clubs[\s\S]*owner_user_id=v_successor/i);
 assert.match(sql,/penalty_clubs_owner_user_id_fkey[\s\S]*on delete cascade/i);
 assert.match(deletion,/\/rest\/v1\/rpc\/prepare_account_deletion/);
});

test('native installed apps can reach the account deletion service',()=>{
 assert.match(deletion,/'https:\/\/localhost'/);
 assert.match(deletion,/'capacitor:\/\/localhost'/);
});

test('owner audit references are scrubbed when a member profile is deleted',()=>{
 assert.match(sql,/scrub_deleted_member_owner_refs/i);
 assert.match(sql,/event_key=case when position\(old\.user_id::text/i);
 assert.match(sql,/payload=payload-'user_id'-'actor_user_id'-'member_id'/i);
 assert.match(sql,/account\.deletions:/i);
});
