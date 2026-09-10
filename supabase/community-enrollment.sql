begin;
alter table public.community_profiles add column rules_version text, add column rules_accepted_at timestamptz;
alter table public.community_profiles add constraint community_rules_pair check ((rules_version is null) = (rules_accepted_at is null));
create function member_private.community_enrolled() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and member_private.session_active() and exists(
  select 1 from public.community_profiles where user_id=auth.uid() and listed and rules_version='2026-09-v1' and rules_accepted_at is not null
 );
$$;
revoke all on function member_private.community_enrolled() from public,anon;
grant execute on function member_private.community_enrolled() to authenticated;
alter policy community_chat_read on public.community_chat using(
 (select member_private.community_enrolled()) and status='visible' and member_private.community_visible(author_id)
 and exists(select 1 from public.community_profiles p where p.user_id=author_id and p.listed)
);
commit;

