alter table public.member_profiles
  add column if not exists identity_verification_state text not null default 'unverified',
  add column if not exists identity_assurance_level text not null default 'self_asserted',
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_verification_provider text,
  add column if not exists identity_verification_ref_hash text,
  add column if not exists identity_verification_version smallint not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_verification_state_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_verification_state_check
      check (identity_verification_state in ('unverified','pending','verified','rejected','expired','revoked'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_assurance_level_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_assurance_level_check
      check (identity_assurance_level in ('self_asserted','account_verified','identity_verified','high_assurance'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_verification_ref_hash_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_verification_ref_hash_check
      check (identity_verification_ref_hash is null or identity_verification_ref_hash ~ '^[0-9a-f]{64}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_verified_proof_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_verified_proof_check
      check (
        identity_verification_state <> 'verified'
        or (
          identity_verified_at is not null
          and identity_verification_provider is not null
          and identity_verification_ref_hash is not null
          and identity_assurance_level in ('identity_verified','high_assurance')
        )
      );
  end if;
end $$;

update public.member_profiles as profile
set identity_assurance_level='account_verified'
where profile.identity_verification_state='unverified'
  and profile.identity_assurance_level='self_asserted'
  and exists (
    select 1 from auth.users as auth_user
    where auth_user.id=profile.user_id
      and (auth_user.email_confirmed_at is not null or auth_user.phone_confirmed_at is not null)
  );

create table if not exists public.member_identity_claims (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_given_names text not null check (char_length(trim(legal_given_names)) between 1 and 120),
  legal_family_name text not null check (char_length(trim(legal_family_name)) between 1 and 120),
  birth_date date not null check (birth_date >= date '1900-01-01' and birth_date <= date '2100-12-31'),
  claim_version smallint not null default 1 check (claim_version between 1 and 20),
  declared_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_identity_claims enable row level security;
revoke all on public.member_identity_claims from public, anon, authenticated;
grant select, insert, update, delete on public.member_identity_claims to service_role;
drop policy if exists member_identity_claims_deny_anon on public.member_identity_claims;
create policy member_identity_claims_deny_anon on public.member_identity_claims
as restrictive for all to anon using (false) with check (false);
drop policy if exists member_identity_claims_deny_authenticated on public.member_identity_claims;
create policy member_identity_claims_deny_authenticated on public.member_identity_claims
as restrictive for all to authenticated using (false) with check (false);

create table if not exists public.passport_identity_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9._:-]{2,64}$'),
  provider_session_ref_hash text check (provider_session_ref_hash is null or provider_session_ref_hash ~ '^[0-9a-f]{64}$'),
  state text not null default 'pending' check (state in ('pending','processing','verified','rejected','expired','cancelled','error')),
  assurance_requested text not null default 'identity_verified'
    check (assurance_requested in ('account_verified','identity_verified','high_assurance')),
  idempotency_key uuid not null default gen_random_uuid() unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code ~ '^[a-z0-9._:-]{2,64}$'),
  check (completed_at is null or completed_at >= started_at),
  check (expires_at is null or expires_at > started_at)
);
create index if not exists passport_identity_verification_attempts_user_idx
  on public.passport_identity_verification_attempts(user_id, started_at desc);
create unique index if not exists passport_identity_verification_attempts_provider_ref_uidx
  on public.passport_identity_verification_attempts(provider, provider_session_ref_hash)
  where provider_session_ref_hash is not null;
alter table public.passport_identity_verification_attempts enable row level security;
revoke all on public.passport_identity_verification_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.passport_identity_verification_attempts to service_role;
drop policy if exists passport_identity_verification_attempts_deny_anon on public.passport_identity_verification_attempts;
create policy passport_identity_verification_attempts_deny_anon on public.passport_identity_verification_attempts
as restrictive for all to anon using (false) with check (false);
drop policy if exists passport_identity_verification_attempts_deny_authenticated on public.passport_identity_verification_attempts;
create policy passport_identity_verification_attempts_deny_authenticated on public.passport_identity_verification_attempts
as restrictive for all to authenticated using (false) with check (false);

create table if not exists public.passport_partner_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id ~ '^[a-z0-9._:-]{3,96}$'),
  scopes text[] not null,
  consent_version smallint not null default 1 check (consent_version between 1 and 20),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (cardinality(scopes) between 1 and 24),
  check (revoked_at is null or revoked_at >= granted_at)
);
create index if not exists passport_partner_consents_user_idx
  on public.passport_partner_consents(user_id, granted_at desc);
create index if not exists passport_partner_consents_client_idx
  on public.passport_partner_consents(client_id, granted_at desc);
alter table public.passport_partner_consents enable row level security;
revoke all on public.passport_partner_consents from public, anon, authenticated;
grant select, insert, update, delete on public.passport_partner_consents to service_role;
drop policy if exists passport_partner_consents_deny_anon on public.passport_partner_consents;
create policy passport_partner_consents_deny_anon on public.passport_partner_consents
as restrictive for all to anon using (false) with check (false);
drop policy if exists passport_partner_consents_deny_authenticated on public.passport_partner_consents;
create policy passport_partner_consents_deny_authenticated on public.passport_partner_consents
as restrictive for all to authenticated using (false) with check (false);

comment on column public.member_profiles.identity_verification_state is
  'Civil identity verification lifecycle. Never set verified from self-declared profile fields alone.';
comment on column public.member_profiles.identity_assurance_level is
  'Trust level kept separate from Passport activity. account_verified is not civil identity verification.';
comment on column public.member_profiles.identity_verification_ref_hash is
  'SHA-256 reference to an external verification result. Raw document images, biometric templates and provider payloads are not stored here.';
comment on table public.member_identity_claims is
  'Service-only self-declared civil identity data collected for future verification. These claims are not verified identity.';
comment on table public.passport_identity_verification_attempts is
  'Service-only verification lifecycle metadata. Do not store raw document scans, selfies, biometric templates or full provider payloads.';
comment on table public.passport_partner_consents is
  'Service-only consent ledger for future Passport 3B relying parties. Scopes must be minimized per partner.';
