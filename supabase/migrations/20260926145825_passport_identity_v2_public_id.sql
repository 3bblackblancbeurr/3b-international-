alter table public.member_profiles
  add column if not exists passport_public_id uuid,
  add column if not exists passport_issued_at timestamptz,
  add column if not exists passport_version smallint not null default 2,
  add column if not exists passport_state text not null default 'active';

update public.member_profiles
set passport_public_id = gen_random_uuid()
where passport_public_id is null;

update public.member_profiles
set passport_issued_at = coalesce(created_at, now())
where passport_issued_at is null;

alter table public.member_profiles
  alter column passport_public_id set default gen_random_uuid(),
  alter column passport_public_id set not null,
  alter column passport_issued_at set default now(),
  alter column passport_issued_at set not null;

create unique index if not exists member_profiles_passport_public_id_uidx
  on public.member_profiles(passport_public_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_passport_version_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_passport_version_check
      check (passport_version between 2 and 20);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_passport_state_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_passport_state_check
      check (passport_state in ('active','suspended','revoked'));
  end if;
end $$;

comment on column public.member_profiles.passport_public_id is
  'Opaque public Passport 3B identifier. It must never be used as the authentication subject or expose auth.users.id.';
comment on column public.member_profiles.passport_issued_at is
  'Server-backed issuance timestamp for the current Passport 3B identity.';
comment on column public.member_profiles.passport_version is
  'Passport 3B data-contract version. Authorization continues to use the authenticated account.';
comment on column public.member_profiles.passport_state is
  'Server-controlled Passport state. Display and eligibility signal only; authentication remains Supabase Auth.';