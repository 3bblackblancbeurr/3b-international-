-- The member profile is the single source of truth for Passport 3B origin.
-- p_country is kept only for compatibility with existing clients; it is ignored.
create or replace function public.nexus_city_create(p_user uuid, p_name text, p_country text)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
 cid uuid;
 clean_name text:=trim(p_name);
 country text;
 starter_ledger_id bigint;
begin
 select mp.country into country
 from public.member_profiles mp
 where mp.user_id=p_user;

 if p_user is null or country is null then raise exception 'Compte 3B introuvable'; end if;
 if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
 if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;

 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is not null then return cid; end if;

 if not exists(
   select 1
   from public.member_world_state
   where user_id=p_user
     and jsonb_array_length(coalesce(data->'beacons','[]'::jsonb))>0
 ) then
   raise exception 'Éveille d’abord un Souvenir dans le Monde du 3B pour fonder ta ville.';
 end if;

 insert into public.economy_accounts(user_id,xp,coins) values(p_user,0,0) on conflict(user_id) do nothing;
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
end
$function$;
