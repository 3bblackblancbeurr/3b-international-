-- Passport 3B Identity Foundation v3
-- Privacy-first: proofs and metadata only. Never store biometric templates, raw ID scans,
-- raw recovery codes, passkey private keys, or unhashed provider case identifiers here.

alter table public.member_profiles drop constraint if exists member_profiles_passport_state_check;
alter table public.member_profiles
  add constraint member_profiles_passport_state_check
  check (passport_state in ('active','suspended','revoked','expired'));

alter table public.member_profiles
  add column if not exists identity_verification_status text not null default 'unverified',
  add column if not exists identity_assurance_level smallint not null default 0,
  add column if not exists identity_verified_at timestamptz,
  add column if not exists identity_verification_provider text,
  add column if not exists identity_verification_reference_hash text,
  add column if not exists identity_verification_version smallint not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_verification_status_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_verification_status_check
      check (identity_verification_status in (
        'unverified','pending','verified','rejected','suspended','revoked','expired'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_assurance_level_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_assurance_level_check
      check (identity_assurance_level between 0 and 3);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.member_profiles'::regclass
      and conname='member_profiles_identity_reference_hash_check'
  ) then
    alter table public.member_profiles
      add constraint member_profiles_identity_reference_hash_check
      check (
        identity_verification_reference_hash is null
        or identity_verification_reference_hash ~ '^[0-9a-f]{64}$'
      );
  end if;
end $$;

create index if not exists member_profiles_identity_status_idx
  on public.member_profiles(identity_verification_status, identity_assurance_level);

comment on column public.member_profiles.identity_verification_status is
  '3B identity proof state. This is separate from account authentication and Passport presentation state.';
comment on column public.member_profiles.identity_assurance_level is
  '3B assurance tier 0..3. Level 0 means no civil-identity proof has been accepted.';
comment on column public.member_profiles.identity_verification_reference_hash is
  'SHA-256 of the external provider case/reference; never store the raw provider reference here.';

create table if not exists public.passport_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passport_public_id uuid not null references public.member_profiles(passport_public_id) on delete cascade,
  provider text not null check (provider ~ '^[a-z0-9._-]{2,64}$'),
  provider_case_hash text not null check (provider_case_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('pending','verified','rejected','expired','cancelled')),
  assurance_level smallint not null default 0 check (assurance_level between 0 and 3),
  checks jsonb not null default '{}'::jsonb,
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz,
  unique(provider, provider_case_hash)
);

create index if not exists passport_identity_verifications_user_idx
  on public.passport_identity_verifications(user_id, created_at desc);
create index if not exists passport_identity_verifications_passport_idx
  on public.passport_identity_verifications(passport_public_id, created_at desc);

alter table public.passport_identity_verifications enable row level security;
revoke all on public.passport_identity_verifications from public, anon, authenticated;
grant select, insert, update, delete on public.passport_identity_verifications to service_role;

create table if not exists public.passport_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  passport_public_id uuid references public.member_profiles(passport_public_id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z0-9._:-]{3,80}$'),
  success boolean not null default true,
  risk_level text not null default 'info' check (risk_level in ('info','low','medium','high','critical')),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent_hash text check (user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists passport_security_events_user_idx
  on public.passport_security_events(user_id, created_at desc);
create index if not exists passport_security_events_passport_idx
  on public.passport_security_events(passport_public_id, created_at desc);

alter table public.passport_security_events enable row level security;
revoke all on public.passport_security_events from public, anon, authenticated;
grant select, insert, update, delete on public.passport_security_events to service_role;

create table if not exists public.passport_authenticators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passport_public_id uuid not null references public.member_profiles(passport_public_id) on delete cascade,
  kind text not null default 'webauthn' check (kind in ('webauthn')),
  credential_id_hash text not null unique check (credential_id_hash ~ '^[0-9a-f]{64}$'),
  public_key text not null,
  sign_count bigint not null default 0 check (sign_count >= 0),
  transports text[] not null default '{}'::text[],
  backup_eligible boolean,
  backup_state boolean,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists passport_authenticators_user_idx
  on public.passport_authenticators(user_id, created_at desc);

alter table public.passport_authenticators enable row level security;
revoke all on public.passport_authenticators from public, anon, authenticated;
grant select, insert, update, delete on public.passport_authenticators to service_role;

create table if not exists public.passport_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('webauthn.register','webauthn.authenticate','step_up')),
  challenge_hash text not null unique check (challenge_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > issued_at and expires_at <= issued_at + interval '10 minutes')
);

create index if not exists passport_auth_challenges_user_idx
  on public.passport_auth_challenges(user_id, issued_at desc);
create index if not exists passport_auth_challenges_live_idx
  on public.passport_auth_challenges(expires_at)
  where consumed_at is null and revoked_at is null;

alter table public.passport_auth_challenges enable row level security;
revoke all on public.passport_auth_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.passport_auth_challenges to service_role;

create table if not exists public.passport_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists passport_recovery_codes_user_idx
  on public.passport_recovery_codes(user_id, created_at desc);

alter table public.passport_recovery_codes enable row level security;
revoke all on public.passport_recovery_codes from public, anon, authenticated;
grant select, insert, update, delete on public.passport_recovery_codes to service_role;

create table if not exists public.passport_partner_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_key text not null check (client_key ~ '^[a-zA-Z0-9._:-]{3,120}$'),
  scopes text[] not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (cardinality(scopes) between 1 and 20)
);

create unique index if not exists passport_partner_consents_active_uidx
  on public.passport_partner_consents(user_id, client_key)
  where revoked_at is null;

alter table public.passport_partner_consents enable row level security;
revoke all on public.passport_partner_consents from public, anon, authenticated;
grant select, insert, update, delete on public.passport_partner_consents to service_role;

comment on table public.passport_identity_verifications is
  'Service-only ledger of civil-identity verification outcomes. No raw ID scans or biometric templates.';
comment on table public.passport_security_events is
  'Privacy-minimized security audit trail. IP and user-agent values must be hashed before insertion.';
comment on table public.passport_authenticators is
  'Future WebAuthn/passkey public credentials. Never stores private keys or device biometrics.';
comment on table public.passport_auth_challenges is
  'Short-lived, one-time authentication challenges stored as hashes only.';
comment on table public.passport_recovery_codes is
  'Hashed one-time recovery codes. Raw codes must only be shown once to the user.';
comment on table public.passport_partner_consents is
  'Explicit per-client scope consent foundation for future Sign in with Passport 3B / OIDC integration.';


-- Atomic service-only outcome application. Future identity providers/webhooks must call this
-- after verifying provider signatures and idempotency. It never accepts raw documents/biometrics.
create or replace function public.passport_apply_identity_verification(
  p_user uuid,
  p_provider text,
  p_provider_case_hash text,
  p_status text,
  p_assurance_level smallint,
  p_checks jsonb default '{}'::jsonb,
  p_evidence_digest text default null,
  p_reason_code text default null,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_passport uuid;
  v_id uuid;
  v_verified_at timestamptz;
begin
  if p_provider !~ '^[a-z0-9._-]{2,64}$' then raise exception 'provider invalid'; end if;
  if p_provider_case_hash !~ '^[0-9a-f]{64}$' then raise exception 'case hash invalid'; end if;
  if p_status not in ('pending','verified','rejected','expired','cancelled') then raise exception 'status invalid'; end if;
  if p_assurance_level < 0 or p_assurance_level > 3 then raise exception 'assurance invalid'; end if;
  if p_status='verified' and p_assurance_level < 1 then raise exception 'verified identity requires assurance'; end if;
  if p_evidence_digest is not null and p_evidence_digest !~ '^[0-9a-f]{64}$' then raise exception 'evidence digest invalid'; end if;

  select passport_public_id into v_passport
  from public.member_profiles
  where user_id=p_user
  for update;

  if v_passport is null then raise exception 'passport not found'; end if;
  v_verified_at=case when p_status='verified' then now() else null end;

  insert into public.passport_identity_verifications(
    user_id,passport_public_id,provider,provider_case_hash,status,
    assurance_level,checks,evidence_digest,reason_code,updated_at,verified_at,expires_at
  ) values (
    p_user,v_passport,p_provider,p_provider_case_hash,p_status,
    p_assurance_level,coalesce(p_checks,'{}'::jsonb),p_evidence_digest,p_reason_code,now(),v_verified_at,p_expires_at
  )
  on conflict(provider,provider_case_hash) do update set
    status=excluded.status,
    assurance_level=excluded.assurance_level,
    checks=excluded.checks,
    evidence_digest=excluded.evidence_digest,
    reason_code=excluded.reason_code,
    updated_at=now(),
    verified_at=excluded.verified_at,
    expires_at=excluded.expires_at
  returning id into v_id;

  update public.member_profiles set
    identity_verification_status=case
      when p_status='cancelled' then 'unverified'
      else p_status
    end,
    identity_assurance_level=case when p_status='verified' then p_assurance_level else 0 end,
    identity_verified_at=v_verified_at,
    identity_verification_provider=p_provider,
    identity_verification_reference_hash=p_provider_case_hash
  where user_id=p_user;

  insert into public.passport_security_events(
    user_id,passport_public_id,event_type,success,risk_level,detail
  ) values (
    p_user,v_passport,'identity.verification.'||p_status,true,
    case when p_status in ('rejected','expired') then 'medium' else 'info' end,
    jsonb_build_object('provider',p_provider,'assurance_level',p_assurance_level)
  );

  return v_id;
end;
$$;

revoke all on function public.passport_apply_identity_verification(
  uuid,text,text,text,smallint,jsonb,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.passport_apply_identity_verification(
  uuid,text,text,text,smallint,jsonb,text,text,timestamptz
) to service_role;

comment on function public.passport_apply_identity_verification(
  uuid,text,text,text,smallint,jsonb,text,text,timestamptz
) is 'Service-only atomic identity verification outcome application. Provider signatures must be verified before calling this function.';
