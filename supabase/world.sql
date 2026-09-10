begin;
create table public.member_world_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=300000 and data->>'version'='1'),
 revision bigint not null default 1 check(revision>0)
);
alter table public.member_world_saves enable row level security;
revoke all on public.member_world_saves from public,anon,authenticated;
grant select,insert,update on public.member_world_saves to authenticated;
grant all on public.member_world_saves to service_role;
create policy world_owner_read on public.member_world_saves for select to authenticated using ((select auth.uid())=user_id and (select member_private.session_active()));
create policy world_owner_insert on public.member_world_saves for insert to authenticated with check ((select auth.uid())=user_id and (select member_private.session_active()));
create policy world_owner_update on public.member_world_saves for update to authenticated using ((select auth.uid())=user_id and (select member_private.session_active())) with check ((select auth.uid())=user_id and (select member_private.session_active()));
alter table public.member_game_runs drop constraint member_game_runs_game_check;
alter table public.member_game_runs add constraint member_game_runs_game_check check(game in ('arena','tower','maze','refuge','cities','world'));
commit;
