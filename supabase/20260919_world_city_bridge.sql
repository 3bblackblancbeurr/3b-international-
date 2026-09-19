-- World -> City 3B bridge.
-- Server-only: syncs authenticated world achievements into permanent City inventory.
create or replace function public.nexus_city_sync_world(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w jsonb;
  cid uuid;
  region text;
  country_name text;
  item_code text;
  v_origin_ref text;
  secret_id text;
  secret_country text;
  unlocked_count integer := 0;
  minted_count integer := 0;
begin
  if p_user is null then raise exception 'Compte invalide'; end if;
  select data into w from public.member_world_state where user_id=p_user;
  if w is null then return jsonb_build_object('unlocked',0,'minted',0); end if;
  select city_id into cid from public.nexus_cities where user_id=p_user for update;
  if cid is null then return jsonb_build_object('unlocked',0,'minted',0); end if;

  for region in select jsonb_array_elements_text(coalesce(w->'seals','[]'::jsonb))
  loop
    country_name := case region
      when 'france' then 'France' when 'italie' then 'Italie' when 'estonie' then 'Estonie'
      when 'turquie' then 'Turquie' when 'algerie' then 'Algérie' when 'tunisie' then 'Tunisie'
      when 'maroc' then 'Maroc' when 'espagne' then 'Espagne' else null end;
    if country_name is null then continue; end if;

    update public.nexus_city_districts
      set unlocked=true,level=greatest(level,1),updated_at=now()
      where city_id=cid and country=country_name and unlocked=false;
    if found then unlocked_count:=unlocked_count+1; end if;

    item_code:=region||'-companion-unique';
    v_origin_ref:='world:guardian:'||region;
    if exists(select 1 from public.inventory_items where code=item_code and active=true)
       and not exists(select 1 from public.item_instances where owner_id=p_user and item_instances.origin_ref=v_origin_ref)
    then
      perform public.market_mint_item(
        p_user,item_code,'achievement',v_origin_ref,
        jsonb_build_object('source','world','kind','guardian','region',region)
      );
      minted_count:=minted_count+1;
    end if;
  end loop;

  for secret_id in select jsonb_array_elements_text(coalesce(w#>'{hub,secrets}','[]'::jsonb))
  loop
    secret_country:=case secret_id
      when 'secret_waterfall_door' then 'estonie'
      when 'secret_rain_symbol' then 'maroc'
      when 'secret_silent_cabin' then 'turquie'
      when 'secret_abandoned_quay' then 'algerie'
      when 'secret_lost_station' then 'tunisie'
      when 'secret_arena_floor' then 'espagne'
      when 'secret_market_code' then 'maroc'
      when 'secret_city_guest' then 'italie'
      when 'secret_fog_tree' then 'estonie'
      else 'france' end;
    item_code:=secret_country||'-decoration-special';
    v_origin_ref:='world:secret:'||secret_id;
    if exists(select 1 from public.inventory_items where code=item_code and active=true)
       and not exists(select 1 from public.item_instances where owner_id=p_user and item_instances.origin_ref=v_origin_ref)
    then
      perform public.market_mint_item(
        p_user,item_code,'achievement',v_origin_ref,
        jsonb_build_object('source','world','kind','secret','secret',secret_id,'country',secret_country)
      );
      minted_count:=minted_count+1;
    end if;
  end loop;

  if unlocked_count>0 or minted_count>0 then
    update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=cid;
    perform public.nexus_city_recalculate(p_user);
  end if;
  return jsonb_build_object('unlocked',unlocked_count,'minted',minted_count);
end
$$;

revoke all on function public.nexus_city_sync_world(uuid) from public, anon, authenticated;
grant execute on function public.nexus_city_sync_world(uuid) to service_role;
