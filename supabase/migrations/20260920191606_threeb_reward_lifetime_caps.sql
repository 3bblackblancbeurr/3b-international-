alter table public.threeb_reward_policy
  add column if not exists max_events_lifetime integer
  check (max_events_lifetime is null or max_events_lifetime >= 0);

update public.threeb_reward_policy
set max_events_lifetime = case reward_code
  when 'country_entry' then 8
  when 'guardian' then 8
  when 'mission_main' then 6
  when 'mission_side' then 14
  when 'city_event' then 10
  when 'world_secret' then 16
  when 'origin_relay' then 8
  else max_events_lifetime
end,
updated_at=now()
where reward_code in (
  'country_entry','guardian','mission_main','mission_side',
  'city_event','world_secret','origin_relay'
);

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
$$;

revoke all on function public.threeb_credit_reward_server(uuid,text,text)
from public,anon,authenticated;
grant execute on function public.threeb_credit_reward_server(uuid,text,text)
to service_role;

create or replace function public.threeb_process_reward_outbox_server(
  p_user uuid,
  p_limit integer default 32
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  row public.threeb_reward_outbox%rowtype;
  result jsonb;
  err text;
  credited_count integer:=0;
  rejected_count integer:=0;
  pending_count integer:=0;
  limit_value integer:=least(50,greatest(1,coalesce(p_limit,32)));
begin
  if p_user is null then raise exception 'invalid_user'; end if;

  for row in
    select *
    from public.threeb_reward_outbox
    where user_id=p_user and status='pending'
    order by id
    for update skip locked
    limit limit_value
  loop
    begin
      update public.threeb_reward_outbox
      set attempts=least(100,attempts+1),last_error=null
      where id=row.id;

      result:=public.threeb_credit_reward_server(row.user_id,row.reward_code,row.event_id);

      update public.threeb_reward_outbox
      set status='credited',processed_at=now(),last_error=null
      where id=row.id;

      credited_count:=credited_count+1;
    exception when others then
      err:=sqlerrm;

      if err in (
        'reward_daily_event_cap',
        'reward_daily_value_cap',
        'reward_lifetime_event_cap',
        'reward_already_claimed',
        'reward_level_required',
        'unknown_reward',
        'reward_policy_missing'
      ) then
        update public.threeb_reward_outbox
        set status='rejected',processed_at=now(),last_error=err
        where id=row.id;
        rejected_count:=rejected_count+1;
      elsif err in ('reward_cooldown','sensitive_reward_review_required') then
        update public.threeb_reward_outbox
        set status='pending',
            attempts=greatest(0,attempts-1),
            last_error=err
        where id=row.id;
        pending_count:=pending_count+1;
      else
        update public.threeb_reward_outbox
        set status=case when attempts>=5 then 'rejected' else 'pending' end,
            processed_at=case when attempts>=5 then now() else null end,
            last_error=left(err,240)
        where id=row.id;

        if row.attempts+1>=5 then rejected_count:=rejected_count+1;
        else pending_count:=pending_count+1;
        end if;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'credited',credited_count,
    'rejected',rejected_count,
    'pending',pending_count
  );
end
$$;

revoke all on function public.threeb_process_reward_outbox_server(uuid,integer)
from public,anon,authenticated;
grant execute on function public.threeb_process_reward_outbox_server(uuid,integer)
to service_role;
