create or replace function public.nexus_city_create(p_user uuid, p_name text, p_country text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  cid uuid;
  clean_name text := trim(p_name);
  country text;
  passport_state text;
  starter_ledger_id bigint;
begin
  select mp.country, mp.passport_state
  into country, passport_state
  from public.member_profiles mp
  where mp.user_id = p_user;

  if p_user is null or country is null then
    raise exception 'Passeport 3B introuvable';
  end if;
  if passport_state is distinct from 'active' then
    raise exception 'Passeport 3B inactif';
  end if;
  if length(clean_name) < 2 or length(clean_name) > 40 then
    raise exception 'Nom de ville invalide';
  end if;
  if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then
    raise exception 'Pays 3B invalide';
  end if;

  select city_id into cid
  from public.nexus_cities
  where user_id = p_user
  for update;

  if cid is not null then
    return cid;
  end if;

  insert into public.economy_accounts(user_id,xp,coins)
  values(p_user,0,0)
  on conflict(user_id) do nothing;

  insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version)
  values(
    p_user,
    clean_name,
    country,
    'private',
    jsonb_build_object(
      'version',3,
      'level',1,
      'xp',0,
      'theme','origin',
      'currency',0,
      'roads','[]'::jsonb,
      'placements','[]'::jsonb,
      'unlocked','[]'::jsonb,
      'progression','city_only'
    ),
    1
  )
  returning city_id into cid;

  insert into public.nexus_city_districts(city_id,country,level,unlocked,xp)
  select cid,c,case when c=country then 1 else 0 end,c=country,0
  from unnest(array['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne']) c;

  insert into public.nexus_city_unlocks(city_id,building_code,source)
  select cid,code,'starter'
  from public.nexus_city_buildings
  where metadata->>'starter'='true' and active=true
  on conflict do nothing;

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

revoke all on function public.nexus_city_create(uuid,text,text) from public, anon, authenticated;
grant execute on function public.nexus_city_create(uuid,text,text) to service_role;

create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  c public.nexus_cities;
  buildings integer;
  roads integer;
  displays integer;
  xp bigint;
  lvl integer;
  tier integer;
  unlock_count integer;
  unlocked_count integer;
begin
  select * into c
  from public.nexus_cities
  where user_id = p_user
  for update;

  if not found then
    raise exception 'Ville introuvable';
  end if;

  select count(*) into buildings
  from public.nexus_city_placements
  where city_id = c.city_id
    and coalesce(placement_state,'placed') = 'placed';

  roads := jsonb_array_length(coalesce(c.city->'roads','[]'::jsonb));

  select count(*) into displays
  from public.nexus_city_collectible_displays
  where city_id = c.city_id;

  xp := buildings * 250
      + roads * 120
      + displays * 120
      + least(c.visitors,5000);

  lvl := least(50, greatest(1, (xp / 1000)::integer + 1));
  tier := least(10, greatest(1, ((lvl - 1) / 4)::integer + 1));

  unlock_count := case
    when lvl >= 29 then 8
    when lvl >= 22 then 7
    when lvl >= 16 then 6
    when lvl >= 11 then 5
    when lvl >= 7 then 4
    when lvl >= 4 then 3
    when lvl >= 2 then 2
    else 1
  end;

  with ranked as (
    select
      d.country,
      row_number() over (
        order by
          case when d.country = c.origin_country then 0 else 1 end,
          case d.country
            when 'France' then 1
            when 'Algérie' then 2
            when 'Maroc' then 3
            when 'Tunisie' then 4
            when 'Espagne' then 5
            when 'Italie' then 6
            when 'Turquie' then 7
            when 'Estonie' then 8
            else 99
          end
      ) as rn
    from public.nexus_city_districts d
    where d.city_id = c.city_id
  )
  update public.nexus_city_districts d
  set
    unlocked = ranked.rn <= unlock_count,
    level = case
      when ranked.rn <= unlock_count then greatest(1, least(10, ((lvl - 1) / 5)::integer + 1))
      else 0
    end,
    updated_at = now()
  from ranked
  where d.city_id = c.city_id
    and d.country = ranked.country;

  select count(*) into unlocked_count
  from public.nexus_city_districts
  where city_id = c.city_id
    and unlocked = true;

  update public.nexus_cities
  set
    city_xp = xp,
    city_level = lvl,
    land_tier = tier,
    city = jsonb_set(
      jsonb_set(
        jsonb_set(city,'{level}',to_jsonb(lvl),true),
        '{xp}',to_jsonb(xp),true
      ),
      '{progression}',to_jsonb('city_only'::text),true
    ),
    updated_at = now()
  where city_id = c.city_id;

  return jsonb_build_object(
    'xp',xp,
    'level',lvl,
    'landTier',tier,
    'districts',unlocked_count,
    'buildings',buildings,
    'roads',roads,
    'displays',displays
  );
end
$function$;

revoke all on function public.nexus_city_recalculate(uuid) from public, anon, authenticated;
grant execute on function public.nexus_city_recalculate(uuid) to service_role;

create or replace function public.nexus_city_unlock_district(p_user uuid,p_country text)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
begin
  raise exception 'Les quartiers se débloquent automatiquement avec la progression de la Ville 3B';
end
$function$;

revoke all on function public.nexus_city_unlock_district(uuid,text) from public, anon, authenticated;
grant execute on function public.nexus_city_unlock_district(uuid,text) to service_role;
