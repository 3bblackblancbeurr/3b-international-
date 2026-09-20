create or replace function public.nexus_get_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_city public.nexus_cities%rowtype;v_account public.economy_accounts%rowtype;v_placements jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select * into v_city from public.nexus_cities where user_id=v_uid;if not found then return jsonb_build_object('ok',false,'reason','city_required');end if;
 select * into v_account from public.economy_accounts where user_id=v_uid;if not found then v_account.xp:=0;v_account.coins:=0;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'building_code',p.building_code,'x',p.x,'z',p.z,'rotation',p.rotation,'upgrade_level',p.upgrade_level,'footprint_w',p.footprint_w,'footprint_h',p.footprint_h) order by p.placed_at),'[]'::jsonb) into v_placements from public.nexus_city_placements p where p.city_id=v_city.city_id;
 return jsonb_build_object('ok',true,'city',jsonb_build_object('city_id',v_city.city_id,'revision',v_city.revision,'name',v_city.name,'origin_country',v_city.origin_country,'visibility',v_city.visibility,'city_xp',v_city.city_xp,'city_level',v_city.city_level,'land_tier',v_city.land_tier,'day_mode',v_city.day_mode,'weather',v_city.weather,'ambience',v_city.ambience),'wallet',jsonb_build_object('xp',coalesce(v_account.xp,0),'coins',coalesce(v_account.coins,0),'token',0),'placements',v_placements);
end$$;
revoke all on function public.nexus_get_state() from public;grant execute on function public.nexus_get_state() to authenticated;
