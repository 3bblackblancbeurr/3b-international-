import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20260921130205_sport_challenge_tracking_v1.sql');
const privateEdge=read('supabase/functions/ecosystem-private/index.ts');
const publicEdge=read('supabase/functions/ecosystem-public/index.ts');
const page=read('src/sport/SportPage.jsx');

test('sport challenge tracking is server-authoritative and private',()=>{
 for(const table of ['sport_challenges','sport_challenge_entries','sport_challenge_checkins','sport_challenge_reviews']){
  assert.match(migration,new RegExp('alter table public\\.'+table+' enable row level security'));
 }
 assert.match(migration,/revoke all on public\.sport_challenges,public\.sport_challenge_entries,public\.sport_challenge_checkins,public\.sport_challenge_reviews from public,anon,authenticated/);
 assert.match(migration,/grant execute on function public\.sport_challenge_join_server\(uuid,text\) to service_role/);
 assert.match(migration,/grant execute on function public\.sport_challenge_review_server\(uuid,uuid,text,boolean,text\) to service_role/);
 assert.doesNotMatch(migration,/grant execute on function public\.sport_challenge_.* to authenticated/);
});

test('daily check-ins cannot count twice and only a verified review grants XP',()=>{
 assert.match(migration,/unique\(user_id,challenge_id,challenge_day\)/);
 assert.match(migration,/value=greatest\(public\.sport_challenge_checkins\.value,excluded\.value\)/);
 assert.match(migration,/status='verified',verified_at=now\(\)/);
 assert.match(migration,/public\.loyalty_grant\(/);
 assert.match(migration,/'sport-challenge:'\|\|p_challenge\|\|':'\|\|p_user::text/);
});

test('private edge exposes the challenge lifecycle while public edge exposes none of it',()=>{
 for(const action of ['sport-challenges','sport-challenge-join','sport-challenge-checkin','sport-challenge-submit','sport-challenge-abandon','sport-challenge-review']){
  assert.match(privateEdge,new RegExp("action==='"+action+"'"));
  assert.doesNotMatch(publicEdge,new RegExp(action));
 }
 assert.match(privateEdge,/loyalty_session_valid/);
 assert.match(privateEdge,/community_staff/);
});

test('Sport 3B UI separates progress, submission and official validation',()=>{
 assert.match(page,/Mes défis/);
 assert.match(page,/Objectif atteint/);
 assert.match(page,/Validation en attente/);
 assert.match(page,/Validé 3B/);
 assert.match(page,/Envoyer à la validation 3B/);
 assert.match(page,/Réussites à contrôler/);
 assert.match(page,/XP attribué une seule fois/);
});
