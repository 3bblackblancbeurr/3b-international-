create or replace function public.nexus_display_collectible(p_item_instance_id uuid,p_x integer,p_z integer,p_rotation smallint,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_item public.item_instances%rowtype;v_def public.inventory_items%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_rotation not in (0,90,180,270) then raise exception 'invalid_rotation';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;
 if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 select * into v_item from public.item_instances where id=p_item_instance_id and owner_id=v_uid for update;if not found then raise exception 'item_not_owned';end if;
 if v_item.state not in ('owned','trade_locked') then raise exception 'item_unavailable';end if;
 select * into v_def from public.inventory_items where code=v_item.item_code and active=true;if not found then raise exception 'item_definition_missing';end if;
 if not public.nexus_can_place_v2(v_city.city_id,p_x,p_z,1,1,p_rotation,null) then raise exception 'display_blocked';end if;
 if exists(select 1 from public.nexus_city_collectible_displays where city_id=v_city.city_id and x=p_x and z=p_z and item_instance_id<>p_item_instance_id) then raise exception 'display_blocked';end if;
 delete from public.nexus_city_collectible_displays where city_id=v_city.city_id and item_instance_id=p_item_instance_id;
 insert into public.nexus_city_collectible_displays(city_id,item_instance_id,x,z,rotation) values(v_city.city_id,p_item_instance_id,p_x,p_z,p_rotation);
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'collectible_display',p_item_instance_id,0,jsonb_build_object('item_code',v_item.item_code,'x',p_x,'z',p_z,'rotation',p_rotation,'token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'revision',v_city.revision,'item_instance_id',p_item_instance_id,'item_code',v_item.item_code,'x',p_x,'z',p_z,'rotation',p_rotation,'token',0);
end$$;
revoke all on function public.nexus_display_collectible(uuid,integer,integer,smallint,bigint) from public;grant execute on function public.nexus_display_collectible(uuid,integer,integer,smallint,bigint) to authenticated;

create or replace function public.nexus_remove_collectible_display(p_item_instance_id uuid,p_expected_revision bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_removed integer;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid for update;if not found then raise exception 'nexus_city_required';end if;if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 delete from public.nexus_city_collectible_displays where city_id=v_city.city_id and item_instance_id=p_item_instance_id;get diagnostics v_removed=row_count;if v_removed=0 then raise exception 'display_not_found';end if;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata) values(v_city.city_id,v_uid,'collectible_remove',p_item_instance_id,0,jsonb_build_object('token',0));
 update public.nexus_cities set revision=revision+1,updated_at=now() where user_id=v_uid returning revision into v_city.revision;
 return jsonb_build_object('ok',true,'revision',v_city.revision,'item_instance_id',p_item_instance_id,'token',0);
end$$;
revoke all on function public.nexus_remove_collectible_display(uuid,bigint) from public;grant execute on function public.nexus_remove_collectible_display(uuid,bigint) to authenticated;
