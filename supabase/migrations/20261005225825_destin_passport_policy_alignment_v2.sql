-- Align the real database gate with the product rule:
-- confirmed e-mail + active Passeport grant DESTIN cinema access.
-- Civil identity remains informational and catalog discovery is allowed before activation.

create or replace function public.passport_destin_access_server_v1(p_user uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
  p public.member_profiles%rowtype;
  a public.passport_identity_verification_attempts%rowtype;
  binding threeb_identity_private.verified_subjects%rowtype;
  email_ok boolean;
  account_ok boolean;
  result jsonb;
begin
  result:=jsonb_build_object(
    'allowed',false,
    'emailConfirmed',false,
    'passportActive',false,
    'identityVerified',false,
    'personBound',false
  );

  select gate.email_ok,gate.account_ok
    into email_ok,account_ok
  from threeb_identity_private.account_gate(p_user) gate;

  if not coalesce(account_ok,false) then
    return result||jsonb_build_object('code','account_required');
  end if;
  if not coalesce(email_ok,false) then
    return result||jsonb_build_object('code','email_required');
  end if;

  result:=result||jsonb_build_object('emailConfirmed',true);

  select * into p from public.member_profiles where user_id=p_user;
  if p.user_id is null or p.passport_state is distinct from 'active' then
    return result||jsonb_build_object('code','passport_required');
  end if;

  -- Cinema access is granted here. Identity proof remains optional metadata.
  result:=result||jsonb_build_object('passportActive',true,'allowed',true,'code','ready');

  if p.identity_verification_state is distinct from 'verified'
     or p.identity_verified_at is null
     or p.identity_assurance_level is distinct from 'identity_verified'
     or p.identity_verification_provider is distinct from 'idnow'
     or p.identity_verification_ref_hash is null then
    return result;
  end if;

  select * into a
  from public.passport_identity_verification_attempts
  where user_id=p_user
    and provider='idnow'
    and state='verified'
    and provider_session_ref_hash=p.identity_verification_ref_hash
    and provider_consent_at is not null
    and provider_consent_version=1
  order by completed_at desc nulls last
  limit 1;

  if a.id is null then return result; end if;
  result:=result||jsonb_build_object('identityVerified',true);

  select * into binding
  from threeb_identity_private.verified_subjects
  where user_id=p_user;

  if binding.id is null
     or binding.revoked_at is not null
     or binding.valid_until<=clock_timestamp()
     or binding.verification_attempt_id<>a.id
     or binding.provider<>'idnow' then
    return result;
  end if;

  return result||jsonb_build_object('personBound',true);
end
$function$;

do $patch$
declare
  source text;
  before_text text;
  after_text text;
begin
  select pg_get_functiondef('public.destin_command_server(uuid,text,jsonb,boolean)'::regprocedure)
    into source;

  before_text:=E' if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state=''active'') then raise exception ''Un Passeport 3B actif est requis.''; end if;';
  after_text:=E' if p_action<>''catalog'' and not exists(select 1 from public.member_profiles where user_id=p_user and passport_state=''active'') then raise exception ''Un Passeport 3B actif est requis.''; end if;';

  if position(before_text in source)=0 then
    raise exception 'Unexpected DESTIN passport gate version';
  end if;

  source:=replace(source,before_text,after_text);
  execute source;
end
$patch$;
