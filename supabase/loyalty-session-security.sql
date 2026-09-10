begin;
create schema if not exists member_private;
revoke all on schema member_private from public,anon;
grant usage on schema member_private to authenticated;
-- RLS needs one narrowly scoped lookup in auth.sessions, which clients cannot read.
create function member_private.session_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.sessions where user_id=(select auth.uid()) and id=((select auth.jwt())->>'session_id')::uuid);
$$;
revoke all on function member_private.session_active() from public,anon;
grant execute on function member_private.session_active() to authenticated;
alter policy member_profile_owner on public.member_profiles using((select auth.uid())=user_id and (select member_private.session_active()));
alter policy member_ledger_owner on public.member_ledger using((select auth.uid())=user_id and (select member_private.session_active()));
alter policy member_saves_owner_read on public.member_game_saves using((select auth.uid())=user_id and (select member_private.session_active()));
alter policy member_saves_owner_insert on public.member_game_saves with check((select auth.uid())=user_id and (select member_private.session_active()));
alter policy member_saves_owner_update on public.member_game_saves using((select auth.uid())=user_id and (select member_private.session_active())) with check((select auth.uid())=user_id and (select member_private.session_active()));
commit;
