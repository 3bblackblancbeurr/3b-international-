-- Pending deployment: apply before the matching passport-idv Edge release.
-- All identity attempt transitions take the member profile lock first. This
-- serializes a new attempt with both positive and negative provider outcomes.
create function public.passport_identity_begin_attempt_v1(p_user uuid,p_session uuid,p_ref_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare profile public.member_profiles%rowtype; attempt_id uuid;
begin
 if public.loyalty_session_valid(p_user,p_session) is distinct from true then
  raise exception 'Session invalide.';
 end if;
 if p_ref_hash is null or p_ref_hash !~ '^[0-9a-f]{64}$' then
  raise exception 'Référence de vérification invalide.';
 end if;
 select * into profile from public.member_profiles where user_id=p_user for update;
 if profile.user_id is null or profile.passport_state is distinct from 'active' or
    profile.identity_verification_state is null or profile.identity_verification_state not in ('unverified','rejected','expired') then
  raise exception 'Le contrôle est déjà en cours ou cette identité nécessite une revue.';
 end if;
 insert into public.passport_identity_verification_attempts
  (user_id,provider,provider_session_ref_hash,state,assurance_requested,started_at,provider_consent_at,provider_consent_version)
 values(p_user,'idnow',p_ref_hash,'processing','identity_verified',clock_timestamp(),clock_timestamp(),1)
 returning id into attempt_id;
 update public.member_profiles set identity_verification_state='pending' where user_id=p_user;
 return jsonb_build_object('id',attempt_id);
end $$;

create function public.passport_identity_finish_attempt_v1(p_attempt uuid,p_ref_hash text,p_state text,p_error_code text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; profile public.member_profiles%rowtype; attempt public.passport_identity_verification_attempts%rowtype; profile_state text;
begin
 -- Only provider failure outcomes are allowed. This RPC cannot verify an identity.
 if p_state is null or p_error_code is null or not (
   (p_state='rejected' and p_error_code='provider_rejected') or
   (p_state='expired' and p_error_code='session_expired') or
   (p_state='cancelled' and p_error_code='session_aborted') or
   (p_state='error' and p_error_code in ('provider_error','test_flow_only','flow_not_approved'))
 ) then raise exception 'Résultat de vérification invalide.'; end if;
 select user_id into owner from public.passport_identity_verification_attempts where id=p_attempt;
 if not found then return jsonb_build_object('applied',false,'reason','unknown_attempt'); end if;
 select * into profile from public.member_profiles where user_id=owner for update;
 select * into attempt from public.passport_identity_verification_attempts where id=p_attempt for update;
 if profile.user_id is null or profile.passport_state is distinct from 'active' or profile.identity_verification_state is distinct from 'pending' or
    attempt.id is null or attempt.provider is distinct from 'idnow' or attempt.state is null or attempt.state not in ('pending','processing') or
    attempt.provider_consent_at is null or attempt.provider_consent_version is distinct from 1 or
    attempt.provider_session_ref_hash is distinct from p_ref_hash or p_ref_hash is null or p_ref_hash !~ '^[0-9a-f]{64}$' or
    attempt.started_at is null or exists(select 1 from public.passport_identity_verification_attempts newer where newer.user_id=owner and newer.id<>attempt.id and newer.started_at>=attempt.started_at) then
  return jsonb_build_object('applied',false,'reason','state_no_longer_pending');
 end if;
 profile_state=case when p_state in ('rejected','expired') then p_state else 'unverified' end;
 update public.passport_identity_verification_attempts set state=p_state,completed_at=clock_timestamp(),last_error_code=p_error_code where id=p_attempt;
 update public.member_profiles set identity_verification_state=profile_state where user_id=owner;
 return jsonb_build_object('applied',true,'state',p_state);
end $$;

-- Keep the existing production confirmation contract and fail closed if two
-- legacy attempts have the same timestamp: neither can claim to be the newest.
create or replace function public.passport_identity_confirm_production_v1(p_attempt uuid,p_ref_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; profile public.member_profiles%rowtype; attempt public.passport_identity_verification_attempts%rowtype;
begin
 select user_id into owner from public.passport_identity_verification_attempts where id=p_attempt;
 if not found then return jsonb_build_object('applied',false,'reason','unknown_attempt'); end if;
 select * into profile from public.member_profiles where user_id=owner for update;
 select * into attempt from public.passport_identity_verification_attempts where id=p_attempt for update;
 if profile.user_id is null or profile.passport_state is distinct from 'active' or profile.identity_verification_state is distinct from 'pending' or
    attempt.id is null or attempt.provider is distinct from 'idnow' or attempt.state is null or attempt.state not in ('pending','processing') or
    attempt.provider_consent_at is null or attempt.provider_consent_version is distinct from 1 or
    attempt.provider_session_ref_hash is distinct from p_ref_hash or p_ref_hash is null or p_ref_hash !~ '^[0-9a-f]{64}$' or
    (attempt.expires_at is not null and attempt.expires_at<=clock_timestamp()) or attempt.started_at is null or
    exists(select 1 from public.passport_identity_verification_attempts newer where newer.user_id=owner and newer.id<>attempt.id and newer.started_at>=attempt.started_at) then
  return jsonb_build_object('applied',false,'reason','state_no_longer_pending');
 end if;
 update public.member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',identity_verified_at=clock_timestamp(),identity_verification_provider='idnow',identity_verification_ref_hash=p_ref_hash where user_id=owner;
 update public.passport_identity_verification_attempts set state='verified',completed_at=clock_timestamp(),last_error_code=null where id=p_attempt;
 return jsonb_build_object('applied',true);
end $$;

revoke all on function public.passport_identity_begin_attempt_v1(uuid,uuid,text),public.passport_identity_finish_attempt_v1(uuid,text,text,text),public.passport_identity_confirm_production_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.passport_identity_begin_attempt_v1(uuid,uuid,text),public.passport_identity_finish_attempt_v1(uuid,text,text,text),public.passport_identity_confirm_production_v1(uuid,text) to service_role;
