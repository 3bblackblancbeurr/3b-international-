create or replace function public.nexus_city_create(p_user uuid,p_name text,p_country text)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  cid uuid;
  clean_name text:=trim(p_name);
  country text;
  v_reward jsonb;
begin
  select mp.country into country
  from public.member_profiles mp
  where mp.user_id=p_user;

  if p_user is null or country is null then raise exception 'Compte 3B introuvable'; end if;
  if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
  if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;

  select city_id into cid
  from public.nexus_cities
  where user_id=p_user
  for update;
  if cid is not null then return cid; end if;

  insert into public.economy_accounts(user_id,xp,coins)
  values(p_user,0,0)
  on conflict(user_id) do nothing;

  insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version)
  values(
    p_user,clean_name,country,'private',
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

  v_reward:=public.threeb_credit_reward_server(p_user,'nexus_starter','starter-v1');

  return cid;
end
$$;

create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  c public.nexus_cities;
  buildings integer;
  upgrades integer;
  roads integer;
  displays integer;
  districts integer;
  target_districts integer;
  xp bigint;
  lvl integer;
  tier integer;
begin
  select * into c
  from public.nexus_cities
  where user_id=p_user
  for update;
  if not found then raise exception 'Ville introuvable'; end if;

  select count(*)::integer,
         coalesce(sum(greatest(upgrade_level-1,0)),0)::integer
  into buildings,upgrades
  from public.nexus_city_placements
  where city_id=c.city_id
    and placement_state='placed';

  roads:=case
    when jsonb_typeof(coalesce(c.city,'{}'::jsonb)->'roads')='array'
      then least(64,jsonb_array_length(c.city->'roads'))
    else 0
  end;

  select count(*)::integer
  into displays
  from public.nexus_city_collectible_displays
  where city_id=c.city_id;

  xp =
      buildings*120
    + upgrades*90
    + roads*80
    + displays*120
    + least(c.visitors,5000);

  lvl=least(50,greatest(1,(xp/750)::integer+1));
  tier=least(10,greatest(1,((lvl-1)/4)::integer+1));

  target_districts:=case
    when lvl>=12 then 8
    when lvl>=10 then 7
    when lvl>=8 then 6
    when lvl>=6 then 5
    when lvl>=4 then 4
    when lvl>=3 then 3
    when lvl>=2 then 2
    else 1
  end;

  with ranked as (
    select
      d.country,
      row_number() over(
        order by
          case when d.country=c.origin_country then 0 else 1 end,
          array_position(
            array['France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie']::text[],
            d.country
          )
      ) as rn
    from public.nexus_city_districts d
    where d.city_id=c.city_id
  )
  update public.nexus_city_districts d
  set unlocked=true,
      level=greatest(d.level,least(10,greatest(1,((lvl-1)/2)::integer+1))),
      updated_at=now()
  from ranked r
  where d.city_id=c.city_id
    and d.country=r.country
    and r.rn<=target_districts;

  select count(*)::integer
  into districts
  from public.nexus_city_districts
  where city_id=c.city_id and unlocked=true;

  update public.nexus_cities
  set city_xp=xp,
      city_level=lvl,
      land_tier=tier,
      city=jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(city,'{}'::jsonb),'{level}',to_jsonb(lvl),true),
          '{xp}',to_jsonb(xp),true
        ),
        '{progression}',to_jsonb('city_only'::text),true
      ),
      updated_at=now()
  where city_id=c.city_id;

  return jsonb_build_object(
    'xp',xp,
    'level',lvl,
    'landTier',tier,
    'buildings',buildings,
    'upgradePoints',upgrades,
    'roads',roads,
    'districts',districts,
    'targetDistricts',target_districts,
    'displays',displays,
    'progression','city_only'
  );
end
$$;

create or replace function public.nexus_city_unlock_district(p_user uuid,p_country text)
returns boolean
language plpgsql
set search_path to ''
as $$
declare
  cid uuid;
  is_open boolean;
begin
  if p_country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then
    raise exception 'Quartier invalide';
  end if;

  perform public.nexus_city_recalculate(p_user);

  select c.city_id into cid
  from public.nexus_cities c
  where c.user_id=p_user;

  if cid is null then raise exception 'Ville introuvable'; end if;

  select d.unlocked into is_open
  from public.nexus_city_districts d
  where d.city_id=cid and d.country=p_country;

  if coalesce(is_open,false)=false then
    raise exception 'Niveau de ville insuffisant pour ce quartier';
  end if;

  return true;
end
$$;

create or replace function public.nexus_city_sync_world(p_user uuid)
returns jsonb
language sql
security invoker
set search_path to ''
as $$
  select jsonb_build_object(
    'unlocked',0,
    'minted',0,
    'decoupled',true,
    'message','Monde du 3B et Ville 3B ont des progressions séparées'
  )
$$;

revoke all on function public.nexus_city_create(uuid,text,text) from public,anon,authenticated;
revoke all on function public.nexus_city_recalculate(uuid) from public,anon,authenticated;
revoke all on function public.nexus_city_unlock_district(uuid,text) from public,anon,authenticated;
revoke all on function public.nexus_city_sync_world(uuid) from public,anon,authenticated;

grant execute on function public.nexus_city_create(uuid,text,text) to service_role;
grant execute on function public.nexus_city_recalculate(uuid) to service_role;
grant execute on function public.nexus_city_unlock_district(uuid,text) to service_role;
grant execute on function public.nexus_city_sync_world(uuid) to service_role;

do $$
declare
  u uuid;
begin
  for u in select user_id from public.nexus_cities loop
    perform public.nexus_city_recalculate(u);
  end loop;
end
$$;
