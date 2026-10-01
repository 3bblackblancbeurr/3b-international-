-- PENDING. Closed-by-default, online pilot; this is not an OIDC / EUDI wallet.
create table public.passport_partner_clients (
  client_id text primary key check(client_id ~ '^[a-z0-9._:-]{3,96}$'),
  display_name text not null check(char_length(display_name) between 1 and 120),
  audience text not null check(audience ~ '^https://' and char_length(audience)<=240),
  secret_hash text not null check(secret_hash ~ '^[0-9a-f]{64}$'),
  allowed_scopes text[] not null default array['passport.basic']::text[]
    check(cardinality(allowed_scopes) between 1 and 2 and allowed_scopes <@ array['passport.basic','identity.verified']::text[]),
  purpose text not null check(char_length(purpose) between 10 and 500),
  enabled boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check(not enabled or reviewed_at is not null)
);
create table public.passport_partner_requests (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.passport_partner_clients(client_id),
  request_hash text not null unique check(request_hash ~ '^[0-9a-f]{64}$'),
  nonce text not null check(nonce ~ '^[A-Za-z0-9_-]{32,128}$'),
  audience text not null,
  scopes text[] not null check(cardinality(scopes) between 1 and 2 and scopes <@ array['passport.basic','identity.verified']::text[]),
  user_id uuid references auth.users(id) on delete cascade,
  consent_id uuid references public.passport_partner_consents(id),
  pairwise_subject text check(pairwise_subject is null or pairwise_subject ~ '^3bp_[0-9a-f]{64}$'),
  identity_ref_hash text,
  state text not null default 'pending' check(state in ('pending','approved','consumed','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '3 minutes',
  consumed_at timestamptz,
  unique(client_id,nonce),
  check(expires_at>created_at and expires_at<=created_at+interval '3 minutes')
);
create index passport_partner_requests_user_idx on public.passport_partner_requests(user_id,created_at desc);
create table public.passport_passkey_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_handle text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')
    check(user_handle ~ '^[0-9a-f]{64}$')
);
create table public.passport_passkeys (
  credential_id text primary key check(credential_id ~ '^[A-Za-z0-9_-]+$' and char_length(credential_id) between 16 and 1400),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_key text not null check(public_key ~ '^[A-Za-z0-9_-]+$' and char_length(public_key) between 20 and 3000),
  counter bigint not null check(counter>=0),
  transports text[] not null default '{}',
  label text not null default 'Ma clé d’accès' check(char_length(label) between 1 and 60),
  device_type text not null check(device_type in ('singleDevice','multiDevice')),
  backed_up boolean not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index passport_passkeys_user_idx on public.passport_passkeys(user_id) where revoked_at is null;
create table public.passport_webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  challenge_hash text not null unique check(challenge_hash ~ '^[0-9a-f]{64}$'),
  purpose text not null check(purpose in ('register','partner_approve','credential_manage')),
  context_hash text not null check(context_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '3 minutes',
  consumed_at timestamptz,
  completed_at timestamptz,
  check(expires_at>created_at and expires_at<=created_at+interval '3 minutes')
);
create table public.passport_stepup_proofs (
  proof_hash text primary key check(proof_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  credential_id text not null references public.passport_passkeys(credential_id),
  purpose text not null check(purpose in ('partner_approve','credential_manage')),
  context_hash text not null check(context_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '1 minute',
  consumed_at timestamptz
);

do $$ declare v_table text; begin
  foreach v_table in array array['passport_partner_clients','passport_partner_requests','passport_passkey_accounts',
    'passport_passkeys','passport_webauthn_challenges','passport_stepup_proofs'] loop
    execute format('alter table public.%I enable row level security',v_table);
    execute format('revoke all on public.%I from public,anon,authenticated',v_table);
    execute format('grant select,insert,update,delete on public.%I to service_role',v_table);
    execute format('create policy deny_browser on public.%I as restrictive for all to anon,authenticated using(false) with check(false)',v_table);
  end loop;
end $$;

create function public.passport_assert_member(p_user uuid,p_session uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
  perform 1 from public.member_profiles where user_id=p_user and passport_state='active' for update;
  if not found then raise exception 'passport inactive'; end if;
end $$;

create function public.passport_stepup_consume(p_user uuid,p_session uuid,p_proof text,p_purpose text,p_context text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_proof public.passport_stepup_proofs%rowtype;
begin
  select * into v_proof from public.passport_stepup_proofs where proof_hash=p_proof for update;
  if not found or v_proof.user_id is distinct from p_user or v_proof.session_id is distinct from p_session or v_proof.purpose is distinct from p_purpose
    or v_proof.context_hash is distinct from p_context or v_proof.expires_at<=now() or v_proof.consumed_at is not null then raise exception 'stepup invalid'; end if;
  perform 1 from public.passport_passkeys where credential_id=v_proof.credential_id and user_id=p_user and revoked_at is null for update;
  if not found then raise exception 'credential revoked'; end if;
  update public.passport_stepup_proofs set consumed_at=now() where proof_hash=p_proof;
end $$;

create function public.passport_partner_request_create(p_client text,p_secret text,p_audience text,p_nonce text,p_scopes text[],p_request text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_client public.passport_partner_clients%rowtype; v_id uuid;
begin
  select * into v_client from public.passport_partner_clients where client_id=p_client and enabled for share;
  if not found or v_client.secret_hash is distinct from p_secret or v_client.audience is distinct from p_audience or
    not(p_scopes <@ v_client.allowed_scopes) then raise exception 'partner unauthorized'; end if;
  insert into public.passport_partner_requests(client_id,request_hash,nonce,audience,scopes)
    values(p_client,p_request,p_nonce,p_audience,p_scopes) returning id into v_id;
  return v_id;
end $$;

create function public.passport_partner_approve(p_user uuid,p_session uuid,p_request text,p_scopes text[],p_subject text,p_proof text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_request public.passport_partner_requests%rowtype; v_client public.passport_partner_clients%rowtype;
  v_profile public.member_profiles%rowtype; v_consent uuid;
begin
  if p_subject is null or p_subject !~ '^3bp_[0-9a-f]{64}$' then raise exception 'invalid partner subject'; end if;
  perform public.passport_assert_member(p_user,p_session);
  select * into v_request from public.passport_partner_requests where request_hash=p_request for update;
  if not found or v_request.state<>'pending' or v_request.expires_at<=now() then raise exception 'request unavailable'; end if;
  select * into v_client from public.passport_partner_clients where client_id=v_request.client_id and enabled for share;
  if not found or v_client.audience<>v_request.audience or not(v_request.scopes <@ v_client.allowed_scopes)
    or not(p_scopes @> v_request.scopes and p_scopes <@ v_request.scopes) then raise exception 'consent scope mismatch'; end if;
  perform public.passport_stepup_consume(p_user,p_session,p_proof,'partner_approve',p_request);
  select * into v_profile from public.member_profiles where user_id=p_user;
  insert into public.passport_partner_consents(user_id,client_id,scopes) values(p_user,v_request.client_id,v_request.scopes) returning id into v_consent;
  update public.passport_partner_requests set user_id=p_user,consent_id=v_consent,pairwise_subject=p_subject,
    identity_ref_hash=v_profile.identity_verification_ref_hash,state='approved' where id=v_request.id;
  return v_consent;
end $$;

create function public.passport_partner_redeem(p_client text,p_secret text,p_request text,p_audience text,p_nonce text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_request public.passport_partner_requests%rowtype; v_client public.passport_partner_clients%rowtype;
  v_profile public.member_profiles%rowtype; v_result jsonb; v_user uuid;
begin
  -- Same lock order as member mutations: profile -> request -> client -> consent.
  select user_id into v_user from public.passport_partner_requests where request_hash=p_request;
  select * into v_profile from public.member_profiles where user_id=v_user for update;
  select * into v_request from public.passport_partner_requests where request_hash=p_request for update;
  select * into v_client from public.passport_partner_clients where client_id=p_client and enabled for share;
  if not found or v_client.secret_hash is distinct from p_secret or v_client.audience is distinct from p_audience then raise exception 'partner unauthorized'; end if;
  if v_request.id is null or v_request.client_id is distinct from p_client or v_request.audience is distinct from p_audience or v_request.nonce is distinct from p_nonce
    or v_request.state<>'approved' or v_request.expires_at<=now() or v_profile.passport_state is distinct from 'active'
    or not(v_request.scopes <@ v_client.allowed_scopes) then raise exception 'proof unavailable'; end if;
  perform 1 from public.passport_partner_consents where id=v_request.consent_id and user_id=v_request.user_id and revoked_at is null for share;
  if not found then raise exception 'consent revoked'; end if;
  v_result=jsonb_build_object('version',1,'subject',v_request.pairwise_subject,'audience',p_audience,'nonce',p_nonce,
    'issued_at',extract(epoch from now())::bigint,'expires_at',extract(epoch from v_request.expires_at)::bigint);
  if 'passport.basic'=any(v_request.scopes) then v_result=v_result||jsonb_build_object('passport_active',true); end if;
  if 'identity.verified'=any(v_request.scopes) then v_result=v_result||jsonb_build_object('identity_verified',
    coalesce(v_profile.identity_verification_state='verified' and v_profile.identity_assurance_level in ('identity_verified','high_assurance')
      and v_profile.identity_verification_ref_hash=v_request.identity_ref_hash and v_profile.identity_verified_at is not null
      and v_profile.identity_verified_at>now()-interval '365 days'
      and exists(select 1 from public.passport_identity_verification_attempts where user_id=v_request.user_id
        and state='verified' and production_live_verified and provider_session_ref_hash=v_request.identity_ref_hash),false)); end if;
  update public.passport_partner_requests set state='consumed',consumed_at=now() where id=v_request.id;
  return v_result;
end $$;

create function public.passport_partner_revoke(p_user uuid,p_session uuid,p_consent uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  -- Revocation remains available on a suspended/revoked Passport with a valid account session.
  if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
  perform 1 from public.member_profiles where user_id=p_user for update;
  update public.passport_partner_consents set revoked_at=coalesce(revoked_at,now()) where id=p_consent and user_id=p_user;
  if not found then return false; end if;
  update public.passport_partner_requests set state='revoked' where consent_id=p_consent and user_id=p_user and state in ('pending','approved');
  return true;
end $$;

create function public.passport_partner_decline(p_user uuid,p_session uuid,p_request text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
  perform 1 from public.member_profiles where user_id=p_user for update;
  update public.passport_partner_requests set state='revoked',user_id=p_user where request_hash=p_request and state='pending' and expires_at>now();
  return found;
end $$;

create function public.passport_webauthn_take(p_user uuid,p_session uuid,p_challenge uuid,p_purpose text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_row public.passport_webauthn_challenges%rowtype;
begin
  if p_purpose='credential_manage' then
    if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
    perform 1 from public.member_profiles where user_id=p_user for update;
  else perform public.passport_assert_member(p_user,p_session); end if;
  select * into v_row from public.passport_webauthn_challenges where id=p_challenge for update;
  if not found or v_row.user_id is distinct from p_user or v_row.session_id is distinct from p_session or v_row.purpose is distinct from p_purpose
    or v_row.expires_at<=now() or v_row.consumed_at is not null then raise exception 'challenge invalid'; end if;
  update public.passport_webauthn_challenges set consumed_at=now() where id=p_challenge;
  return jsonb_build_object('challenge_hash',v_row.challenge_hash,'context_hash',v_row.context_hash);
end $$;

create function public.passport_webauthn_register(p_user uuid,p_session uuid,p_challenge uuid,p_credential text,p_key text,
  p_counter bigint,p_transports text[],p_label text,p_device text,p_backed_up boolean,p_proof text,p_context text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_challenge public.passport_webauthn_challenges%rowtype;
begin
  perform public.passport_assert_member(p_user,p_session);
  select * into v_challenge from public.passport_webauthn_challenges where id=p_challenge for update;
  if not found or v_challenge.user_id is distinct from p_user or v_challenge.session_id is distinct from p_session or v_challenge.purpose<>'register'
    or v_challenge.consumed_at is null or v_challenge.completed_at is not null or v_challenge.expires_at<=now()
    or v_challenge.context_hash is distinct from p_context then raise exception 'registration invalid'; end if;
  if exists(select 1 from public.passport_passkeys where user_id=p_user and revoked_at is null) then
    perform public.passport_stepup_consume(p_user,p_session,p_proof,'credential_manage',p_context);
  elsif not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and created_at>now()-interval '10 minutes') then
    raise exception 'fresh sign-in required';
  end if;
  if (select count(*) from public.passport_passkeys where user_id=p_user and revoked_at is null)>=10 then raise exception 'credential limit'; end if;
  insert into public.passport_passkeys(credential_id,user_id,public_key,counter,transports,label,device_type,backed_up)
    values(p_credential,p_user,p_key,p_counter,p_transports,p_label,p_device,p_backed_up);
  update public.passport_webauthn_challenges set completed_at=now() where id=p_challenge;
  return true;
end $$;

create function public.passport_webauthn_confirm(p_user uuid,p_session uuid,p_challenge uuid,p_credential text,
  p_old_counter bigint,p_new_counter bigint,p_proof text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_challenge public.passport_webauthn_challenges%rowtype; v_key public.passport_passkeys%rowtype;
begin
  if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
  perform 1 from public.member_profiles where user_id=p_user for update;
  select * into v_challenge from public.passport_webauthn_challenges where id=p_challenge for update;
  if not found or v_challenge.user_id is distinct from p_user or v_challenge.session_id is distinct from p_session or v_challenge.purpose='register'
    or v_challenge.consumed_at is null or v_challenge.completed_at is not null or v_challenge.expires_at<=now() then raise exception 'confirmation invalid'; end if;
  if v_challenge.purpose='partner_approve' then perform public.passport_assert_member(p_user,p_session); end if;
  select * into v_key from public.passport_passkeys where credential_id=p_credential and user_id=p_user and revoked_at is null for update;
  if not found or v_key.counter is distinct from p_old_counter or p_new_counter is null or p_new_counter<0
    or ((v_key.counter<>0 or p_new_counter<>0) and p_new_counter<=v_key.counter) then raise exception 'credential counter mismatch'; end if;
  update public.passport_passkeys set counter=p_new_counter,last_used_at=now() where credential_id=p_credential;
  insert into public.passport_stepup_proofs(proof_hash,user_id,session_id,credential_id,purpose,context_hash)
    values(p_proof,p_user,p_session,p_credential,v_challenge.purpose,v_challenge.context_hash);
  update public.passport_webauthn_challenges set completed_at=now() where id=p_challenge;
  return true;
end $$;

create function public.passport_recovery_revoke(p_user uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  -- Only the recovery-key verifier may call this after proving possession of the key.
  perform 1 from public.member_profiles where user_id=p_user for update;
  if not found then raise exception 'member missing'; end if;
  update public.passport_passkeys set revoked_at=coalesce(revoked_at,now()) where user_id=p_user;
  update public.passport_stepup_proofs set consumed_at=coalesce(consumed_at,now()) where user_id=p_user;
  update public.passport_webauthn_challenges set consumed_at=coalesce(consumed_at,now()),completed_at=coalesce(completed_at,now()) where user_id=p_user;
  update public.passport_partner_requests set state='revoked' where user_id=p_user and state in ('pending','approved');
  update public.passport_partner_consents set revoked_at=coalesce(revoked_at,now()) where user_id=p_user;
  update public.passport_identity_verification_attempts set state='cancelled',completed_at=now(),last_error_code='account_recovered'
    where user_id=p_user and state in ('pending','processing');
  update public.member_profiles set identity_verification_state='unverified' where user_id=p_user and identity_verification_state='pending';
  return true;
end $$;

create function public.passport_passkey_revoke(p_user uuid,p_session uuid,p_credential text,p_proof text,p_context text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
  perform 1 from public.member_profiles where user_id=p_user for update;
  perform public.passport_stepup_consume(p_user,p_session,p_proof,'credential_manage',p_context);
  update public.passport_passkeys set revoked_at=coalesce(revoked_at,now()) where credential_id=p_credential and user_id=p_user;
  if not found then return false; end if;
  update public.passport_stepup_proofs set consumed_at=coalesce(consumed_at,now()) where credential_id=p_credential;
  return true;
end $$;

-- Service-only functions, including internal helpers. PostgREST callers cannot choose another member.
do $$ declare v_function regprocedure; begin
  for v_function in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('passport_assert_member','passport_stepup_consume',
      'passport_partner_request_create','passport_partner_approve','passport_partner_redeem','passport_partner_revoke','passport_partner_decline',
      'passport_webauthn_take','passport_webauthn_register','passport_webauthn_confirm','passport_passkey_revoke','passport_recovery_revoke') loop
    execute format('revoke all on function %s from public,anon,authenticated',v_function);
    execute format('grant execute on function %s to service_role',v_function);
  end loop;
end $$;
comment on table public.passport_partner_clients is 'Reviewed online pilot partners only. Disabled by default; no certification or governmental recognition is implied.';
comment on table public.passport_passkeys is 'WebAuthn public keys only. Device biometrics/private keys never leave the authenticator. Step-up, not Supabase passwordless login.';
comment on table public.passport_partner_requests is 'Three-minute, audience/nonce bound requests. Redemption is atomic and checks current Passport and consent state; raw tokens are never stored.';
