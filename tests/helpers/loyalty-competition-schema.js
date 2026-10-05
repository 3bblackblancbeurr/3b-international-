import {readFileSync} from 'node:fs';

const sql=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

// Use the existing table definitions so complete reward functions compile against
// the same row types in both the refund and account-lock regression tests.
export async function createCompetitionSchema(db){
 await db.exec('create schema if not exists auth;create table if not exists auth.users(id uuid primary key);');
 const loyalty=sql('supabase/migrations/20260910105242_member_accounts_loyalty_and_game_rewards.sql');
 await db.exec(loyalty.slice(loyalty.indexOf('create table public.member_game_runs ('),loyalty.indexOf('create table public.member_rate_limits ')));
 await db.exec(sql('supabase/migrations/20260922141232_register_penalty_rush_global_game_v1.sql').split('create or replace function public.loyalty_game_beat(')[0]);
 await db.exec(sql('supabase/migrations/20260910222929_card_arena_server_authority.sql').split('create function public.card_arena_command(')[0]);
 await db.exec(sql('supabase/migrations/20260921130205_sport_challenge_tracking_v1.sql').split('create or replace function public.sport_challenge_join_server(')[0].replace(/^begin;\s*/,''));
}
