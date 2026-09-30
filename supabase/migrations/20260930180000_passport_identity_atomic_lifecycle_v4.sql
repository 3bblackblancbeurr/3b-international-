-- PENDING: reviewed and tested locally; do not mark applied before a staged rollout.
-- All identity transitions lock the profile first, then the attempt.
alter table public.passport_identity_verification_attempts add column production_live_verified boolean not null default false;
alter table public.passport_identity_verification_attempts add constraint passport_attempt_live_proof_check
  check(not production_live_verified or (state='verified' and provider='idnow' and provider_session_ref_hash is not null));
create or replace function public.passport_identity_attempt_begin(p_user uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_profile public.member_profiles%rowtype; v_id uuid;
begin
  select * into v_profile from public.member_profiles where user_id=p_user for update;
  if not found or v_profile.passport_state<>'active' or v_profile.identity_verification_state='revoked' then
    raise exception 'identity verification unavailable';
  end if;
  if v_profile.identity_verification_state='verified' and v_profile.identity_verified_at>now()-interval '365 days'
    and exists(select 1 from public.passport_identity_verification_attempts
    where user_id=p_user and state='verified' and production_live_verified and provider_session_ref_hash=v_profile.identity_verification_ref_hash) then
    raise exception 'identity already verified with live evidence';
  end if;
  if exists(select 1 from public.passport_identity_verification_attempts where user_id=p_user
    and state in ('pending','processing') and (expires_at is null or expires_at>now())) then
    raise exception 'identity verification already pending';
  end if;
  update public.passport_identity_verification_attempts set state='expired',completed_at=now(),last_error_code='session_expired'
    where user_id=p_user and state in ('pending','processing') and expires_at<=now();
  if not exists(select 1 from public.member_identity_claims where user_id=p_user) then raise exception 'identity claims missing'; end if;
  insert into public.passport_identity_verification_attempts(user_id,provider,state,expires_at)
    values(p_user,'idnow','pending',now()+interval '15 minutes') returning id into v_id;
  update public.member_profiles set identity_verification_state='pending' where user_id=p_user;
  return v_id;
end $$;

create or replace function public.passport_identity_attempt_bind(p_attempt uuid,p_ref_hash text,p_expires timestamptz)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid; v_profile public.member_profiles%rowtype; v_attempt public.passport_identity_verification_attempts%rowtype;
begin
  if p_ref_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid reference'; end if;
  select user_id into v_user from public.passport_identity_verification_attempts where id=p_attempt;
  select * into v_profile from public.member_profiles where user_id=v_user for update;
  select * into v_attempt from public.passport_identity_verification_attempts where id=p_attempt for update;
  if not found or v_attempt.state<>'pending' or v_attempt.expires_at<=now()
    or v_profile.passport_state is distinct from 'active' or v_profile.identity_verification_state is distinct from 'pending' then return false; end if;
  update public.passport_identity_verification_attempts set provider_session_ref_hash=p_ref_hash,state='processing',
    expires_at=least(coalesce(p_expires,now()+interval '15 minutes'),now()+interval '24 hours') where id=p_attempt;
  return true;
end $$;

create or replace function public.passport_identity_attempt_finish(p_attempt uuid,p_state text,p_ref_hash text default null,p_error text default null)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid; v_profile public.member_profiles%rowtype; v_attempt public.passport_identity_verification_attempts%rowtype;
begin
  if p_state not in ('verified','rejected','expired','cancelled','error') then raise exception 'invalid terminal state'; end if;
  select user_id into v_user from public.passport_identity_verification_attempts where id=p_attempt;
  select * into v_profile from public.member_profiles where user_id=v_user for update;
  select * into v_attempt from public.passport_identity_verification_attempts where id=p_attempt for update;
  if not found then return 'unknown_attempt'; end if;
  if v_attempt.state not in ('pending','processing') then return 'already_terminal'; end if;
  if p_state='verified' and (p_ref_hash is null or p_ref_hash<>v_attempt.provider_session_ref_hash) then raise exception 'reference mismatch'; end if;
  if v_attempt.expires_at<=now() then p_state:='expired';p_error:='session_expired'; end if;
  -- Revocation, suspension or a newer attempt cannot be undone by a delayed provider event.
  if v_profile.passport_state is distinct from 'active' or v_profile.identity_verification_state is distinct from 'pending'
    or exists(select 1 from public.passport_identity_verification_attempts where user_id=v_user
      and started_at>v_attempt.started_at) then
    update public.passport_identity_verification_attempts set state='cancelled',completed_at=now(),last_error_code='stale_attempt' where id=p_attempt;
    return 'stale_attempt';
  end if;
  update public.passport_identity_verification_attempts set state=p_state,completed_at=now(),last_error_code=p_error,
    production_live_verified=(p_state='verified') where id=p_attempt;
  if p_state='verified' then
    update public.member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',
      identity_verified_at=now(),identity_verification_provider='idnow',identity_verification_ref_hash=p_ref_hash,
      identity_verification_version=least(identity_verification_version+1,20) where user_id=v_user;
  else
    update public.member_profiles set identity_verification_state=case when p_state in ('error','cancelled') then 'unverified' else p_state end,
      identity_assurance_level='account_verified',identity_verified_at=null,identity_verification_provider=null,
      identity_verification_ref_hash=null where user_id=v_user;
  end if;
  return p_state;
end $$;

revoke all on function public.passport_identity_attempt_begin(uuid) from public,anon,authenticated;
revoke all on function public.passport_identity_attempt_bind(uuid,text,timestamptz) from public,anon,authenticated;
revoke all on function public.passport_identity_attempt_finish(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.passport_identity_attempt_begin(uuid) to service_role;
grant execute on function public.passport_identity_attempt_bind(uuid,text,timestamptz) to service_role;
grant execute on function public.passport_identity_attempt_finish(uuid,text,text,text) to service_role;
comment on function public.passport_identity_attempt_finish(uuid,text,text,text) is
  'Service-only atomic terminal transition. Caller verifies provider signature, live environment and result bindings before requesting verified.';
