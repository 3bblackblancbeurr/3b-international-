-- Canonical 3B XP + 3B Coins wallet synchronizer.
-- XP is mirrored to the existing member profile so the Passport, loyalty UI and Nexus show one progression.
-- 3B Coins remain closed-loop game currency. Token stays disabled.

create or replace function public.threeb_wallet_apply_server(p_user uuid,p_xp_delta integer default 0,p_coins_delta bigint default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_account public.economy_accounts%rowtype;v_profile_xp bigint;v_base_xp bigint;v_new_xp bigint;v_new_coins bigint;
begin
 if p_user is null then raise exception 'invalid_user';end if;
 if abs(p_xp_delta)>1000000 or abs(p_coins_delta)>1000000 then raise exception 'wallet_delta_out_of_bounds';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 insert into public.economy_accounts(user_id,xp,coins) values(p_user,0,0) on conflict(user_id) do nothing;
 select * into v_account from public.economy_accounts where user_id=p_user for update;
 select xp into v_profile_xp from public.member_profiles where user_id=p_user for update;
 v_base_xp:=greatest(v_account.xp::bigint,coalesce(v_profile_xp,0));
 v_new_xp:=least(1000000000::bigint,greatest(0::bigint,v_base_xp+p_xp_delta));
 v_new_coins:=v_account.coins+p_coins_delta;if v_new_coins<0 then raise exception 'insufficient_coins';end if;
 update public.economy_accounts set xp=v_new_xp::integer,coins=v_new_coins,updated_at=now() where user_id=p_user returning * into v_account;
 update public.member_profiles set xp=v_new_xp where user_id=p_user;
 return jsonb_build_object('xp',v_account.xp,'coins',v_account.coins,'token',0);
end$$;
revoke all on function public.threeb_wallet_apply_server(uuid,integer,bigint) from public,anon,authenticated;
grant execute on function public.threeb_wallet_apply_server(uuid,integer,bigint) to service_role;

-- Preserve the highest XP already earned when installing the unified wallet.
insert into public.economy_accounts(user_id,xp,coins)
select user_id,least(1000000000,xp)::integer,0 from public.member_profiles
on conflict(user_id) do update set xp=greatest(public.economy_accounts.xp,excluded.xp),updated_at=now();
update public.member_profiles mp set xp=greatest(mp.xp,ea.xp) from public.economy_accounts ea where ea.user_id=mp.user_id and ea.xp>mp.xp;

create or replace function public.loyalty_grant(p_user uuid,p_key text,p_source text,p_label text,p_xp integer,p_points integer)
returns boolean language plpgsql set search_path='' as $$
declare v_wallet jsonb;
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'Profil introuvable';end if;
 v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
 insert into public.member_ledger(user_id,event_key,source,label,xp,points) values(p_user,p_key,p_source,p_label,p_xp,p_points) on conflict(event_key) do nothing;
 if not found then return false;end if;
 v_wallet:=public.threeb_wallet_apply_server(p_user,p_xp,0);
 update public.member_profiles set points=greatest(0,points+p_points) where user_id=p_user;
 return true;
end$$;

create or replace function public.threeb_credit_reward_server(p_user_id uuid,p_reward_code text,p_event_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_reward public.reward_definitions%rowtype;v_wallet jsonb;
begin
 if p_user_id is null or p_event_id is null or length(p_event_id)<3 then raise exception 'invalid_reward_request';end if;
 select * into v_reward from public.reward_definitions where code=p_reward_code and active=true;if not found then raise exception 'unknown_reward';end if;
 v_wallet:=public.threeb_wallet_apply_server(p_user_id,0,0);
 if exists(select 1 from public.threeb_wallet_ledger where user_id=p_user_id and event_key='reward:'||p_reward_code and event_id=p_event_id) then return v_wallet||jsonb_build_object('ok',true,'idempotent',true);end if;
 if not v_reward.repeatable and exists(select 1 from public.threeb_wallet_ledger where user_id=p_user_id and event_key='reward:'||p_reward_code) then raise exception 'reward_already_claimed';end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(p_user_id,'reward:'||p_reward_code,p_event_id,v_reward.xp,least(v_reward.coins,1000000));
 v_wallet:=public.threeb_wallet_apply_server(p_user_id,v_reward.xp,v_reward.coins);
 return v_wallet||jsonb_build_object('ok',true,'idempotent',false);
end$$;
revoke all on function public.threeb_credit_reward_server(uuid,text,text) from public,anon,authenticated;
grant execute on function public.threeb_credit_reward_server(uuid,text,text) to service_role;
