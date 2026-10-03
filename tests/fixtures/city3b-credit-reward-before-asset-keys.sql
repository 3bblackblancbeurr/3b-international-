CREATE OR REPLACE FUNCTION public.threeb_credit_reward_server(p_user_id uuid, p_reward_code text, p_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_reward public.reward_definitions%rowtype;
  v_policy public.threeb_reward_policy%rowtype;
  v_flags public.threeb_economy_flags%rowtype;
  v_wallet jsonb;
  v_event_key text;
  v_idempotency text;
  v_today timestamptz;
  v_count integer := 0;
  v_lifetime_count integer := 0;
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

  select count(*)::integer
  into v_lifetime_count
  from public.threeb_wallet_ledger
  where user_id=p_user_id
    and event_key=v_event_key;

  if not v_reward.repeatable and v_lifetime_count>0 then
    raise exception 'reward_already_claimed';
  end if;

  if v_policy.max_events_lifetime is not null
     and v_lifetime_count>=v_policy.max_events_lifetime then
    raise exception 'reward_lifetime_event_cap';
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
      'lifetime_count_before',v_lifetime_count,
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
$function$
