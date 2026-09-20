create or replace function public.nexus_city_recalculate(p_user uuid)
returns jsonb
language plpgsql
set search_path to ''
as $$
declare
  c public.nexus_cities;
  buildings integer;
  upgrades integer;
  districts integer;
  displays integer;
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
  where city_id=c.city_id;

  select count(*)::integer
  into districts
  from public.nexus_city_districts
  where city_id=c.city_id and unlocked=true;

  select count(*)::integer
  into displays
  from public.nexus_city_collectible_displays
  where city_id=c.city_id;

  xp =
      buildings*100
    + upgrades*60
    + greatest(0,districts-1)*500
    + displays*150
    + least(c.visitors,10000);

  lvl=least(50,greatest(1,(xp/1000)::integer+1));
  tier=least(10,greatest(1,(lvl/5)::integer+1));

  update public.nexus_cities
  set city_xp=xp,
      city_level=lvl,
      land_tier=tier,
      city=jsonb_set(
        jsonb_set(city,'{level}',to_jsonb(lvl),true),
        '{xp}',to_jsonb(xp),true
      ),
      updated_at=now()
  where city_id=c.city_id;

  return jsonb_build_object(
    'xp',xp,
    'level',lvl,
    'landTier',tier,
    'buildings',buildings,
    'upgradePoints',upgrades,
    'districts',districts,
    'displays',displays
  );
end
$$;

create or replace function public.nexus_city_place_v2(
  p_user uuid,
  p_building text,
  p_x integer,
  p_z integer,
  p_rotation smallint,
  p_request uuid
)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  c public.nexus_cities;
  b public.nexus_city_buildings;
  pid uuid;
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
  fw integer;
  fh integer;
  half integer;
  count_build integer;
  v_reward jsonb;
begin
  if p_user is null then raise exception 'Compte invalide'; end if;
  if p_request is null then raise exception 'Identifiant de construction requis'; end if;
  if p_rotation not in (0,90,180,270) then raise exception 'Rotation invalide'; end if;

  -- Same user-scoped lock order as the central economy engine.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));

  select * into c
  from public.nexus_cities
  where user_id=p_user
  for update;
  if not found then raise exception 'Crée ta ville 3B d abord'; end if;

  select id into pid
  from public.nexus_city_placements
  where city_id=c.city_id and request_id=p_request;
  if pid is not null then return pid; end if;

  select count(*)::integer into count_build
  from public.nexus_city_placements
  where city_id=c.city_id and placement_state='placed';

  if count_build>=least(500,50+c.land_tier*45) then
    raise exception 'Limite de constructions atteinte pour ce terrain';
  end if;

  select * into b
  from public.nexus_city_buildings
  where code=p_building and active=true;
  if not found then raise exception 'Bâtiment indisponible'; end if;

  if greatest(1,least(50,c.city_level))<b.unlock_level then
    raise exception 'Niveau de ville insuffisant';
  end if;

  if b.country is not null
     and b.country<>'3B International'
     and not exists(
       select 1
       from public.nexus_city_districts
       where city_id=c.city_id
         and country=b.country
         and unlocked=true
     ) then
    raise exception 'Quartier non débloqué';
  end if;

  fw=greatest(1,least(64,coalesce((b.footprint->>'w')::integer,1)));
  fh=greatest(1,least(64,coalesce((b.footprint->>'h')::integer,1)));
  if p_rotation in (90,270) then select fh,fw into fw,fh; end if;

  half=50+c.land_tier*45;
  if p_x< -half or p_z< -half or p_x+fw-1>half or p_z+fh-1>half then
    raise exception 'Construction hors du terrain';
  end if;

  if exists(
    select 1
    from public.nexus_city_placements q
    where q.city_id=c.city_id
      and q.placement_state='placed'
      and p_x<=q.x+q.footprint_w-1
      and p_x+fw-1>=q.x
      and p_z<=q.z+q.footprint_h-1
      and p_z+fh-1>=q.z
  ) then
    raise exception 'Cette parcelle est déjà occupée';
  end if;

  if b.cost_coins>1000000 then raise exception 'Coût bâtiment hors limites'; end if;

  v_wallet:=public.threeb_wallet_snapshot_server(p_user);
  if b.cost_coins>0 and (v_wallet->>'coins')::bigint<b.cost_coins then
    raise exception 'Coins 3B insuffisants';
  end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  if b.cost_coins>0 then
    v_wallet:=public.threeb_wallet_apply_server(p_user,0,-b.cost_coins);
  end if;

  insert into public.nexus_city_placements(
    city_id,building_code,x,z,rotation,
    footprint_w,footprint_h,request_id,placement_state
  )
  values(
    c.city_id,b.code,p_x,p_z,p_rotation,
    fw,fh,p_request,'placed'
  )
  returning id into pid;

  insert into public.nexus_city_unlocks(city_id,building_code,source)
  values(c.city_id,b.code,'level')
  on conflict do nothing;

  insert into public.nexus_city_journal(
    city_id,user_id,action,reference_id,coins,metadata
  )
  values(
    c.city_id,p_user,'build',pid,-b.cost_coins,
    jsonb_build_object(
      'building',b.code,
      'x',p_x,
      'z',p_z,
      'request_id',p_request,
      'economy_version',coalesce(v_flags.economy_version,'2026.1')
    )
  );

  insert into public.threeb_wallet_ledger(
    user_id,event_key,event_id,xp_delta,coins_delta,
    source,economy_version,rule_version,metadata
  )
  values(
    p_user,'nexus_build_purchase',p_request::text,0,-b.cost_coins,
    'city3b',coalesce(v_flags.economy_version,'2026.1'),'city-build-v2',
    jsonb_build_object('building_code',b.code,'placement_id',pid)
  );

  if b.cost_coins<>0 then
    insert into public.economy_transactions(
      user_id,asset,amount,kind,source,idempotency_key,metadata
    )
    values(
      p_user,'coins',-b.cost_coins,'spend','city3b',
      'city:build:'||p_request::text,
      jsonb_build_object(
        'building_code',b.code,
        'placement_id',pid,
        'economy_version',coalesce(v_flags.economy_version,'2026.1')
      )
    );
  end if;

  if count_build=0
     and not exists(
       select 1
       from public.threeb_wallet_ledger
       where user_id=p_user
         and event_key in ('nexus_first_build_reward','reward:nexus_first_build')
     ) then
    begin
      v_reward:=public.threeb_credit_reward_server(
        p_user,'nexus_first_build','first-v1'
      );
    exception when others then
      if sqlerrm not in (
        'reward_already_claimed',
        'reward_daily_event_cap',
        'reward_daily_value_cap',
        'reward_lifetime_event_cap',
        'reward_cooldown'
      ) then
        raise;
      end if;
    end;
  end if;

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where city_id=c.city_id;

  perform public.nexus_city_recalculate(p_user);

  return pid;
end
$$;

create or replace function public.nexus_upgrade_building(
  p_placement_id uuid,
  p_expected_revision bigint,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid:=auth.uid();
  v_city public.nexus_cities%rowtype;
  v_place public.nexus_city_placements%rowtype;
  v_build public.nexus_city_buildings%rowtype;
  v_wallet jsonb;
  v_price bigint;
  v_required_city_level integer;
  v_reward jsonb;
  v_xp_reward integer:=0;
  v_flags public.threeb_economy_flags%rowtype;
  v_city_stats jsonb;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  if p_request_id is null then raise exception 'request_id_required';end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  v_wallet:=public.threeb_wallet_snapshot_server(v_uid);

  select * into v_city
  from public.nexus_cities
  where user_id=v_uid
  for update;
  if not found then raise exception 'nexus_city_required';end if;

  if v_city.revision<>p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  if exists(
    select 1
    from public.threeb_wallet_ledger
    where user_id=v_uid
      and event_key='nexus_build_upgrade'
      and event_id=p_request_id::text
  ) then
    return v_wallet||jsonb_build_object(
      'ok',true,
      'idempotent',true,
      'revision',v_city.revision,
      'city_level',v_city.city_level
    );
  end if;

  select * into v_place
  from public.nexus_city_placements
  where id=p_placement_id and city_id=v_city.city_id
  for update;
  if not found then raise exception 'placement_not_found';end if;
  if v_place.upgrade_level>=5 then raise exception 'max_upgrade';end if;

  select * into v_build
  from public.nexus_city_buildings
  where code=v_place.building_code and active=true;
  if not found then raise exception 'unknown_building';end if;

  v_required_city_level:=least(
    50,
    greatest(1,v_build.unlock_level+(v_place.upgrade_level*3))
  );

  if v_city.city_level<v_required_city_level then
    raise exception 'city_level_required';
  end if;

  v_price:=round(v_build.cost_coins*power(1.55,v_place.upgrade_level));
  if v_price>1000000 then raise exception 'upgrade_cost_out_of_bounds'; end if;
  if (v_wallet->>'coins')::bigint<v_price then
    raise exception 'insufficient_coins';
  end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  if v_price>0 then
    v_wallet:=public.threeb_wallet_apply_server(v_uid,0,-v_price);
  end if;

  update public.nexus_city_placements
  set upgrade_level=upgrade_level+1
  where id=p_placement_id
  returning * into v_place;

  insert into public.threeb_wallet_ledger(
    user_id,event_key,event_id,xp_delta,coins_delta,
    source,economy_version,rule_version,metadata
  )
  values(
    v_uid,'nexus_build_upgrade',p_request_id::text,0,-v_price,
    'city3b',coalesce(v_flags.economy_version,'2026.1'),'city-upgrade-v2',
    jsonb_build_object(
      'placement_id',p_placement_id,
      'upgrade_level',v_place.upgrade_level,
      'required_city_level',v_required_city_level
    )
  );

  if v_price<>0 then
    insert into public.economy_transactions(
      user_id,asset,amount,kind,source,idempotency_key,metadata
    )
    values(
      v_uid,'coins',-v_price,'spend','city3b',
      'city:upgrade:'||p_request_id::text,
      jsonb_build_object(
        'placement_id',p_placement_id,
        'upgrade_level',v_place.upgrade_level,
        'economy_version',coalesce(v_flags.economy_version,'2026.1')
      )
    );
  end if;

  begin
    v_reward:=public.threeb_credit_reward_server(
      v_uid,
      'nexus_upgrade',
      'upgrade:'||p_placement_id::text||':'||v_place.upgrade_level::text
    );
    v_xp_reward:=coalesce((v_reward->>'xp_awarded')::integer,0);
  exception when others then
    if sqlerrm not in (
      'reward_daily_event_cap',
      'reward_daily_value_cap',
      'reward_lifetime_event_cap',
      'reward_cooldown'
    ) then
      raise;
    end if;
    v_xp_reward:=0;
  end;

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where user_id=v_uid
  returning * into v_city;

  v_city_stats:=public.nexus_city_recalculate(v_uid);
  v_wallet:=public.threeb_wallet_snapshot_server(v_uid);

  return v_wallet||jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'upgrade_level',v_place.upgrade_level,
    'xp_reward',v_xp_reward,
    'city_level',(v_city_stats->>'level')::integer,
    'required_city_level',v_required_city_level,
    'city_xp',(v_city_stats->>'xp')::bigint,
    'revision',v_city.revision
  );
end
$$;

create or replace function public.nexus_city_unlock_district(
  p_user uuid,
  p_country text
)
returns boolean
language plpgsql
set search_path to ''
as $$
declare
  c public.nexus_cities;
  v_seal text;
  v_world jsonb:='{}'::jsonb;
begin
  if p_country not in (
    'France','Italie','Estonie','Turquie',
    'Algérie','Tunisie','Maroc','Espagne'
  ) then
    raise exception 'Quartier invalide';
  end if;

  select * into c
  from public.nexus_cities
  where user_id=p_user
  for update;
  if not found then raise exception 'Ville introuvable'; end if;

  v_seal:=case p_country
    when 'France' then 'france'
    when 'Italie' then 'italie'
    when 'Estonie' then 'estonie'
    when 'Turquie' then 'turquie'
    when 'Algérie' then 'algerie'
    when 'Tunisie' then 'tunisie'
    when 'Maroc' then 'maroc'
    when 'Espagne' then 'espagne'
  end;

  if p_country<>c.origin_country then
    select coalesce(data,'{}'::jsonb)
    into v_world
    from public.member_world_state
    where user_id=p_user;

    if not (
      coalesce(v_world->'seals','[]'::jsonb) ? v_seal
    ) then
      raise exception 'Libère d’abord le Gardien de ce pays dans le Monde du 3B';
    end if;
  end if;

  update public.nexus_city_districts
  set unlocked=true,
      level=greatest(level,1),
      updated_at=now()
  where city_id=c.city_id
    and country=p_country;

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where city_id=c.city_id;

  perform public.nexus_city_recalculate(p_user);

  return true;
end
$$;
