-- No change to member identity, Passport appearance, balances or provider assurance.
-- Service-only issuance with live-session checks, scoped consent and online revocation.
alter table public.passport_identity_verification_attempts
 add column if not exists provider_consent_at timestamptz,
 add column if not exists provider_consent_version smallint check(provider_consent_version is null or provider_consent_version=1);
create table public.passport_recognition_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100),
  website text not null check (website ~ '^https://[^[:space:]]+$'),
  audience text not null unique check (audience ~ '^https://[^[:space:]]+$'),
  allowed_scopes text[] not null check (cardinality(allowed_scopes) between 1 and 4 and
    allowed_scopes <@ array['passport.basic','identity.verified','profile.public','access.entitlements']::text[]),
  api_key_hash text not null unique check (api_key_hash ~ '^[0-9a-f]{64}$'),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.passport_recognition_partners is
  'Approved relying parties only. Empty by default; activation requires actual agreement and an API key delivered to the partner. API key hashes only.';

create table public.passport_recognition_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references public.passport_recognition_partners(id),
  consent_id uuid not null references public.passport_partner_consents(id) on delete cascade,
  scopes text[] not null,
  nonce_hash text not null check (nonce_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  consumed_at timestamptz,
  consent_at timestamptz not null,
  unique(partner_id,nonce_hash),
  check (expires_at > issued_at and expires_at <= issued_at + interval '5 minutes'),
  check (cardinality(scopes) between 1 and 4)
);
create index passport_recognition_proofs_user_idx on public.passport_recognition_proofs(user_id,issued_at desc);
create index passport_recognition_proofs_consent_idx on public.passport_recognition_proofs(consent_id);
create index passport_recognition_proofs_partner_expiry_idx on public.passport_recognition_proofs(partner_id,expires_at);
comment on table public.passport_recognition_proofs is
  'Private short-lived JWS payloads, bound to a partner challenge. Online validation is mandatory; signature alone does not establish current validity or external acceptance.';

create table public.passport_recognition_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true
);
insert into public.passport_recognition_settings(singleton,enabled) values(true,true);

alter table public.passport_recognition_partners enable row level security;
alter table public.passport_recognition_proofs enable row level security;
alter table public.passport_recognition_settings enable row level security;
revoke all on public.passport_recognition_partners,public.passport_recognition_proofs,public.passport_recognition_settings from public,anon,authenticated;
grant select,insert,update,delete on public.passport_recognition_partners,public.passport_recognition_proofs,public.passport_recognition_settings to service_role;

-- Collapse legacy live tickets before enforcing one outstanding ticket per account.
update public.passport_verification_tickets set revoked_at=now()
where consumed_at is null and revoked_at is null and expires_at<=now();
with ranked as (
 select id,row_number() over(partition by user_id order by issued_at desc,id desc) as position
 from public.passport_verification_tickets where consumed_at is null and revoked_at is null
)
update public.passport_verification_tickets set revoked_at=now()
where id in(select id from ranked where position>1);
create unique index if not exists passport_verification_tickets_single_live_uidx
on public.passport_verification_tickets(user_id) where consumed_at is null and revoked_at is null;

create function public.passport_ticket_issue_v1(p_user uuid,p_session uuid,p_token_hash text,p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare profile public.member_profiles%rowtype; ticket uuid;
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'Session expirée.' using errcode='28000'; end if;
 select * into profile from public.member_profiles where user_id=p_user for update;
 if not found or profile.passport_state<>'active' then raise exception 'Passeport inactif.' using errcode='P0001'; end if;
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '5 minutes' then
  raise exception 'Ticket invalide.' using errcode='22023';
 end if;
 if (select count(*) from public.passport_verification_tickets where user_id=p_user and issued_at>now()-interval '10 minutes')>=6 then
  raise exception 'Trop de codes. Réessaie dans quelques minutes.' using errcode='P0001';
 end if;
 update public.passport_verification_tickets set revoked_at=now() where user_id=p_user and consumed_at is null and revoked_at is null;
 insert into public.passport_verification_tickets(user_id,passport_public_id,token_hash,expires_at,scopes,purpose)
 values(p_user,profile.passport_public_id,p_token_hash,p_expires_at,array['identity.basic'],'verify') returning id into ticket;
 return jsonb_build_object('ticket_id',ticket,'passport_public_id',profile.passport_public_id,'passport_version',profile.passport_version,'passport_state',profile.passport_state,'expires_at',p_expires_at);
end $$;

create function public.passport_ticket_revoke_v1(p_user uuid,p_session uuid,p_ticket uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'Session expirée.' using errcode='28000'; end if;
 update public.passport_verification_tickets set revoked_at=coalesce(revoked_at,now()) where id=p_ticket and user_id=p_user;
 return found;
end $$;

create function public.passport_ticket_consume_v1(p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; ticket public.passport_verification_tickets%rowtype; profile public.member_profiles%rowtype;
begin
 if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Code invalide.' using errcode='22023'; end if;
 select user_id into owner from public.passport_verification_tickets where token_hash=p_token_hash;
 if not found then raise exception 'Code invalide ou expiré.' using errcode='P0001'; end if;
 select * into profile from public.member_profiles where user_id=owner for share;
 if not found or profile.passport_state<>'active' then raise exception 'Passeport inactif.' using errcode='P0001'; end if;
 select * into ticket from public.passport_verification_tickets where token_hash=p_token_hash for update;
 if ticket.consumed_at is not null or ticket.revoked_at is not null or ticket.expires_at<=clock_timestamp() or
    ticket.passport_public_id is distinct from profile.passport_public_id or ticket.purpose<>'verify' or ticket.scopes<>array['identity.basic']::text[] then
  raise exception 'Code invalide, expiré ou déjà utilisé.' using errcode='P0001';
 end if;
 update public.passport_verification_tickets set consumed_at=clock_timestamp() where id=ticket.id;
 return jsonb_build_object('passport_public_id',profile.passport_public_id,'passport_state',profile.passport_state,'passport_version',profile.passport_version,
  'passport_issued_at',profile.passport_issued_at,'name',left(profile.name,80),'handle',left(profile.handle,24),'country',left(profile.country,32),
  'public_verified',profile.public_verified,'public_title',case when profile.public_verified then left(profile.public_title,80) else null end,
  'identity_verification_state',profile.identity_verification_state,'identity_assurance_level',profile.identity_assurance_level,
  'identity_verified_at',profile.identity_verified_at,'identity_verification_provider',profile.identity_verification_provider,'identity_verification_ref_hash',profile.identity_verification_ref_hash);
end $$;

create function public.passport_recognition_claims_v1(p_user uuid,p_scopes text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare profile public.member_profiles%rowtype; claims jsonb='{}'; items jsonb;
begin
 if p_scopes is null or cardinality(p_scopes) not between 1 and 4 or
   not p_scopes <@ array['passport.basic','identity.verified','profile.public','access.entitlements']::text[] or
   cardinality(p_scopes)<>(select count(distinct s) from unnest(p_scopes) s) or array_position(p_scopes,null) is not null then
  raise exception 'Informations demandées invalides.' using errcode='22023';
 end if;
 select * into profile from public.member_profiles where user_id=p_user;
 if not found or profile.passport_state<>'active' then raise exception 'Passeport inactif.' using errcode='P0001'; end if;
 if 'passport.basic'=any(p_scopes) then claims=claims||jsonb_build_object('passport_active',true,'passport_version',profile.passport_version); end if;
 if 'identity.verified'=any(p_scopes) then
  if profile.identity_verification_state<>'verified' or profile.identity_assurance_level not in ('identity_verified','high_assurance') or
    profile.identity_verified_at is null or not isfinite(profile.identity_verified_at) or profile.identity_verified_at>clock_timestamp() or nullif(profile.identity_verification_provider,'') is null or
    profile.identity_verification_ref_hash is null or profile.identity_verification_ref_hash !~ '^[0-9a-f]{64}$' then
   raise exception 'Identité civile non vérifiée.' using errcode='P0001';
  end if;
  claims=claims||jsonb_build_object('identity_verified',true);
 end if;
 if 'profile.public'=any(p_scopes) then
  claims=claims||jsonb_build_object('public_handle',left(coalesce(profile.handle,''),24),'display_name',left(coalesce(profile.name,''),80));
 end if;
 if 'access.entitlements'=any(p_scopes) then
  select coalesce(jsonb_agg(code order by code),'[]'::jsonb) into items from (
   select code from (
    select 'digital:'||product_code as code from public.digital_store_entitlements where user_id=p_user and status='active'
    union
    select 'plan:'||plan_code as code from public.member_entitlements where user_id=p_user and status in ('active','trialing') and (current_period_end is null or current_period_end>now())
   ) rights order by code limit 32
  ) limited;
  claims=claims||jsonb_build_object('entitlements',items);
 end if;
 return claims;
end $$;

create function public.passport_recognition_issue_v1(p_user uuid,p_session uuid,p_partner uuid,p_scopes text[],p_nonce_hash text,p_subject text,p_issuer text,p_consent boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare partner public.passport_recognition_partners%rowtype; claims jsonb; proof uuid=gen_random_uuid(); consent uuid; payload jsonb; issued timestamptz=date_trunc('second',clock_timestamp()); expiry timestamptz; scopes text[];
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'Session expirée.' using errcode='28000'; end if;
 perform 1 from public.passport_recognition_settings where singleton and enabled for share;
 if not found then raise exception 'Reconnaissance désactivée.' using errcode='P0001'; end if;
 perform 1 from public.member_profiles where user_id=p_user for update;
 if not found then raise exception 'Passeport absent.' using errcode='P0001'; end if;
 if p_consent is distinct from true then raise exception 'Ton accord est requis.' using errcode='22023'; end if;
 select * into partner from public.passport_recognition_partners where id=p_partner and active for share;
 if not found then raise exception 'Partenaire non actif.' using errcode='P0001'; end if;
 if p_scopes is null or not p_scopes <@ partner.allowed_scopes then raise exception 'Informations non autorisées pour ce partenaire.' using errcode='22023'; end if;
 if p_nonce_hash is null or p_nonce_hash !~ '^[0-9a-f]{64}$' or p_subject is null or p_subject !~ '^[a-zA-Z0-9_-]{32,160}$' or p_issuer is null or p_issuer !~ '^https://[^[:space:]]+$' then
  raise exception 'Demande partenaire invalide.' using errcode='22023';
 end if;
 if (select count(*) from public.passport_recognition_proofs where user_id=p_user and issued_at>now()-interval '10 minutes')>=6 then raise exception 'Trop de demandes. Réessaie dans quelques minutes.' using errcode='P0001'; end if;
 claims=public.passport_recognition_claims_v1(p_user,p_scopes);
 select array_agg(s order by s) into scopes from unnest(p_scopes) s;
 expiry=issued+interval '5 minutes';
 payload=jsonb_build_object('v',1,'iss',p_issuer,'aud',partner.audience,'sub',p_subject,'jti',proof,'iat',floor(extract(epoch from issued))::bigint,'exp',floor(extract(epoch from expiry))::bigint,'nonce_hash',p_nonce_hash,'scopes',to_jsonb(scopes),'claims',claims);
 insert into public.passport_partner_consents(user_id,client_id,scopes,consent_version,granted_at) values(p_user,partner.id::text,scopes,1,issued) returning id into consent;
 insert into public.passport_recognition_proofs(id,user_id,partner_id,consent_id,scopes,nonce_hash,payload,issued_at,expires_at,consent_at)
 values(proof,p_user,partner.id,consent,scopes,p_nonce_hash,payload,issued,expiry,issued);
 return jsonb_build_object('id',proof,'payload',payload,'expires_at',expiry,'partner_name',partner.name);
end $$;

create function public.passport_recognition_consume_v1(p_partner uuid,p_nonce_hash text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proof public.passport_recognition_proofs%rowtype; partner public.passport_recognition_partners%rowtype; owner uuid; current_claims jsonb;
begin
 perform 1 from public.passport_recognition_settings where singleton and enabled for share;
 if not found then raise exception 'Reconnaissance désactivée.' using errcode='P0001'; end if;
 select user_id into owner from public.passport_recognition_proofs where id=(p_payload->>'jti')::uuid;
 if not found then raise exception 'Preuve introuvable.' using errcode='P0001'; end if;
 perform 1 from public.member_profiles where user_id=owner for share;
 select * into proof from public.passport_recognition_proofs where id=(p_payload->>'jti')::uuid for update;
 select * into partner from public.passport_recognition_partners where id=p_partner and active for share;
 if not found or proof.partner_id<>p_partner or proof.revoked_at is not null or proof.consumed_at is not null or proof.expires_at<=clock_timestamp() or
    p_nonce_hash is distinct from proof.nonce_hash or p_payload is distinct from proof.payload or p_payload->>'aud' is distinct from partner.audience or
    not proof.scopes <@ partner.allowed_scopes then raise exception 'Preuve invalide, expirée ou déjà utilisée.' using errcode='P0001'; end if;
 perform 1 from public.passport_partner_consents where id=proof.consent_id and revoked_at is null for share;
 if not found then raise exception 'Consentement révoqué.' using errcode='P0001'; end if;
 current_claims=public.passport_recognition_claims_v1(proof.user_id,proof.scopes);
 if current_claims is distinct from proof.payload->'claims' then raise exception 'Les droits ou informations ont changé.' using errcode='P0001'; end if;
 update public.passport_recognition_proofs set consumed_at=clock_timestamp() where id=proof.id;
 return jsonb_build_object('valid',true,'proof_id',proof.id,'partner_name',partner.name,'claims',current_claims,'scopes',to_jsonb(proof.scopes),'expires_at',proof.expires_at);
end $$;

create function public.passport_recognition_revoke_v1(p_user uuid,p_session uuid,p_proof uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare consent uuid;
begin
 if not coalesce(public.loyalty_session_valid(p_user,p_session),false) then raise exception 'Session expirée.' using errcode='28000'; end if;
 perform 1 from public.member_profiles where user_id=p_user for update;
 update public.passport_recognition_proofs set revoked_at=coalesce(revoked_at,now()) where id=p_proof and user_id=p_user returning consent_id into consent;
 if not found then return false; end if;
 update public.passport_partner_consents set revoked_at=coalesce(revoked_at,now()) where id=consent;
 return true;
end $$;

-- Vault bootstrap is performed by the Edge runtime with freshly generated P-256
-- material; all concurrent cold starts receive the same saved key. No overwrite.
create function public.passport_recognition_signing_material_v1(p_signing_jwk jsonb default null,p_pairwise_secret text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare signing text; pairwise text; enabled boolean;
begin
 select s.enabled into enabled from public.passport_recognition_settings s where singleton for share;
 if enabled is distinct from true then return jsonb_build_object('enabled',false); end if;
 if to_regclass('vault.decrypted_secrets') is null then raise exception 'Vault indisponible.' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(78330261002180000);
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1' into signing using 'passport_recognition_signing_jwk';
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1' into pairwise using 'passport_recognition_pairwise_secret';
 if signing is null or pairwise is null then
  if p_signing_jwk is null or p_signing_jwk->>'kty' is distinct from 'EC' or p_signing_jwk->>'crv' is distinct from 'P-256' or
    coalesce(p_signing_jwk->>'x','') !~ '^[a-zA-Z0-9_-]{43}$' or coalesce(p_signing_jwk->>'y','') !~ '^[a-zA-Z0-9_-]{43}$' or coalesce(p_signing_jwk->>'d','') !~ '^[a-zA-Z0-9_-]{43}$' or
    coalesce(p_signing_jwk->>'kid','') !~ '^[a-zA-Z0-9._-]{1,64}$' or coalesce(length(p_pairwise_secret),0)<32 then raise exception 'Matériau de signature invalide.' using errcode='22023'; end if;
  if signing is null then
   execute 'select vault.create_secret($1,$2,$3)' using p_signing_jwk::text,'passport_recognition_signing_jwk','Private ES256 Passport 3B recognition key; service-only access';
   signing=p_signing_jwk::text;
  end if;
  if pairwise is null then
   execute 'select vault.create_secret($1,$2,$3)' using p_pairwise_secret,'passport_recognition_pairwise_secret','Passport 3B partner pseudonymisation secret';
   pairwise=p_pairwise_secret;
  end if;
 end if;
 return jsonb_build_object('enabled',true,'signing_jwk',signing::jsonb,'pairwise_secret',pairwise);
end $$;

-- A delayed provider webhook cannot undo an administrator's revocation or a
-- newer verification attempt. The Edge has already checked production flow,
-- signature, provider outcome and pairwise session/subject/flow binding.
create function public.passport_identity_confirm_production_v1(p_attempt uuid,p_ref_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; profile public.member_profiles%rowtype; attempt public.passport_identity_verification_attempts%rowtype;
begin
 select user_id into owner from public.passport_identity_verification_attempts where id=p_attempt;
 if not found then return jsonb_build_object('applied',false,'reason','unknown_attempt'); end if;
 select * into profile from public.member_profiles where user_id=owner for update;
 select * into attempt from public.passport_identity_verification_attempts where id=p_attempt for update;
 if profile.user_id is null or profile.passport_state<>'active' or profile.identity_verification_state<>'pending' or
    attempt.provider<>'idnow' or attempt.state not in ('pending','processing') or attempt.provider_consent_at is null or attempt.provider_consent_version is distinct from 1 or
    attempt.provider_session_ref_hash is distinct from p_ref_hash or p_ref_hash is null or p_ref_hash !~ '^[0-9a-f]{64}$' or
    (attempt.expires_at is not null and attempt.expires_at<=clock_timestamp()) or
    exists(select 1 from public.passport_identity_verification_attempts newer where newer.user_id=owner and newer.started_at>attempt.started_at) then
  return jsonb_build_object('applied',false,'reason','state_no_longer_pending');
 end if;
 update public.member_profiles set identity_verification_state='verified',identity_assurance_level='identity_verified',identity_verified_at=clock_timestamp(),identity_verification_provider='idnow',identity_verification_ref_hash=p_ref_hash where user_id=owner;
 update public.passport_identity_verification_attempts set state='verified',completed_at=clock_timestamp(),last_error_code=null where id=p_attempt;
 return jsonb_build_object('applied',true);
end $$;

revoke all on function public.passport_ticket_issue_v1(uuid,uuid,text,timestamptz),public.passport_ticket_revoke_v1(uuid,uuid,uuid),public.passport_ticket_consume_v1(text),
public.passport_recognition_claims_v1(uuid,text[]),public.passport_recognition_issue_v1(uuid,uuid,uuid,text[],text,text,text,boolean),
public.passport_recognition_consume_v1(uuid,text,jsonb),public.passport_recognition_revoke_v1(uuid,uuid,uuid),public.passport_recognition_signing_material_v1(jsonb,text),public.passport_identity_confirm_production_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.passport_ticket_issue_v1(uuid,uuid,text,timestamptz),public.passport_ticket_revoke_v1(uuid,uuid,uuid),public.passport_ticket_consume_v1(text),
public.passport_recognition_claims_v1(uuid,text[]),public.passport_recognition_issue_v1(uuid,uuid,uuid,text[],text,text,text,boolean),
public.passport_recognition_consume_v1(uuid,text,jsonb),public.passport_recognition_revoke_v1(uuid,uuid,uuid),public.passport_recognition_signing_material_v1(jsonb,text),public.passport_identity_confirm_production_v1(uuid,text) to service_role;
