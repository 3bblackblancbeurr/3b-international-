-- Applied Supabase migration: 20260920163234
-- Unifies Ville 3B with the authoritative global XP curve and economy audit.

insert into public.reward_definitions(code,label,xp,coins,active,repeatable)
values
 ('nexus_starter','Fondation de Ville 3B',0,500,true,false),
 ('nexus_upgrade','Amélioration Ville 3B',90,0,true,true),
 ('world_memory','Souvenir du Monde 3B',120,15,true,true),
 ('world_final','Union des Huit accomplie',2500,500,true,false)
on conflict(code) do update set
 label=excluded.label,xp=excluded.xp,coins=excluded.coins,
 active=excluded.active,repeatable=excluded.repeatable;

insert into public.threeb_reward_policy
(reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,cooldown_seconds,diminishing,min_global_level,sensitive,active)
values
 ('nexus_starter','2026.1',1,0,500,0,'[1,0]',1,false,true),
 ('nexus_upgrade','2026.1',20,900,0,0,'[1,1,1,1,1,0.75,0.5,0.25,0.1,0]',1,false,true),
 ('world_memory','2026.1',24,2880,360,5,'[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0]',1,false,true),
 ('world_final','2026.1',1,2500,500,0,'[1,0]',1,true,true)
on conflict(reward_code) do update set
 policy_version=excluded.policy_version,
 max_events_per_day=excluded.max_events_per_day,
 daily_xp_cap=excluded.daily_xp_cap,
 daily_coins_cap=excluded.daily_coins_cap,
 cooldown_seconds=excluded.cooldown_seconds,
 diminishing=excluded.diminishing,
 min_global_level=excluded.min_global_level,
 sensitive=excluded.sensitive,
 active=excluded.active,
 updated_at=now();

insert into public.threeb_wallet_ledger
(user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
select distinct user_id,'reward:nexus_starter','legacy-starter-v1',0,0,
       'migration','2026.1','compat-v1',
       jsonb_build_object('legacy_event_key','nexus_starter_grant')
from public.threeb_wallet_ledger
where event_key='nexus_starter_grant'
on conflict(user_id,event_key,event_id) do nothing;

insert into public.threeb_wallet_ledger
(user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
select distinct user_id,'reward:nexus_first_build','legacy-first-build-v1',0,0,
       'migration','2026.1','compat-v1',
       jsonb_build_object('legacy_event_key','nexus_first_build_reward')
from public.threeb_wallet_ledger
where event_key='nexus_first_build_reward'
on conflict(user_id,event_key,event_id) do nothing;

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
  select mp.country into country from public.member_profiles mp where mp.user_id=p_user;
  if p_user is null or country is null then raise exception 'Compte 3B introuvable'; end if;
  if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
  if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;

  select city_id into cid from public.nexus_cities where user_id=p_user for update;
  if cid is not null then return cid; end if;

  if not exists(
    select 1 from public.member_world_state
    where user_id=p_user
      and jsonb_array_length(coalesce(data->'beacons','[]'::jsonb))>0
  ) then
    raise exception 'Éveille d’abord un Souvenir dans le Monde du 3B pour fonder ta ville.';
  end if;

  insert into public.economy_accounts(user_id,xp,coins)
  values(p_user,0,0)
  on conflict(user_id) do nothing;

  insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version)
  values(
    p_user,clean_name,country,'private',
    jsonb_build_object('version',2,'level',1,'xp',0,'theme','origin','currency',0,'roads','[]'::jsonb,'placements','[]'::jsonb,'unlocked','[]'::jsonb),
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

create or replace function public.nexus_purchase_and_place_building(
  p_building_code text,p_x integer,p_z integer,
  p_rotation smallint default 0,p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid:=auth.uid();
  v_city public.nexus_cities%rowtype;
  v_build public.nexus_city_buildings%rowtype;
  v_existing public.nexus_city_placements%rowtype;
  v_wallet jsonb;
  v_level integer;
  v_placement_id uuid;
  v_w integer;
  v_h integer;
  v_before_count integer;
  v_reward jsonb;
  v_first_reward boolean:=false;
  v_first_xp integer:=0;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  if p_request_id is null then raise exception 'request_id_required';end if;
  if mod(((p_rotation::integer%360)+360)%360,15)<>0 then raise exception 'invalid_rotation';end if;

  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
  select * into v_city from public.nexus_cities where user_id=v_uid for update;
  if not found then raise exception 'nexus_city_required';end if;

  select * into v_existing from public.nexus_city_placements
  where city_id=v_city.city_id and request_id=p_request_id;
  if found then
    return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'placement_id',v_existing.id,'revision',v_city.revision);
  end if;

  select * into v_build from public.nexus_city_buildings where code=p_building_code and active=true;
  if not found then raise exception 'unknown_building';end if;

  v_level:=public.threeb_level_from_xp((v_wallet->>'xp')::bigint);
  if v_level<v_build.unlock_level then raise exception 'level_required';end if;
  if (v_wallet->>'coins')::bigint<v_build.cost_coins then raise exception 'insufficient_coins';end if;

  v_w:=greatest(1,coalesce((v_build.footprint->>'w')::integer,1));
  v_h:=greatest(1,coalesce((v_build.footprint->>'h')::integer,1));
  if not public.nexus_can_place_v2(v_city.city_id,p_x,p_z,v_w,v_h,p_rotation,null) then
    raise exception 'placement_blocked';
  end if;

  select count(*) into v_before_count from public.nexus_city_placements where city_id=v_city.city_id;
  select * into v_flags from public.threeb_economy_flags where singleton=true;

  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,-v_build.cost_coins);

  insert into public.nexus_city_placements
  (city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,upgrade_level)
  values(v_city.city_id,v_build.code,p_x,p_z,(((p_rotation::integer%360)+360)%360)::smallint,v_w,v_h,p_request_id,1)
  returning id into v_placement_id;

  insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
  values(
    v_city.city_id,v_uid,'build_purchase',v_placement_id,-v_build.cost_coins,
    jsonb_build_object('building_code',v_build.code,'request_id',p_request_id,'token',0,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
  );

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    v_uid,'nexus_build_purchase',p_request_id::text,0,-least(v_build.cost_coins,1000000),
    'city3b',coalesce(v_flags.economy_version,'2026.1'),'city-build-v1',
    jsonb_build_object('building_code',v_build.code,'placement_id',v_placement_id)
  );

  if v_build.cost_coins<>0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      v_uid,'coins',-v_build.cost_coins,'spend','city3b',
      'city:build_purchase:'||p_request_id::text,
      jsonb_build_object('building_code',v_build.code,'placement_id',v_placement_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  if v_before_count=0
     and not exists(
       select 1 from public.threeb_wallet_ledger
       where user_id=v_uid and event_key in ('nexus_first_build_reward','reward:nexus_first_build')
     ) then
    begin
      v_reward:=public.threeb_credit_reward_server(v_uid,'nexus_first_build','first-v1');
      v_first_xp:=coalesce((v_reward->>'xp_awarded')::integer,0);
      v_first_reward:=coalesce((v_reward->>'idempotent')::boolean,false)=false and v_first_xp>0;
    exception when others then
      if sqlerrm not in ('reward_already_claimed','reward_daily_event_cap','reward_daily_value_cap','reward_cooldown') then raise; end if;
    end;
  end if;

  if v_first_xp>0 then
    update public.nexus_cities set city_xp=city_xp+v_first_xp where user_id=v_uid;
    v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
  end if;

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where user_id=v_uid
  returning revision into v_city.revision;

  v_level:=public.threeb_level_from_xp((v_wallet->>'xp')::bigint);

  return v_wallet||jsonb_build_object(
    'ok',true,'idempotent',false,'placement_id',v_placement_id,
    'level',v_level,'first_build_reward',v_first_reward,'revision',v_city.revision
  );
end
$$;

create or replace function public.nexus_upgrade_building(
  p_placement_id uuid,p_expected_revision bigint,p_request_id uuid
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
  v_level integer;
  v_required integer;
  v_reward jsonb;
  v_xp_reward integer:=0;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  if p_request_id is null then raise exception 'request_id_required';end if;

  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
  select * into v_city from public.nexus_cities where user_id=v_uid for update;
  if not found then raise exception 'nexus_city_required';end if;
  if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;

  if exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=v_uid and event_key='nexus_build_upgrade' and event_id=p_request_id::text
  ) then
    return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision);
  end if;

  select * into v_place from public.nexus_city_placements
  where id=p_placement_id and city_id=v_city.city_id for update;
  if not found then raise exception 'placement_not_found';end if;
  if v_place.upgrade_level>=5 then raise exception 'max_upgrade';end if;

  select * into v_build from public.nexus_city_buildings
  where code=v_place.building_code and active=true;
  if not found then raise exception 'unknown_building';end if;

  v_level:=public.threeb_level_from_xp((v_wallet->>'xp')::bigint);
  v_required:=least(150,greatest(1,v_build.unlock_level+(v_place.upgrade_level*3)));
  if v_level<v_required then raise exception 'level_required';end if;

  v_price:=round(v_build.cost_coins*power(1.55,v_place.upgrade_level));
  if (v_wallet->>'coins')::bigint<v_price then raise exception 'insufficient_coins';end if;

  select * into v_flags from public.threeb_economy_flags where singleton=true;
  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,-v_price);

  update public.nexus_city_placements
  set upgrade_level=upgrade_level+1
  where id=p_placement_id
  returning * into v_place;

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    v_uid,'nexus_build_upgrade',p_request_id::text,0,-least(v_price,1000000),
    'city3b',coalesce(v_flags.economy_version,'2026.1'),'city-upgrade-v1',
    jsonb_build_object('placement_id',p_placement_id,'upgrade_level',v_place.upgrade_level)
  );

  if v_price<>0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      v_uid,'coins',-v_price,'spend','city3b',
      'city:upgrade:'||p_request_id::text,
      jsonb_build_object('placement_id',p_placement_id,'upgrade_level',v_place.upgrade_level,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  begin
    v_reward:=public.threeb_credit_reward_server(v_uid,'nexus_upgrade','upgrade:'||p_placement_id::text||':'||v_place.upgrade_level::text);
    v_xp_reward:=coalesce((v_reward->>'xp_awarded')::integer,0);
  exception when others then
    if sqlerrm not in ('reward_daily_event_cap','reward_daily_value_cap','reward_cooldown') then raise; end if;
    v_xp_reward:=0;
  end;

  if v_xp_reward>0 then
    update public.nexus_cities set city_xp=city_xp+v_xp_reward where user_id=v_uid;
  end if;

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where user_id=v_uid
  returning * into v_city;

  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
  v_level:=public.threeb_level_from_xp((v_wallet->>'xp')::bigint);

  return v_wallet||jsonb_build_object(
    'ok',true,'idempotent',false,'upgrade_level',v_place.upgrade_level,
    'xp_reward',v_xp_reward,'level',v_level,'required_level',v_required,
    'city_xp',v_city.city_xp,'revision',v_city.revision
  );
end
$$;

create or replace function public.nexus_remove_building(
  p_placement_id uuid,p_expected_revision bigint,p_request_id uuid
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
  v_refund bigint:=0;
  v_i integer;
  v_flags public.threeb_economy_flags%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  if p_request_id is null then raise exception 'request_id_required';end if;

  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,0);
  select * into v_city from public.nexus_cities where user_id=v_uid for update;
  if not found then raise exception 'nexus_city_required';end if;
  if v_city.revision<>p_expected_revision then raise exception 'revision_conflict';end if;

  if exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=v_uid and event_key='nexus_build_remove' and event_id=p_request_id::text
  ) then
    return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'revision',v_city.revision);
  end if;

  select * into v_place from public.nexus_city_placements
  where id=p_placement_id and city_id=v_city.city_id for update;
  if not found then raise exception 'placement_not_found';end if;

  select * into v_build from public.nexus_city_buildings where code=v_place.building_code;
  if not found then raise exception 'unknown_building';end if;

  if v_build.permanent then
    v_refund:=0;
  else
    v_refund:=floor(v_build.cost_coins*.5);
    for v_i in 1..greatest(0,v_place.upgrade_level-1) loop
      v_refund:=v_refund+floor(round(v_build.cost_coins*power(1.55,v_i))*.5);
    end loop;
  end if;

  select * into v_flags from public.threeb_economy_flags where singleton=true;

  delete from public.nexus_city_placements where id=p_placement_id;
  v_wallet:=public.threeb_wallet_apply_server(v_uid,0,v_refund);

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    v_uid,'nexus_build_remove',p_request_id::text,0,least(v_refund,1000000),
    'city3b',coalesce(v_flags.economy_version,'2026.1'),'city-remove-v1',
    jsonb_build_object('building_code',v_place.building_code,'upgrade_level',v_place.upgrade_level)
  );

  if v_refund<>0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      v_uid,'coins',v_refund,'refund','city3b',
      'city:remove:'||p_request_id::text,
      jsonb_build_object('building_code',v_place.building_code,'placement_id',p_placement_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
  values(
    v_city.city_id,v_uid,'build_remove',p_placement_id,v_refund,
    jsonb_build_object('building_code',v_place.building_code,'upgrade_level',v_place.upgrade_level,'request_id',p_request_id,'token',0,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
  );

  update public.nexus_cities
  set revision=revision+1,updated_at=now()
  where user_id=v_uid
  returning revision into v_city.revision;

  return v_wallet||jsonb_build_object('ok',true,'refund',v_refund,'revision',v_city.revision);
end
$$;
