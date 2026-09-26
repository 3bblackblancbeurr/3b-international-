-- Passport 3B vNext foundation.
-- Registry only: this migration does not claim government identity and does not store signing private keys.

create table if not exists public.passport_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  passport_public_id uuid not null default gen_random_uuid() unique,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  assurance_level text not null default 'member' check (assurance_level in ('member','verified','high_assurance')),
  credential_version integer not null default 1 check (credential_version between 1 and 1000),
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.passport_identities enable row level security;

drop policy if exists passport_identity_read_own on public.passport_identities;
create policy passport_identity_read_own
on public.passport_identities for select
to authenticated
using (auth.uid() = user_id);

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

create table if not exists public.passport_identity_events (
  event_id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  passport_public_id uuid,
  event_type text not null check (event_type in ('issued','assurance_changed','suspended','reactivated','revoked','credential_rotated')),
  actor text not null default 'system',
  reason text,
  created_at timestamptz not null default now()
);

alter table public.passport_identity_events enable row level security;

create index if not exists passport_identity_events_public_id_idx
  on public.passport_identity_events(passport_public_id, created_at desc);

comment on table public.passport_identities is
  'Private 3B membership identity registry. Not a government passport or national identity document.';
comment on column public.passport_identities.passport_public_id is
  'Opaque public identifier. Never replace authorization checks with this value.';
comment on table public.passport_relying_parties is
  'Registry for future approved 3B OIDC / verifiable credential relying parties.';
