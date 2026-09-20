create or replace function public.nexus_rotated_footprint(p_w integer,p_h integer,p_rotation integer) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'w', greatest(1,ceil(abs(greatest(1,p_w)*cos(radians(((p_rotation%360)+360)%360)))+abs(greatest(1,p_h)*sin(radians(((p_rotation%360)+360)%360))))::integer),
    'h', greatest(1,ceil(abs(greatest(1,p_w)*sin(radians(((p_rotation%360)+360)%360)))+abs(greatest(1,p_h)*cos(radians(((p_rotation%360)+360)%360))))::integer)
  );
$$;
revoke all on function public.nexus_rotated_footprint(integer,integer,integer) from public;

create or replace function public.nexus_purchase_and_place_building(p_building_code text,p_x integer,p_z integer,p_rotation smallint default 0,p_request_id uuid default gen_random_uuid()) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_account public.economy_accounts%rowtype;v_city public.nexus_cities%rowtype;v_build public.nexus_city_buildings%rowtype;v_existing public.nexus_city_placements%rowtype;v_level integer;v_placement_id uuid;v_base_w integer;v_base_h integer;v_w integer;v_h integer;v_rot integer;v_fp jsonb;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 if p_request_id is null then raise exception 'request_id_required'; end if;
 v_rot:=(((p_rotation::integer%360)+360)%360);
 if mod(v_rot,15)<>0 then raise exception 'invalid_rotation'; end if;
 select * into v_account from public.economy_accounts where user_id=v_uid for update;
 if not found then insert into public.economy_accounts(user_id,xp,coins) values(v_uid,0,0) returning * into v_account; end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;
 if not found then raise exception 'nexus_city_required'; end if;
 select * into v_existing from public.nexus_city_placements where city_id=v_city.city_id and request_id=p_request_id;
 if found then return jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'coins',v_account.coins,'xp',v_account.xp,'token',0,'revision',v_city.revision); end if;
 select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;
 if not found then raise exception 'unknown_building'; end if;
 v_level:=least(150,greatest(1,floor(sqrt(greatest(v_account.xp,0)::numeric/110))+1));
 if v_level<v_build.unlock_level then raise exception 'level_required'; end if;
 if v_account.coins<v_build.cost_coins then raise exception 'insufficient_coins'; end if;
 v_base_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));v_base_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));
 v_fp:=public.nexus_rotated_footprint(v_base_w,v_base_h,v_rot);v_w:=(v_fp->>'w')::integer;v_h:=(v_fp->>'h')::integer;
 if not public.nexus_can_place(v_city.city_id,p_x,p_z,v_w,v_h,null) then raise exception 'placement_blocked'; end if;
 update public.economy_accounts set coins=coins-v_build.cost_coins,updated_at=now() where user_id=v_uid returning * into v_account;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level) values(v_city.city_id,v_build.code,p_x,p_z,v_rot::smallint,v_w,v_h,p_request_id,1) returning id into v_placement_id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'rotation',v_rot,'token',0));
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000)) on conflict(user_id,event_key,event_id) do nothing;
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'placement_id',v_placement_id,'coins',v_account.coins,'xp',v_account.xp,'level',v_level,'token',0,'revision',v_city.revision);
end$$;

create or replace function public.nexus_move_building(p_placement_id uuid,p_x integer,p_z integer,p_rotation smallint,p_expected_revision bigint,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_base_w integer;v_base_h integer;v_w integer;v_h integer;v_rot integer;v_fp jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 v_rot:=(((p_rotation::integer%360)+360)%360);if mod(v_rot,15)<>0 then raise exception 'invalid_rotation';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_move' and event_id=p_request_id::text) then return jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision,'token',0);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;
 select * into v_build from public.nexus_city_buildings where code=v_place.building_code;if not found then raise exception 'unknown_building';end if;
 v_base_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));v_base_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));v_fp:=public.nexus_rotated_footprint(v_base_w,v_base_h,v_rot);v_w:=(v_fp->>'w')::integer;v_h:=(v_fp->>'h')::integer;
 if not public.nexus_can_place(v_city.city_id,p_x,p_z,v_w,v_h,p_placement_id) then raise exception 'placement_blocked';end if;
 update public.nexus_city_placements set x=p_x,z=p_z,rotation=v_rot::smallint,footprint_w=v_w,footprint_h=v_h where id=p_placement_id;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_move',p_request_id::text,0,0);
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_move',p_placement_id,0,jsonb_build_object('x',p_x,'z',p_z,'rotation',v_rot,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'idempotent',false,'revision',v_city.revision,'placement_id',p_placement_id,'x',p_x,'z',p_z,'rotation',v_rot,'token',0);
end$$;
