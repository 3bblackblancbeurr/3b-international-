-- PASSPORT 3B IDENTITY ASSURANCE V1 — PENDING / NOT APPLIED
-- This file defines the production target without activating KYC in production.
-- It must become a real Supabase migration only after a PVID/KYC provider,
-- retention policy, webhook signature scheme and rollback have been validated.
--
-- Privacy rule: never store document images, selfies, biometric templates,
-- raw document numbers or provider API secrets in these tables.

create table if not exists public.member_identity_assurance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','review_required','rejected','expired','revoked')),
  assurance_level text not null default 'account'
    check (assurance_level in ('account','email','document','document_liveness','high')),
  provider_key text,
  provider_subject_hash text
    check (provider_subject_hash is null or provider_subject_hash ~ '^[0-9a-f]{64}$'),
  evidence_digest text
    check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  legal_given_names text,
  legal_family_name text,
  birth_date date,
  nationality_country_code text
    check (nationality_country_code is null or nationality_country_code ~ '^[A-Z]{2}$'),
  document_country_code text
    check (document_country_code is null or document_country_code ~ '^[A-Z]{2}$'),
  age_over_18 boolean,
  document_verified boolean not null default false,
  liveness_verified boolean not null default false,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    verification_status <> 'verified'
    or (
      verified_at is not null
      and assurance_level in ('document','document_liveness','high')
      and document_verified = true
    )
  ),
  check (verification_expires_at is null or verified_at is null or verification_expires_at > verified_at)
);

create unique index if not exists member_identity_assurance_provider_subject_uidx
  on public.member_identity_assurance(provider_key,provider_subject_hash)
  where provider_key is not null and provider_subject_hash is not null;

alter table public.member_identity_assurance enable row level security;
revoke all on public.member_identity_assurance from public,anon,authenticated;
grant select,insert,update,delete on public.member_identity_assurance to service_role;

create table if not exists public.member_identity_verification_events (
  event_id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null
    check (event_type in ('started','provider_callback','verified','rejected','review_required','expired','revoked','recovery_review')),
  provider_key text,
  event_digest text check (event_digest is null or event_digest ~ '^[0-9a-f]{64}$'),
  detail jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detail)='object' and octet_length(detail::text)<=4096),
  created_at timestamptz not null default now()
);

create index if not exists member_identity_verification_events_user_idx
  on public.member_identity_verification_events(user_id,created_at desc);

alter table public.member_identity_verification_events enable row level security;
revoke all on public.member_identity_verification_events from public,anon,authenticated;
grant select,insert on public.member_identity_verification_events to service_role;

create table if not exists public.passport_relying_parties (
  relying_party_id uuid primary key default gen_random_uuid(),
  client_key text not null unique check (client_key ~ '^[a-z0-9][a-z0-9._-]{2,80}$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  redirect_origins text[] not null default '{}',
  status text not null default 'disabled'
    check (status in ('disabled','sandbox','active','revoked')),
  allowed_scopes text[] not null default array['passport.basic']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.passport_relying_parties enable row level security;
revoke all on public.passport_relying_parties from public,anon,authenticated;
grant select,insert,update,delete on public.passport_relying_parties to service_role;

create table if not exists public.passport_consent_grants (
  grant_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  relying_party_id uuid not null references public.passport_relying_parties(relying_party_id) on delete cascade,
  scopes text[] not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  check (cardinality(scopes) between 1 and 12),
  check (expires_at is null or expires_at > granted_at)
);

create index if not exists passport_consent_grants_user_idx
  on public.passport_consent_grants(user_id,granted_at desc);

alter table public.passport_consent_grants enable row level security;
revoke all on public.passport_consent_grants from public,anon,authenticated;
grant select,insert,update,delete on public.passport_consent_grants to service_role;

comment on table public.member_identity_assurance is
  'Private civil-identity assurance result. No raw document image, selfie, biometric template or document number.';
comment on column public.member_identity_assurance.provider_subject_hash is
  'Opaque server-produced HMAC/hash of a stable provider subject. Never hash low-entropy document numbers directly.';
