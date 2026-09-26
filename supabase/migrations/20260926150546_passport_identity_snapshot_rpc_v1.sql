create or replace function public.passport_identity_snapshot()
returns table (
  passport_public_id uuid,
  passport_issued_at timestamptz,
  passport_version smallint,
  passport_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.passport_public_id,
    profile.passport_issued_at,
    profile.passport_version,
    profile.passport_state
  from public.member_profiles as profile
  where profile.user_id = (select auth.uid())
  limit 1
$$;

revoke all on function public.passport_identity_snapshot() from public, anon;
grant execute on function public.passport_identity_snapshot() to authenticated;

comment on function public.passport_identity_snapshot() is
  'Returns only the authenticated member own public Passport 3B identity. Never exposes auth.users.id, recovery data, wallet or inventory.';