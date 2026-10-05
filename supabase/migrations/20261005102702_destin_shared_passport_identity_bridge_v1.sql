-- Applied to 3B production as 20261005102702_destin_shared_passport_identity_bridge_v1.
-- No ID images, selfie or document number. A session reference is NOT a person identifier.
create schema if not exists threeb_identity_private;
revoke all on schema threeb_identity_private from public, anon, authenticated;
grant usage on schema threeb_identity_private to service_role;
create table threeb_identity_private.verified_subjects (
 id uuid primary key default gen_random_uuid(),
 provider text not null check(provider='idnow'),
 subject_key_hash text not null check(subject_key_hash ~ '^[0-9a-f]{64}$'),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 verification_attempt_id uuid not null references public.passport_identity_verification_attempts(id) on delete cascade,
 bound_at timestamptz not null default clock_timestamp(),
 valid_until timestamptz not null,
 revoked_at timestamptz,
 unique(provider,subject_key_hash)
);
alter table threeb_identity_private.verified_subjects enable row level security;
revoke all on threeb_identity_private.verified_subjects from public,anon,authenticated;
grant select,insert,update,delete on threeb_identity_private.verified_subjects to service_role;
comment on table threeb_identity_private.verified_subjects is 'Private verified-person binding. No raw identity document or biometrics. Provision only from an approved stable-subject provider attestation, not a session ID. Account erasure cascades; no indefinite anti-recreation retention is claimed.';
create or replace function public.passport_bind_subject_server_v1(p_user uuid,p_attempt uuid,p_subject_key_hash text,p_valid_until timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare a public.passport_identity_verification_attempts%rowtype; p public.member_profiles%rowtype; binding threeb_identity_private.verified_subjects%rowtype;
begin
 if p_user is null or p_subject_key_hash is null or p_subject_key_hash !~ '^[0-9a-f]{64}$' or p_valid_until is null or p_valid_until<=clock_timestamp() then raise exception using errcode='P0001',message='IDENTITY_BINDING_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,463));
 select * into p from public.member_profiles where user_id=p_user for update;
 select * into a from public.passport_identity_verification_attempts where id=p_attempt for update;
 if p.user_id is null or p.passport_state is distinct from 'active' or p.identity_verification_state is distinct from 'verified' or p.identity_verified_at is null or p.identity_assurance_level is distinct from 'identity_verified' or p.identity_verification_provider is distinct from 'idnow' or a.id is null or a.user_id is distinct from p_user or a.state is distinct from 'verified' or a.provider is distinct from 'idnow' or a.provider_consent_at is null or a.provider_consent_version is distinct from 1 or a.provider_session_ref_hash is distinct from p.identity_verification_ref_hash or a.provider_session_ref_hash is null or p_subject_key_hash=a.provider_session_ref_hash then raise exception using errcode='P0001',message='IDENTITY_PROOF_REQUIRED'; end if;
 select * into binding from threeb_identity_private.verified_subjects where user_id=p_user;
 if found then
  if binding.provider<>'idnow' or binding.subject_key_hash<>p_subject_key_hash or binding.revoked_at is not null then raise exception using errcode='P0001',message='IDENTITY_BINDING_REVIEW_REQUIRED'; end if;
  update threeb_identity_private.verified_subjects set verification_attempt_id=p_attempt,valid_until=p_valid_until where id=binding.id;
 else
  begin
   insert into threeb_identity_private.verified_subjects(provider,subject_key_hash,user_id,verification_attempt_id,valid_until) values('idnow',p_subject_key_hash,p_user,p_attempt,p_valid_until);
  exception when unique_violation then raise exception using errcode='P0001',message='IDENTITY_BINDING_REVIEW_REQUIRED';
  end;
 end if;
 return jsonb_build_object('bound',true);
end $function$;
revoke all on function public.passport_bind_subject_server_v1(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.passport_bind_subject_server_v1(uuid,uuid,text,timestamptz) to service_role;
create or replace function public.passport_destin_access_server_v1(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare p public.member_profiles%rowtype; a public.passport_identity_verification_attempts%rowtype; binding threeb_identity_private.verified_subjects%rowtype; email_ok boolean; account_ok boolean; result jsonb;
begin
 result:=jsonb_build_object('allowed',false,'emailConfirmed',false,'passportActive',false,'identityVerified',false,'personBound',false);
 select email_confirmed_at is not null,not coalesce(is_anonymous,false) and (banned_until is null or banned_until<=clock_timestamp()) into email_ok,account_ok from auth.users where id=p_user;
 if not coalesce(account_ok,false) then return result||jsonb_build_object('code','account_required'); end if;
 if not coalesce(email_ok,false) then return result||jsonb_build_object('code','email_required'); end if;
 result:=result||jsonb_build_object('emailConfirmed',true);
 select * into p from public.member_profiles where user_id=p_user;
 if p.user_id is null or p.passport_state is distinct from 'active' then return result||jsonb_build_object('code','passport_required'); end if;
 result:=result||jsonb_build_object('passportActive',true);
 if p.identity_verification_state is distinct from 'verified' or p.identity_verified_at is null or p.identity_assurance_level is distinct from 'identity_verified' or p.identity_verification_provider is distinct from 'idnow' or p.identity_verification_ref_hash is null then return result||jsonb_build_object('code','identity_required'); end if;
 select * into a from public.passport_identity_verification_attempts where user_id=p_user and provider='idnow' and state='verified' and provider_session_ref_hash=p.identity_verification_ref_hash and provider_consent_at is not null and provider_consent_version=1 order by completed_at desc nulls last limit 1;
 if a.id is null then return result||jsonb_build_object('code','identity_required'); end if;
 result:=result||jsonb_build_object('identityVerified',true);
 select * into binding from threeb_identity_private.verified_subjects where user_id=p_user;
 if binding.id is null or binding.revoked_at is not null or binding.valid_until<=clock_timestamp() or binding.verification_attempt_id<>a.id or binding.provider<>'idnow' then return result||jsonb_build_object('code','person_binding_required'); end if;
 return result||jsonb_build_object('allowed',true,'personBound',true,'code','ready');
end $function$;
revoke all on function public.passport_destin_access_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.passport_destin_access_server_v1(uuid) to service_role;
do $patch$
declare source text; anchor text:=E' if p_action=\'catalog\' then';
begin
 select pg_get_functiondef('public.destin_command_server(uuid,text,jsonb,boolean)'::regprocedure) into source;
 if position('passport_destin_access_server_v1' in source)>0 then raise exception 'Bridge already installed'; end if;
 if (length(source)-length(replace(source,anchor,'')))/length(anchor)<>1 then raise exception 'Unexpected DESTIN command version'; end if;
 source:=replace(source,anchor,E' if p_action in (\'start\',\'resume\',\'checkpoint\',\'choose\',\'finish\',\'claim\',\'vote\') and not coalesce((public.passport_destin_access_server_v1(p_user)->>\'allowed\')::boolean,false) then\n  raise exception using errcode=\'P0001\', message=\'DESTIN_PASSPORT_VERIFICATION_REQUIRED\';\n end if;\n'||anchor);
 execute source;
end $patch$;
