-- Pending staging-only Passport 3B interoperability foundation.
-- Canonical identity remains public.member_profiles.passport_*.
-- Do not create a second Passport identity authority.

create table if not exists public.passport_relying_parties (
  relying_party_id uuid primary key default gen_random_uuid(),
  client_key text not null unique check (client_key ~ '^[a-z0-9][a-z0-9._-]{2,80}$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  redirect_origins text[] not null default '{}',
  status text not null default 'disabled' check (status in ('disabled','sandbox','active','revoked')),
  allowed_scopes text[] not null default array['passport.basic'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.passport_relying_parties enable row level security;
revoke all on public.passport_relying_parties from public, anon, authenticated;
grant select, insert, update, delete on public.passport_relying_parties to service_role;

create table if not exists public.passport_identity_events (
  event_id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  passport_public_id uuid,
  event_type text not null check (event_type in ('issued','assurance_changed','suspended','reactivated','revoked','credential_rotated','relying_party_revoked')),
  actor text not null default 'system',
  reason text,
  created_at timestamptz not null default now()
);

alter table public.passport_identity_events enable row level security;
revoke all on public.passport_identity_events from public, anon;
grant select on public.passport_identity_events to authenticated;
grant select, insert, update, delete on public.passport_identity_events to service_role;

drop policy if exists passport_identity_events_read_own on public.passport_identity_events;
create policy passport_identity_events_read_own
on public.passport_identity_events for select
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists passport_identity_events_user_id_idx
  on public.passport_identity_events(user_id, created_at desc);
create index if not exists passport_identity_events_public_id_idx
  on public.passport_identity_events(passport_public_id, created_at desc);
