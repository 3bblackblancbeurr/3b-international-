create or replace function public.threeb_wallet_apply_server(p_user uuid,p_xp_delta integer default 0,p_coins_delta bigint default 0) returns jsonb language plpgsql security definer set search_path=public as $$
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

insert into public.economy_accounts(user_id,xp,coins)
select user_id,least(1000000000,xp)::integer,0 from public.member_profiles
on conflict(user_id) do update set xp=greatest(public.economy_accounts.xp,excluded.xp),updated_at=now();
update public.member_profiles mp set xp=greatest(mp.xp,ea.xp) from public.economy_accounts ea where ea.user_id=mp.user_id and ea.xp>mp.xp;

create or replace function public.loyalty_grant(p_user uuid,p_key text,p_source text,p_label text,p_xp integer,p_points integer) returns boolean language plpgsql set search_path='' as $$
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

create or replace function public.threeb_credit_reward_server(p_user_id uuid,p_reward_code text,p_event_id text) returns jsonb language plpgsql security definer set search_path=public as $$
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

create or replace function public.nexus_ensure_city(p_origin_country text default 'International') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_country text;v_ledger_id bigint;v_wallet jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 v_country:=case lower(coalesce(p_origin_country,'international')) when 'france' then 'France' when 'italie' then 'Italie' when 'estonie' then 'Estonie' when 'turquie' then 'Turquie' when 'algérie' then 'Algérie' when 'algerie' then 'Algérie' when 'tunisie' then 'Tunisie' when 'maroc' then 'Maroc' when 'espagne' then 'Espagne' else 'International' end;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
 select * into v_city from public.nexus_cities where user_id=v_uid;
 if not found then insert into public.nexus_cities(user_id,name,origin_country,visibility) values(v_uid,'Ma ville 3B',v_country,'private') returning * into v_city;end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_starter_grant','starter-v1',0,500) on conflict(user_id,event_key,event_id) do nothing returning id into v_ledger_id;
 if v_ledger_id is not null then v_wallet:=public.threeb_wallet_apply_server(v_uid,0,500);else v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);end if;
 return jsonb_build_object('ok',true,'city_id',v_city.city_id,'revision',v_city.revision,'name',v_city.name,'origin_country',v_city.origin_country,'visibility',v_city.visibility,'city_level',v_city.city_level,'city_xp',v_city.city_xp,'starter_granted',v_ledger_id is not null,'wallet',v_wallet);
end$$;

create or replace function public.nexus_purchase_and_place_building(p_building_code text,p_x integer,p_z integer,p_rotation smallint default 0,p_request_id uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_build public.nexus_city_buildings%rowtype;v_existing public.nexus_city_placements%rowtype;v_wallet jsonb;v_level integer;v_placement_id uuid;v_w integer;v_h integer;v_before_count integer;v_reward_id bigint;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 select * into v_existing from public.nexus_city_placements where city_id=v_city.city_id and request_id=p_request_id;if found then return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'revision',v_city.revision);end if;
 select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;if not found then raise exception 'unknown_building';end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest((v_wallet->>'xp')::integer,0)::numeric/110))+1));if v_level<v_build.unlock_level then raise exception 'level_required';end if;if (v_wallet->>'coins')::bigint<v_build.cost_coins then raise exception 'insufficient_coins';end if;
 v_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));v_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));if not public.nexus_can_place_v2(v_city.city_id,p_x,p_z,v_w,v_h,p_rotation,null) then raise exception 'placement_blocked';end if;
 select count(*) into v_before_count from public.nexus_city_placements where city_id=v_city.city_id;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,-v_build.cost_coins);
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level) values(v_city.city_id,v_build.code,p_x,p_z,(((p_rotation::integer%360)+360)%360)::smallint,v_w,v_h,p_request_id,1) returning id into v_placement_id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'token',0));
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000)) on conflict(user_id,event_key,event_id) do nothing;
 if v_before_count=0 then insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_first_build_reward','first-v1',60,25) on conflict(user_id,event_key,event_id) do nothing returning id into v_reward_id;if v_reward_id is not null then v_wallet:=public.threeb_wallet_apply_server(v_uid,60,25);update public.nexus_cities set city_xp=city_xp+60 where user_id=v_uid;end if;end if;
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 v_level:=least(150,greatest(1,floor(sqrt(greatest((v_wallet->>'xp')::integer,0)::numeric/110))+1));
 return v_wallet||jsonb_build_object('ok',true,'idempotent',false,'placement_id',v_placement_id,'level',v_level,'first_build_reward',v_reward_id is not null,'revision',v_city.revision);
end$$;

create or replace function public.nexus_upgrade_building(p_placement_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_wallet jsonb;v_price bigint;v_level integer;v_required integer;v_xp_reward integer:=90;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_upgrade' and event_id=p_request_id::text) then return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;if v_place.upgrade_level>=5 then raise exception 'max_upgrade';end if;
 select * into v_build from public.nexus_city_buildings where code=v_place.building_code and active=true;if not found then raise exception 'unknown_building';end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest((v_wallet->>'xp')::integer,0)::numeric/110))+1));v_required:=least(150,greatest(1,v_build.unlock_level+(v_place.upgrade_level*3)));if v_level<v_required then raise exception 'level_required';end if;
 v_price:=round(v_build.cost_coins*power(1.55,v_place.upgrade_level));if (v_wallet->>'coins')::bigint<v_price then raise exception 'insufficient_coins';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,v_xp_reward,-v_price);update public.nexus_city_placements set upgrade_level=upgrade_level+1 where id=p_placement_id returning * into v_place;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_upgrade',p_request_id::text,v_xp_reward,-least(v_price,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_upgrade',p_placement_id,-v_price,jsonb_build_object('upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'required_level',v_required,'xp_reward',v_xp_reward,'token',0));
 update public.nexus_cities set revision=revision+1,city_xp=city_xp+v_xp_reward,updated_at=now() where user_id=v_uid returning * into v_city;v_level:=least(150,greatest(1,floor(sqrt(greatest((v_wallet->>'xp')::integer,0)::numeric/110))+1));
 return v_wallet||jsonb_build_object('ok',true,'idempotent',false,'upgrade_level',v_place.upgrade_level,'xp_reward',v_xp_reward,'level',v_level,'required_level',v_required,'city_xp',v_city.city_xp,'revision',v_city.revision);
end$$;

create or replace function public.nexus_remove_building(p_placement_id uuid,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_wallet jsonb;v_refund bigint:=0;v_i integer;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_remove' and event_id=p_request_id::text) then return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;select * into v_build from public.nexus_city_buildings where code=v_place.building_code;if not found then raise exception 'unknown_building';end if;
 if v_build.permanent then v_refund:=0;else v_refund:=floor(v_build.cost_coins*.5);for v_i in 1..greatest(0,v_place.upgrade_level-1) loop v_refund:=v_refund+floor(round(v_build.cost_coins*power(1.55,v_i))*.5);end loop;end if;
 delete from public.nexus_city_placements where id=p_placement_id;v_wallet:=public.threeb_wallet_apply_server(v_uid,0,v_refund);
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_remove',p_request_id::text,0,least(v_refund,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_remove',p_placement_id,v_refund,jsonb_build_object('building_code',v_place.building_code,'upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;return v_wallet||jsonb_build_object('ok',true,'refund',v_refund,'revision',v_city.revision);
end$$;

revoke all on function public.nexus_ensure_city(text) from public;grant execute on function public.nexus_ensure_city(text) to authenticated;
revoke all on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) from public;grant execute on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) to authenticated;
revoke all on function public.nexus_upgrade_building(uuid,uuid) from public;grant execute on function public.nexus_upgrade_building(uuid,uuid) to authenticated;
revoke all on function public.nexus_remove_building(uuid,uuid) from public;grant execute on function public.nexus_remove_building(uuid,uuid) to authenticated;
