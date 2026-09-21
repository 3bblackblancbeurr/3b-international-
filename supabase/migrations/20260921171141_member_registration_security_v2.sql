
alter table public.member_profiles
  add column if not exists registration_version smallint not null default 1,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists last_login_at timestamptz,
  add column if not exists password_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_registration_version_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_registration_version_check
      check (registration_version between 1 and 10);
  end if;
end $$;

create table if not exists public.member_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('terms','privacy','marketing')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  granted boolean not null,
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create index if not exists member_consents_user_created_idx
  on public.member_consents(user_id,created_at desc);

alter table public.member_consents enable row level security;
revoke all on public.member_consents from public,anon,authenticated;
grant select,insert on public.member_consents to service_role;

create table if not exists public.member_auth_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z0-9_.:-]{3,64}$'),
  success boolean not null,
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  detail jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detail)='object' and octet_length(detail::text)<=4096),
  created_at timestamptz not null default now()
);

create index if not exists member_auth_events_user_created_idx
  on public.member_auth_events(user_id,created_at desc);
create index if not exists member_auth_events_type_created_idx
  on public.member_auth_events(event_type,created_at desc);

alter table public.member_auth_events enable row level security;
revoke all on public.member_auth_events from public,anon,authenticated;
grant select,insert on public.member_auth_events to service_role;

comment on table public.member_consents is
  'Service-only audit trail for versioned account/privacy/marketing consent.';
comment on table public.member_auth_events is
  'Service-only minimal authentication security events; IP addresses are stored only as SHA-256 hashes.';
