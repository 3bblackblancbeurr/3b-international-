-- 1) Real XP curve versioning: allow multiple curve versions side-by-side.
alter table public.threeb_level_curve
  drop constraint if exists threeb_level_curve_pkey;

alter table public.threeb_level_curve
  add constraint threeb_level_curve_pkey
  primary key (curve_version, level);

create or replace function public.threeb_level_from_xp(
  p_xp bigint,
  p_curve_version text
)
returns integer
language sql
stable
set search_path=''
as $$
  select coalesce(max(c.level),1)::integer
  from public.threeb_level_curve c
  where c.curve_version=coalesce(
    nullif(p_curve_version,''),
    (select f.xp_curve_version from public.threeb_economy_flags f where f.singleton=true),
    'global-150-v1'
  )
  and c.xp_required<=greatest(coalesce(p_xp,0),0);
$$;

revoke all on function public.threeb_level_from_xp(bigint,text)
from public,anon;
grant execute on function public.threeb_level_from_xp(bigint,text)
to authenticated,service_role;

create or replace function public.threeb_level_from_xp(p_xp bigint)
returns integer
language sql
stable
set search_path=''
as $$
  select public.threeb_level_from_xp(
    p_xp,
    (select f.xp_curve_version
     from public.threeb_economy_flags f
     where f.singleton=true)
  );
$$;

revoke all on function public.threeb_level_from_xp(bigint)
from public,anon;
grant execute on function public.threeb_level_from_xp(bigint)
to authenticated,service_role;

-- 2) Prestige eligibility derives from durable server state.
create or replace function public.threeb_prestige_eligibility_server(p_user uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_level integer:=1;
  v_current integer:=0;
  v_next integer:=1;
  v_world jsonb:='{}'::jsonb;
  v_seals integer:=0;
  v_memories integer:=0;
  v_secrets integer:=0;
  v_claimed_missions integer:=0;
  v_world_final boolean:=false;
  v_city_level integer:=0;
  v_unlocked_districts integer:=0;
  v_eligible boolean:=false;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  select coalesce(prestige_level,0)
  into v_current
  from public.threeb_prestige_profiles
  where user_id=p_user;
  v_current:=coalesce(v_current,0);

  select coalesce(data,'{}'::jsonb)
  into v_world
  from public.member_world_state
  where user_id=p_user;

  v_world:=coalesce(v_world,'{}'::jsonb);
  v_seals:=jsonb_array_length(coalesce(v_world->'seals','[]'::jsonb));
  v_memories:=jsonb_array_length(coalesce(v_world->'beacons','[]'::jsonb));
  v_secrets:=jsonb_array_length(coalesce(v_world#>'{hub,secrets}','[]'::jsonb));

  select count(*)::integer
  into v_claimed_missions
  from jsonb_each(coalesce(v_world#>'{hub,missions}','{}'::jsonb))
  where coalesce((value->>'claimed')::boolean,false);

  select exists(
    select 1
    from public.threeb_wallet_ledger
    where user_id=p_user
      and event_key='reward:world_final'
  )
  into v_world_final;

  select coalesce(city_level,0)
  into v_city_level
  from public.nexus_cities
  where user_id=p_user;
  v_city_level:=coalesce(v_city_level,0);

  select count(*)::integer
  into v_unlocked_districts
  from public.nexus_city_districts d
  join public.nexus_cities c on c.city_id=d.city_id
  where c.user_id=p_user and d.unlocked=true;

  v_next:=least(3,v_current+1);

  if v_current=0 then
    v_eligible:=(
      v_level>=150
      and v_seals>=8
      and v_memories>=8
      and v_world_final
    );
  elsif v_current=1 then
    v_eligible:=(
      v_level>=150
      and v_secrets>=16
      and v_claimed_missions>=20
    );
  elsif v_current=2 then
    v_eligible:=(
      v_level>=150
      and v_city_level>=8
      and v_unlocked_districts>=8
    );
  else
    v_eligible:=false;
    v_next:=3;
  end if;

  return jsonb_build_object(
    'current_prestige',v_current,
    'next_prestige',v_next,
    'eligible',v_eligible,
    'level',v_level,
    'seals',v_seals,
    'memories',v_memories,
    'hub_secrets',v_secrets,
    'claimed_hub_missions',v_claimed_missions,
    'world_final',v_world_final,
    'city_level',v_city_level,
    'unlocked_city_districts',v_unlocked_districts
  );
end
$$;

revoke all on function public.threeb_prestige_eligibility_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_prestige_eligibility_server(uuid)
to service_role;

create or replace function public.threeb_unlock_prestige_server(
  p_user uuid,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_level integer;
  v_before integer;
  v_after integer;
  v_eligibility jsonb;
begin
  if p_user is null
     or p_event_id is null
     or p_event_id !~ '^[A-Za-z0-9:_-]{3,160}$' then
    raise exception 'invalid_prestige_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,29));

  if exists(
    select 1
    from public.threeb_prestige_events
    where user_id=p_user and event_id=p_event_id
  ) then
    select prestige_level into v_after
    from public.threeb_prestige_profiles
    where user_id=p_user;

    return jsonb_build_object(
      'ok',true,
      'idempotent',true,
      'prestige_level',coalesce(v_after,0)
    );
  end if;

  v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  insert into public.threeb_prestige_profiles(user_id,prestige_level,updated_at)
  values(p_user,0,now())
  on conflict(user_id) do nothing;

  select prestige_level
  into v_before
  from public.threeb_prestige_profiles
  where user_id=p_user
  for update;

  if v_before>=3 then raise exception 'prestige_max'; end if;

  v_eligibility:=public.threeb_prestige_eligibility_server(p_user);

  if coalesce((v_eligibility->>'eligible')::boolean,false) is not true then
    raise exception 'prestige_requirements_not_met';
  end if;

  v_after:=v_before+1;

  update public.threeb_prestige_profiles
  set prestige_level=v_after,
      unlocked_at=coalesce(unlocked_at,now()),
      updated_at=now()
  where user_id=p_user;

  insert into public.threeb_prestige_events
    (user_id,event_id,prestige_before,prestige_after)
  values
    (p_user,p_event_id,v_before,v_after);

  return jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'prestige_level',v_after,
    'title',public.threeb_progress_title(v_level,v_after)
  );
end
$$;

revoke all on function public.threeb_unlock_prestige_server(uuid,text)
from public,anon,authenticated;
grant execute on function public.threeb_unlock_prestige_server(uuid,text)
to service_role;

-- 3) Season multipliers are authoritative server-side and still subject to daily caps.
create or replace function public.threeb_credit_reward_server(
  p_user_id uuid,
  p_reward_code text,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.reward_definitions%rowtype;
  v_policy public.threeb_reward_policy%rowtype;
  v_flags public.threeb_economy_flags%rowtype;
  v_wallet jsonb;
  v_event_key text;
  v_idempotency text;
  v_today timestamptz;
  v_count integer := 0;
  v_last timestamptz;
  v_xp_today bigint := 0;
  v_coins_today bigint := 0;
  v_factor numeric := 1;
  v_index integer := 0;
  v_xp_delta integer := 0;
  v_coins_delta bigint := 0;
  v_level integer := 1;
  v_risk integer := 0;
  v_season_code text:=null;
  v_season_xp numeric:=1;
  v_season_coins numeric:=1;
begin
  if p_user_id is null
     or p_event_id is null
     or p_event_id !~ '^[A-Za-z0-9:_-]{3,160}$'
     or p_reward_code is null
     or length(p_reward_code) > 80 then
    raise exception 'invalid_reward_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));

  select * into v_reward
  from public.reward_definitions
  where code=p_reward_code and active=true;
  if not found then raise exception 'unknown_reward'; end if;

  select * into v_policy
  from public.threeb_reward_policy
  where reward_code=p_reward_code and active=true;
  if not found then raise exception 'reward_policy_missing'; end if;

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select coalesce(risk_score,0) into v_risk
  from public.threeb_economy_risk_profiles
  where user_id=p_user_id;
  v_risk:=coalesce(v_risk,0);

  if v_policy.sensitive and v_risk>=50 then
    raise exception 'sensitive_reward_review_required';
  end if;

  if coalesce(v_flags.season_enabled,false) then
    select code,xp_multiplier,coins_multiplier
    into v_season_code,v_season_xp,v_season_coins
    from public.threeb_seasons
    where status='active'
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>now())
    order by starts_at nulls first,code
    limit 1;

    v_season_xp:=coalesce(v_season_xp,1);
    v_season_coins:=coalesce(v_season_coins,1);
  end if;

  v_event_key := 'reward:'||p_reward_code;
  v_idempotency := v_event_key||':'||p_event_id;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,0,0);

  if exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=p_user_id
      and event_key=v_event_key
      and event_id=p_event_id
  ) then
    return v_wallet||jsonb_build_object(
      'ok',true,
      'idempotent',true,
      'reward_code',p_reward_code
    );
  end if;

  if not v_reward.repeatable and exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=p_user_id and event_key=v_event_key
  ) then
    raise exception 'reward_already_claimed';
  end if;

  v_level := public.threeb_level_from_xp((v_wallet->>'xp')::bigint);
  if v_level < v_policy.min_global_level then
    raise exception 'reward_level_required';
  end if;

  if coalesce(v_flags.new_economy_enabled,true) then
    v_today := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';

    select count(*)::integer,max(created_at),
           coalesce(sum(greatest(xp_delta,0)),0)::bigint,
           coalesce(sum(greatest(coins_delta,0)),0)::bigint
    into v_count,v_last,v_xp_today,v_coins_today
    from public.threeb_wallet_ledger
    where user_id=p_user_id
      and event_key=v_event_key
      and created_at >= v_today;

    if v_policy.max_events_per_day is not null
       and v_count >= v_policy.max_events_per_day then
      raise exception 'reward_daily_event_cap';
    end if;

    if v_policy.cooldown_seconds > 0
       and v_last is not null
       and v_last > now() - make_interval(secs=>v_policy.cooldown_seconds) then
      raise exception 'reward_cooldown';
    end if;

    if jsonb_array_length(v_policy.diminishing) > 0 then
      v_index := least(v_count,jsonb_array_length(v_policy.diminishing)-1);
      v_factor := greatest(0,least(1,(v_policy.diminishing->>v_index)::numeric));
    end if;
  end if;

  v_xp_delta := round(v_reward.xp * v_factor * v_season_xp)::integer;
  v_coins_delta := round(v_reward.coins * v_factor * v_season_coins)::bigint;

  if coalesce(v_flags.new_economy_enabled,true) then
    if v_policy.daily_xp_cap is not null then
      v_xp_delta := least(v_xp_delta,greatest(0,v_policy.daily_xp_cap-v_xp_today)::integer);
    end if;
    if v_policy.daily_coins_cap is not null then
      v_coins_delta := least(v_coins_delta,greatest(0,v_policy.daily_coins_cap-v_coins_today));
    end if;
  end if;

  if v_xp_delta = 0 and v_coins_delta = 0 then
    raise exception 'reward_daily_value_cap';
  end if;

  insert into public.threeb_wallet_ledger
  (user_id,event_key,event_id,xp_delta,coins_delta,source,economy_version,rule_version,metadata)
  values(
    p_user_id,v_event_key,p_event_id,v_xp_delta,v_coins_delta,
    'reward',coalesce(v_flags.economy_version,'2026.1'),v_policy.policy_version,
    jsonb_build_object(
      'reward_code',p_reward_code,
      'factor',v_factor,
      'daily_count_before',v_count,
      'global_level',v_level,
      'sensitive',v_policy.sensitive,
      'risk_score',v_risk,
      'season_code',v_season_code,
      'season_xp_multiplier',v_season_xp,
      'season_coins_multiplier',v_season_coins
    )
  );

  if v_xp_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'xp',v_xp_delta,'earn','reward',v_idempotency,
      jsonb_build_object(
        'reward_code',p_reward_code,
        'event_id',p_event_id,
        'economy_version',coalesce(v_flags.economy_version,'2026.1'),
        'season_code',v_season_code
      )
    );
  end if;

  if v_coins_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'coins',v_coins_delta,'earn','reward',v_idempotency,
      jsonb_build_object(
        'reward_code',p_reward_code,
        'event_id',p_event_id,
        'economy_version',coalesce(v_flags.economy_version,'2026.1'),
        'season_code',v_season_code
      )
    );
  end if;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,v_xp_delta,v_coins_delta);

  return v_wallet||jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'reward_code',p_reward_code,
    'xp_awarded',v_xp_delta,
    'coins_awarded',v_coins_delta,
    'diminishing_factor',v_factor,
    'season_code',v_season_code
  );
end
$$;

revoke all on function public.threeb_credit_reward_server(uuid,text,text)
from public,anon,authenticated;
grant execute on function public.threeb_credit_reward_server(uuid,text,text)
to service_role;

-- Snapshot exposes only the next Prestige eligibility boolean, not antifraud internals.
create or replace function public.threeb_progress_snapshot_server(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_wallet jsonb;
  v_flags public.threeb_economy_flags%rowtype;
  v_prestige integer:=0;
  v_level integer:=1;
  v_title text;
  v_season jsonb:=null;
  v_eligibility jsonb;
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  v_wallet:=public.threeb_wallet_apply_server(p_user,0,0);
  v_level:=coalesce((v_wallet->>'global_level')::integer,1);

  select * into v_flags
  from public.threeb_economy_flags
  where singleton=true;

  select coalesce(prestige_level,0) into v_prestige
  from public.threeb_prestige_profiles
  where user_id=p_user;

  v_prestige:=coalesce(v_prestige,0);
  v_title:=public.threeb_progress_title(v_level,v_prestige);
  v_eligibility:=public.threeb_prestige_eligibility_server(p_user);

  if coalesce(v_flags.season_enabled,false) then
    select jsonb_build_object(
      'code',code,
      'label',label,
      'starts_at',starts_at,
      'ends_at',ends_at,
      'xp_multiplier',xp_multiplier,
      'coins_multiplier',coins_multiplier
    )
    into v_season
    from public.threeb_seasons
    where status='active'
      and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>now())
    order by starts_at nulls first,code
    limit 1;
  end if;

  return v_wallet||jsonb_build_object(
    'prestige_level',v_prestige,
    'prestige_eligible',coalesce((v_eligibility->>'eligible')::boolean,false),
    'next_prestige_level',coalesce((v_eligibility->>'next_prestige')::integer,least(3,v_prestige+1)),
    'title',v_title,
    'season',v_season,
    'token_enabled',coalesce(v_flags.token_enabled,false),
    'token_blockchain_enabled',coalesce(v_flags.token_blockchain_enabled,false),
    'token_trading_enabled',coalesce(v_flags.token_trading_enabled,false),
    'unreal_world_enabled',coalesce(v_flags.unreal_world_enabled,false),
    'marketplace_enabled',coalesce(v_flags.marketplace_enabled,false),
    'season_enabled',coalesce(v_flags.season_enabled,false),
    'new_economy_enabled',coalesce(v_flags.new_economy_enabled,true)
  );
end
$$;

revoke all on function public.threeb_progress_snapshot_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_progress_snapshot_server(uuid)
to service_role;
