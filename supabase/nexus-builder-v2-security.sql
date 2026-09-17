-- Nexus Builder V2 authoritative economy / anti-cheat contract.
-- Safe to re-apply: functions are CREATE OR REPLACE and grants are explicit.

create or replace function public.nexus_rotated_cells(p_w integer,p_h integer,p_rotation smallint)
returns integer[] language sql immutable set search_path=public as $$
 with a as(select radians((((p_rotation::integer%360)+360)%360)::double precision) r)
 select array[
  greatest(1,ceil(greatest(1,p_w)*abs(cos(r))+greatest(1,p_h)*abs(sin(r))-1e-10)::integer),
  greatest(1,ceil(greatest(1,p_w)*abs(sin(r))+greatest(1,p_h)*abs(cos(r))-1e-10)::integer)
 ] from a;
$$;

create or replace function public.nexus_can_place_v2(p_city_id uuid,p_x integer,p_z integer,p_w integer,p_h integer,p_rotation smallint,p_ignore uuid default null)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_new integer[];v_scale integer:=12;
begin
 v_new:=public.nexus_rotated_cells(p_w,p_h,p_rotation);
 if abs(p_x)+(v_new[1]*v_scale/2.0)>500 or abs(p_z)+(v_new[2]*v_scale/2.0)>500 then return false;end if;
 if (select count(*) from public.nexus_city_placements where city_id=p_city_id)>=5000 then return false;end if;
 return not exists(
  select 1 from public.nexus_city_placements p
  cross join lateral (select public.nexus_rotated_cells(greatest(1,p.footprint_w),greatest(1,p.footprint_h),p.rotation) dims) r
  where p.city_id=p_city_id and (p_ignore is null or p.id<>p_ignore)
   and abs(p.x-p_x)<=((r.dims[1]+v_new[1])*v_scale/2.0)
   and abs(p.z-p_z)<=((r.dims[2]+v_new[2])*v_scale/2.0)
 );
end$$;
revoke all on function public.nexus_can_place_v2(uuid,integer,integer,integer,integer,smallint,uuid) from public;

create or replace function public.nexus_ensure_city(p_origin_country text default 'International')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_country text;v_ledger_id bigint;v_account public.economy_accounts%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 v_country:=case lower(coalesce(p_origin_country,'international')) when 'france' then 'France' when 'italie' then 'Italie' when 'estonie' then 'Estonie' when 'turquie' then 'Turquie' when 'algérie' then 'Algérie' when 'algerie' then 'Algérie' when 'tunisie' then 'Tunisie' when 'maroc' then 'Maroc' when 'espagne' then 'Espagne' else 'International' end;
 insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) on conflict(user_id) do nothing;
 select * into v_city from public.nexus_cities where user_id=v_uid;
 if not found then insert into public.nexus_cities(user_id,name,origin_country,visibility) values(v_uid,'Ma ville 3B',v_country,'private') returning * into v_city;end if;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_starter_grant','starter-v1',0,500) on conflict(user_id,event_key,event_id) do nothing returning id into v_ledger_id;
 if v_ledger_id is not null then update public.economy_accounts set coins=coins+500,updated_at=now() where user_id=v_uid;end if;
 select * into v_account from public.economy_accounts where user_id=v_uid;
 return jsonb_build_object('ok',true,'city_id',v_city.city_id,'revision',v_city.revision,'name',v_city.name,'origin_country',v_city.origin_country,'visibility',v_city.visibility,'city_level',v_city.city_level,'city_xp',v_city.city_xp,'starter_granted',v_ledger_id is not null,'wallet',jsonb_build_object('xp',v_account.xp,'coins',v_account.coins,'token',0));
end$$;
revoke all on function public.nexus_ensure_city(text) from public;
grant execute on function public.nexus_ensure_city(text) to authenticated;

create or replace function public.nexus_purchase_and_place_building(p_building_code text,p_x integer,p_z integer,p_rotation smallint default 0,p_request_id uuid default gen_random_uuid())
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_build public.nexus_city_buildings%rowtype;v_existing public.nexus_city_placements%rowtype;v_level integer;v_placement_id uuid;v_w integer;v_h integer;v_before_count integer;v_reward_id bigint;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation';end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;if not found then insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) returning * into v_account;end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 select * into v_existing from public.nexus_city_placements where city_id=v_city.city_id and request_id=p_request_id;if found then return jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);end if;
 select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;if not found then raise exception 'unknown_building';end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));if v_level<v_build.unlock_level then raise exception 'level_required';end if;if v_account.coins<v_build.cost_coins then raise exception 'insufficient_coins';end if;
 v_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));v_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));if not public.nexus_can_place_v2(v_city.city_id,p_x,p_z,v_w,v_h,p_rotation,null) then raise exception 'placement_blocked';end if;
 select count(*) into v_before_count from public.nexus_city_placements where city_id=v_city.city_id;
 update public.economy_accounts set coins=coins-v_build.cost_coins,updated_at=now() where user_id=v_uid returning * into v_account;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level) values(v_city.city_id,v_build.code,p_x,p_z,(((p_rotation::integer%360)+360)%360)::smallint,v_w,v_h,p_request_id,1) returning id into v_placement_id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'token',0));
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000)) on conflict(user_id,event_key,event_id) do nothing;
 if v_before_count=0 then
  insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_first_build_reward','first-v1',60,25) on conflict(user_id,event_key,event_id) do nothing returning id into v_reward_id;
  if v_reward_id is not null then update public.economy_accounts set xp=xp+60,coins=coins+25,updated_at=now() where user_id=v_uid returning * into v_account;update public.nexus_cities set city_xp=city_xp+60 where user_id=v_uid;end if;
 end if;
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));
 return jsonb_build_object('ok',true,'idempotent',false,'placement_id',v_placement_id,'coins',v_account.coins,'xp',v_account.xp,'level',v_level,'first_build_reward',v_reward_id is not null,'token',0,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) from public;
grant execute on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) to authenticated;

create or replace function public.nexus_move_building(p_placement_id uuid,p_x integer,p_z integer,p_rotation smallint,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_move' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision,'token',0);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;
 if not public.nexus_can_place_v2(v_city.city_id,p_x,p_z,v_place.footprint_w,v_place.footprint_h,p_rotation,p_placement_id) then raise exception 'placement_blocked';end if;
 update public.nexus_city_placements set x=p_x,z=p_z,rotation=(((p_rotation::integer%360)+360)%360)::smallint where id=p_placement_id;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_move',p_request_id::text,0,0);
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_move',p_placement_id,0,jsonb_build_object('x',p_x,'z',p_z,'rotation',p_rotation,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'revision',v_city.revision,'placement_id',p_placement_id,'x',p_x,'z',p_z,'rotation',p_rotation,'token',0);
end$$;
revoke all on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) from public;
grant execute on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) to authenticated;

create or replace function public.nexus_upgrade_building(p_placement_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_price bigint;v_level integer;v_required integer;v_xp_reward integer:=90;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;if not found then raise exception 'wallet_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_upgrade' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;if v_place.upgrade_level>=5 then raise exception 'max_upgrade';end if;
 select * into v_build from public.nexus_city_buildings where code=v_place.building_code and active=true;if not found then raise exception 'unknown_building';end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));v_required:=least(150,greatest(1,v_build.unlock_level+(v_place.upgrade_level*3)));if v_level<v_required then raise exception 'level_required';end if;
 v_price:=round(v_build.cost_coins*power(1.55,v_place.upgrade_level));if v_account.coins<v_price then raise exception 'insufficient_coins';end if;
 update public.economy_accounts set coins=coins-v_price,xp=xp+v_xp_reward,updated_at=now() where user_id=v_uid returning * into v_account;
 update public.nexus_city_placements set upgrade_level=upgrade_level+1 where id=p_placement_id returning * into v_place;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_upgrade',p_request_id::text,v_xp_reward,-least(v_price,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_upgrade',p_placement_id,-v_price,jsonb_build_object('upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'required_level',v_required,'xp_reward',v_xp_reward,'token',0));
 update public.nexus_cities set revision=revision+1,city_xp=city_xp+v_xp_reward,updated_at=now() where user_id=v_uid returning * into v_city;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));
 return jsonb_build_object('ok',true,'idempotent',false,'upgrade_level',v_place.upgrade_level,'coins',v_account.coins,'xp',v_account.xp,'xp_reward',v_xp_reward,'level',v_level,'required_level',v_required,'city_xp',v_city.city_xp,'token',0,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_upgrade_building(uuid,uuid) from public;
grant execute on function public.nexus_upgrade_building(uuid,uuid) to authenticated;

-- Direct writes remain denied; clients mutate the economy only through guarded RPCs.
revoke insert,update,delete,truncate on public.economy_accounts from anon,authenticated;
revoke insert,update,delete,truncate on public.threeb_wallet_ledger from anon,authenticated;
revoke insert,update,delete,truncate on public.nexus_city_placements from anon,authenticated;
