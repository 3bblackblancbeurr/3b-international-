drop function if exists public.nexus_upgrade_building(uuid,uuid);
drop function if exists public.nexus_remove_building(uuid,uuid);
create or replace function public.nexus_upgrade_building(p_placement_id uuid,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_wallet jsonb;v_price bigint;v_level integer;v_required integer;v_xp_reward integer:=90;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
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
revoke all on function public.nexus_upgrade_building(uuid,bigint,uuid) from public;grant execute on function public.nexus_upgrade_building(uuid,bigint,uuid) to authenticated;

create or replace function public.nexus_remove_building(p_placement_id uuid,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_place public.nexus_city_placements%rowtype;v_build public.nexus_city_buildings%rowtype;v_wallet jsonb;v_refund bigint:=0;v_i integer;
begin
 if v_uid is null then raise exception 'authentication_required';end if;if p_request_id is null then raise exception 'request_id_required';end if;
 v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if exists(select 1 from public.threeb_wallet_ledger where user_id=v_uid and event_key='nexus_build_remove' and event_id=p_request_id::text) then return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision);end if;
 select * into v_place from public.nexus_city_placements where id=p_placement_id and city_id=v_city.city_id for update;if not found then raise exception 'placement_not_found';end if;select * into v_build from public.nexus_city_buildings where code=v_place.building_code;if not found then raise exception 'unknown_building';end if;
 if v_build.permanent then v_refund:=0;else v_refund:=floor(v_build.cost_coins*.5);for v_i in 1..greatest(0,v_place.upgrade_level-1) loop v_refund:=v_refund+floor(round(v_build.cost_coins*power(1.55,v_i))*.5);end loop;end if;
 delete from public.nexus_city_placements where id=p_placement_id;v_wallet:=public.threeb_wallet_apply_server(v_uid,0,v_refund);
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta) values(v_uid,'nexus_build_remove',p_request_id::text,0,least(v_refund,1000000));
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'build_remove',p_placement_id,v_refund,jsonb_build_object('building_code',v_place.building_code,'upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;return v_wallet||jsonb_build_object('ok',true,'refund',v_refund,'revision',v_city.revision);
end$$;
revoke all on function public.nexus_remove_building(uuid,bigint,uuid) from public;grant execute on function public.nexus_remove_building(uuid,bigint,uuid) to authenticated;
