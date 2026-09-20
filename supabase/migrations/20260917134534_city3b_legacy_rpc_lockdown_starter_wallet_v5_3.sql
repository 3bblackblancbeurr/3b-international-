create or replace function public.nexus_city_create(p_user uuid,p_name text,p_country text)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 cid uuid;
 clean_name text:=trim(p_name);
 country text:=p_country;
 starter_ledger_id bigint;
begin
 if p_user is null or not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'Compte 3B introuvable'; end if;
 if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
 if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;
 insert into public.economy_accounts(user_id,xp,coins) values(p_user,0,0) on conflict(user_id) do nothing;
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is not null then return cid; end if;
 insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version)
 values(p_user,clean_name,country,'private',jsonb_build_object('version',2,'level',1,'xp',0,'theme','origin','currency',0,'roads','[]'::jsonb,'placements','[]'::jsonb,'unlocked','[]'::jsonb),1)
 returning city_id into cid;
 insert into public.nexus_city_districts(city_id,country,level,unlocked,xp)
 select cid,c,case when c=country then 1 else 0 end,c=country,0
 from unnest(array['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne']) c;
 insert into public.nexus_city_unlocks(city_id,building_code,source)
 select cid,code,'starter' from public.nexus_city_buildings where metadata->>'starter'='true' and active=true on conflict do nothing;
 insert into public.threeb_wallet_ledger(user_id,event_key,event_id,xp_delta,coins_delta)
 values(p_user,'nexus_starter_grant','starter-v1',0,500)
 on conflict(user_id,event_key,event_id) do nothing
 returning id into starter_ledger_id;
 if starter_ledger_id is not null then
   perform public.threeb_wallet_apply_server(p_user,0,500);
 end if;
 return cid;
end $$;

revoke all on function public.nexus_can_place(uuid,integer,integer,integer,integer,uuid) from public,anon,authenticated;
revoke all on function public.nexus_can_place_v2(uuid,integer,integer,integer,integer,smallint,uuid) from public,anon,authenticated;
revoke all on function public.nexus_display_collectible(uuid,integer,integer,smallint,bigint) from public,anon,authenticated;
revoke all on function public.nexus_ensure_city(text) from public,anon,authenticated;
revoke all on function public.nexus_get_state() from public,anon,authenticated;
revoke all on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) from public,anon,authenticated;
revoke all on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) from public,anon,authenticated;
revoke all on function public.nexus_remove_building(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nexus_remove_collectible_display(uuid,bigint) from public,anon,authenticated;
revoke all on function public.nexus_set_city_preferences(text,text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.nexus_upgrade_building(uuid,uuid) from public,anon,authenticated;

grant execute on function public.nexus_can_place(uuid,integer,integer,integer,integer,uuid) to service_role;
grant execute on function public.nexus_can_place_v2(uuid,integer,integer,integer,integer,smallint,uuid) to service_role;
grant execute on function public.nexus_display_collectible(uuid,integer,integer,smallint,bigint) to service_role;
grant execute on function public.nexus_ensure_city(text) to service_role;
grant execute on function public.nexus_get_state() to service_role;
grant execute on function public.nexus_move_building(uuid,integer,integer,smallint,bigint,uuid) to service_role;
grant execute on function public.nexus_purchase_and_place_building(text,integer,integer,smallint,uuid) to service_role;
grant execute on function public.nexus_remove_building(uuid,uuid) to service_role;
grant execute on function public.nexus_remove_collectible_display(uuid,bigint) to service_role;
grant execute on function public.nexus_set_city_preferences(text,text,text,text,text,bigint) to service_role;
grant execute on function public.nexus_upgrade_building(uuid,uuid) to service_role;

alter function public.nexus_rotated_footprint(integer,integer,integer) set search_path='';
