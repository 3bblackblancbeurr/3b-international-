-- PENDING: opaque physical/digital references. A printed reference never grants a right.
create table public.passport_cards (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reference_hash text not null unique check(reference_hash ~ '^[0-9a-f]{64}$'),
 kind text not null check(kind in ('digital','physical')),
 label text not null check(char_length(label) between 1 and 60),
 state text not null default 'issued' check(state in ('issued','active','revoked')),
 issued_at timestamptz not null default now(), activated_at timestamptz, revoked_at timestamptz,
 expires_at timestamptz not null default now()+interval '2 years',
 last_presented_at timestamptz, last_proof_at timestamptz,
 check(expires_at>issued_at and expires_at<=issued_at+interval '2 years'),
 check(state<>'active' or activated_at is not null), check(state<>'revoked' or revoked_at is not null)
);
create index passport_cards_user_idx on public.passport_cards(user_id,issued_at desc);
alter table public.passport_cards enable row level security;
revoke all on public.passport_cards from public,anon,authenticated;
grant select,insert,update,delete on public.passport_cards to service_role;
create policy deny_browser on public.passport_cards as restrictive for all to anon,authenticated using(false) with check(false);
alter table public.passport_partner_requests add column card_id uuid references public.passport_cards(id);
alter table public.passport_partner_requests add column requested_user_id uuid references auth.users(id) on delete cascade;
alter table public.passport_partner_requests add constraint card_holder_binding check((card_id is null)=(requested_user_id is null));
create index passport_partner_requests_card_idx on public.passport_partner_requests(card_id) where card_id is not null;

create function public.passport_card_list(p_user uuid,p_session uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'label',label,'state',state,
   'issuedAt',issued_at,'activatedAt',activated_at,'revokedAt',revoked_at,'expiresAt',expires_at,
   'lastPresentedAt',last_presented_at,'lastProofAt',last_proof_at) order by issued_at desc)
   from (select * from public.passport_cards where user_id=p_user order by issued_at desc limit 50) c),'[]'::jsonb);
end $$;

create function public.passport_card_issue(p_user uuid,p_session uuid,p_reference text,p_kind text,p_label text,p_replace uuid default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 perform public.passport_assert_member(p_user,p_session);
 if p_reference is null or p_reference !~ '^[0-9a-f]{64}$' or p_kind is null or p_kind not in ('digital','physical') then raise exception 'card invalid'; end if;
 if p_replace is not null then
   update public.passport_cards set state='revoked',revoked_at=coalesce(revoked_at,now()) where id=p_replace and user_id=p_user;
   if not found then raise exception 'card unavailable'; end if;
   update public.passport_partner_requests set state='revoked' where card_id=p_replace and state in ('pending','approved');
 end if;
 if (select count(*) from public.passport_cards where user_id=p_user and state<>'revoked' and expires_at>now())>=5 then raise exception 'card limit'; end if;
 insert into public.passport_cards(user_id,reference_hash,kind,label) values(p_user,p_reference,p_kind,p_label) returning id into v_id;
 return v_id;
end $$;

create function public.passport_card_resolve(p_user uuid,p_session uuid,p_reference text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_card public.passport_cards%rowtype;
begin
 if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
 select * into v_card from public.passport_cards where user_id=p_user and reference_hash=p_reference;
 if not found then raise exception 'card unavailable'; end if;
 return jsonb_build_object('id',v_card.id,'kind',v_card.kind,'label',v_card.label,'state',v_card.state,'expiresAt',v_card.expires_at);
end $$;

create function public.passport_card_activate(p_user uuid,p_session uuid,p_card uuid,p_proof text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_card public.passport_cards%rowtype;
begin
 perform public.passport_assert_member(p_user,p_session);
 select * into v_card from public.passport_cards where id=p_card and user_id=p_user for update;
 if not found or v_card.state<>'issued' or v_card.expires_at<=now() then raise exception 'card unavailable'; end if;
 perform public.passport_stepup_consume(p_user,p_session,p_proof,'credential_manage',
   encode(sha256(convert_to('card_activate:'||p_card::text,'UTF8')),'hex'));
 update public.passport_cards set state='active',activated_at=now() where id=p_card;
 return true;
end $$;

create function public.passport_card_revoke(p_user uuid,p_session uuid,p_card uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.loyalty_session_valid(p_user,p_session) is distinct from true then raise exception 'session expired'; end if;
 perform 1 from public.member_profiles where user_id=p_user for update;
 update public.passport_cards set state='revoked',revoked_at=coalesce(revoked_at,now()) where id=p_card and user_id=p_user;
 if not found then return false; end if;
 update public.passport_partner_requests set state='revoked' where card_id=p_card and state in ('pending','approved');
 return true;
end $$;

create function public.passport_partner_card_request_create(p_client text,p_secret text,p_audience text,p_nonce text,p_scopes text[],p_request text,p_reference text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_card public.passport_cards%rowtype; v_id uuid; v_user uuid;
begin
 select user_id into v_user from public.passport_cards where reference_hash=p_reference;
 perform 1 from public.member_profiles where user_id=v_user and passport_state='active' for update;
 if not found then raise exception 'card unavailable'; end if;
 select * into v_card from public.passport_cards where reference_hash=p_reference and user_id=v_user and state='active' and expires_at>now() for update;
 if not found then raise exception 'card unavailable'; end if;
 v_id:=public.passport_partner_request_create(p_client,p_secret,p_audience,p_nonce,p_scopes,p_request);
 update public.passport_partner_requests set card_id=v_card.id,requested_user_id=v_user where id=v_id;
 update public.passport_cards set last_presented_at=now() where id=v_card.id;
 return v_id;
end $$;

create function public.passport_partner_card_guard() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_card public.passport_cards%rowtype;
begin
 if new.card_id is null then return new; end if;
 if new.user_id is not null and new.user_id is distinct from new.requested_user_id then raise exception 'card holder mismatch'; end if;
 if new.state in ('approved','consumed') then
   select * into v_card from public.passport_cards where id=new.card_id for update;
   if not found or v_card.user_id is distinct from new.requested_user_id or new.user_id is distinct from v_card.user_id
     or v_card.state<>'active' or v_card.expires_at<=now() then raise exception 'card unavailable'; end if;
   if new.state='consumed' then update public.passport_cards set last_proof_at=now() where id=new.card_id; end if;
 end if;
 return new;
end $$;
create trigger passport_partner_card_guard before insert or update on public.passport_partner_requests
for each row execute function public.passport_partner_card_guard();

-- Keep the existing, audited revocation work and extend it to printed cards and unapproved card requests.
alter function public.passport_recovery_revoke(uuid) rename to passport_recovery_revoke_v1;
create function public.passport_recovery_revoke(p_user uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.passport_recovery_revoke_v1(p_user) is distinct from true then raise exception 'recovery revocation failed'; end if;
 if to_regclass('public.passport_verification_tickets') is not null then
  execute 'update public.passport_verification_tickets set revoked_at=coalesce(revoked_at,now()) where user_id=$1 and consumed_at is null' using p_user;
 end if;
 update public.passport_cards set state='revoked',revoked_at=coalesce(revoked_at,now()) where user_id=p_user;
 update public.passport_partner_requests set state='revoked' where requested_user_id=p_user and state in ('pending','approved');
 return true;
end $$;
do $$ declare v_function regprocedure; begin
 for v_function in select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in
 ('passport_card_list','passport_card_resolve','passport_card_issue','passport_card_activate','passport_card_revoke','passport_partner_card_request_create','passport_partner_card_guard','passport_recovery_revoke','passport_recovery_revoke_v1') loop
 execute format('revoke all on function %s from public,anon,authenticated',v_function);
 execute format('grant execute on function %s to service_role',v_function);
 end loop;
end $$;
comment on table public.passport_cards is 'Opaque reference hashes only. QR/NFC is an online routing reference, never a bearer proof or an official identity document. Active cards require a one-use UV WebAuthn confirmation.';

-- An operator may enable initial login only after hosted Auth and recovery qualification.
-- The historical marker cannot be cleared when a rollout is disabled.
create table public.passport_auth_capabilities (
 singleton boolean primary key default true check(singleton),
 initial_passkey_enabled boolean not null default false,
 initial_passkey_ever_enabled boolean not null default false,
 rp_id text, rp_origin text, qualified_at timestamptz, qualification_evidence text,
 check(not initial_passkey_enabled or (initial_passkey_ever_enabled and qualified_at is not null and
   rp_id is not null and rp_origin is not null and qualification_evidence is not null and char_length(qualification_evidence)>=40))
);
insert into public.passport_auth_capabilities(singleton) values(true);
alter table public.passport_auth_capabilities enable row level security;
revoke all on public.passport_auth_capabilities from public,anon,authenticated;
grant select,update on public.passport_auth_capabilities to service_role;
create function public.passport_auth_capability_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin new.initial_passkey_ever_enabled:=old.initial_passkey_ever_enabled or new.initial_passkey_enabled;return new;end $$;
create trigger passport_auth_capability_guard before update on public.passport_auth_capabilities for each row execute function public.passport_auth_capability_guard();
create function public.passport_auth_capability() returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('enabled',initial_passkey_enabled,'everEnabled',initial_passkey_ever_enabled,'rpId',rp_id,'origin',rp_origin,'qualifiedAt',qualified_at)
 from public.passport_auth_capabilities where singleton;
$$;
revoke all on function public.passport_auth_capability(),public.passport_auth_capability_guard() from public,anon,authenticated;
grant execute on function public.passport_auth_capability(),public.passport_auth_capability_guard() to service_role;

create function public.passport_identity_live_assertion(p_user uuid,p_reference text) returns boolean
language sql security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.member_profiles p where p.user_id=p_user and p.passport_state='active'
  and p.identity_verification_state='verified' and p.identity_assurance_level in ('identity_verified','high_assurance')
  and p.identity_verification_ref_hash=p_reference and p.identity_verified_at>now()-interval '365 days'
  and exists(select 1 from public.passport_identity_verification_attempts a where a.user_id=p.user_id
   and a.state='verified' and a.production_live_verified and a.provider_session_ref_hash=p_reference));
$$;
revoke all on function public.passport_identity_live_assertion(uuid,text) from public,anon,authenticated;
grant execute on function public.passport_identity_live_assertion(uuid,text) to service_role;
