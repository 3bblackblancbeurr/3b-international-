create or replace function public.nexus_get_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_account public.economy_accounts%rowtype;v_placements jsonb;v_items jsonb;v_displays jsonb;v_item_count bigint;v_supply jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid;if not found then return jsonb_build_object('ok',false,'reason','city_required');end if;
 select * into v_account from public.economy_accounts where user_id=v_uid;if not found then v_account.xp:=0;v_account.coins:=0;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'building_code',p.building_code,'x',p.x,'z',p.z,'rotation',p.rotation,'upgrade_level',p.upgrade_level,'footprint_w',p.footprint_w,'footprint_h',p.footprint_h) order by p.placed_at),'[]'::jsonb) into v_placements from public.nexus_city_placements p where p.city_id=v_city.city_id;
 select count(*) into v_item_count from public.item_instances i where i.owner_id=v_uid;
 select coalesce(jsonb_agg(q.obj order by q.acquired_at desc),'[]'::jsonb) into v_items from (
  select i.acquired_at,jsonb_build_object('id',i.id,'item_code',i.item_code,'serial_no',i.serial_no,'state',i.state,'origin',i.origin,'name',d.name,'item_type',d.item_type,'rarity',d.rarity,'country',d.metadata->>'country','family',d.metadata->>'family','max_supply',d.max_supply) obj
  from public.item_instances i join public.inventory_items d on d.code=i.item_code where i.owner_id=v_uid and d.active=true order by i.acquired_at desc limit 500
 ) q;
 select coalesce(jsonb_agg(jsonb_build_object('item_instance_id',cd.item_instance_id,'item_code',ii.item_code,'x',cd.x,'z',cd.z,'rotation',cd.rotation,'name',d.name,'item_type',d.item_type,'rarity',d.rarity) order by cd.displayed_at),'[]'::jsonb) into v_displays
 from public.nexus_city_collectible_displays cd join public.item_instances ii on ii.id=cd.item_instance_id join public.inventory_items d on d.code=ii.item_code where cd.city_id=v_city.city_id;
 select coalesce(jsonb_agg(jsonb_build_object('rarity',s.rarity,'supply_cap',s.supply_cap,'minted',s.minted,'remaining',s.remaining)),'[]'::jsonb) into v_supply from public.threeb_rarity_supply_status() s;
 return jsonb_build_object('ok',true,'city',jsonb_build_object('city_id',v_city.city_id,'revision',v_city.revision,'name',v_city.name,'origin_country',v_city.origin_country,'visibility',v_city.visibility,'city_xp',v_city.city_xp,'city_level',v_city.city_level,'land_tier',v_city.land_tier,'day_mode',v_city.day_mode,'weather',v_city.weather,'ambience',v_city.ambience),'wallet',jsonb_build_object('xp',coalesce(v_account.xp,0),'coins',coalesce(v_account.coins,0),'token',0),'placements',v_placements,'items',v_items,'item_count',v_item_count,'displays',v_displays,'rarity_supply',v_supply);
end$$;
revoke all on function public.nexus_get_state() from public;grant execute on function public.nexus_get_state() to authenticated;
