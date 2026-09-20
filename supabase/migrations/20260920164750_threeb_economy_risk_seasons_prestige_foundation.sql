create table if not exists public.threeb_economy_risk_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_score smallint not null default 0 check (risk_score between 0 and 100),
  review_required boolean not null default false,
  last_signal text,
  updated_at timestamptz not null default now()
);

alter table public.threeb_economy_risk_profiles enable row level security;
revoke all on public.threeb_economy_risk_profiles from anon, authenticated;
grant select,insert,update,delete on public.threeb_economy_risk_profiles to service_role;

create table if not exists public.threeb_seasons (
  code text primary key check (code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  label text not null check (length(label) between 2 and 100),
  status text not null default 'draft' check (status in ('draft','active','ended','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  xp_multiplier numeric(6,3) not null default 1 check (xp_multiplier between 0 and 5),
  coins_multiplier numeric(6,3) not null default 1 check (coins_multiplier between 0 and 5),
  token_budget numeric(38,18) not null default 0 check (token_budget >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

alter table public.threeb_seasons enable row level security;
revoke all on public.threeb_seasons from anon, authenticated;
grant select,insert,update,delete on public.threeb_seasons to service_role;

create table if not exists public.threeb_prestige_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prestige_level smallint not null default 0 check (prestige_level between 0 and 3),
  unlocked_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.threeb_prestige_profiles enable row level security;
drop policy if exists threeb_prestige_read_own on public.threeb_prestige_profiles;
create policy threeb_prestige_read_own
on public.threeb_prestige_profiles
for select
to authenticated
using ((select auth.uid())=user_id);
grant select on public.threeb_prestige_profiles to authenticated;
grant select,insert,update,delete on public.threeb_prestige_profiles to service_role;

create or replace function public.threeb_record_economy_anomaly_server(
  p_user uuid,
  p_signal text,
  p_severity integer,
  p_event_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_score integer;
  v_review boolean;
  v_increment integer;
begin
  if p_user is null
     or p_signal is null
     or length(p_signal)<3
     or length(p_signal)>80
     or p_severity<1
     or p_severity>100
     or p_metadata is null
     or jsonb_typeof(p_metadata)<>'object' then
    raise exception 'invalid_anomaly_signal';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text,17));

  insert into public.threeb_economy_anomalies
    (user_id,signal,severity,event_key,metadata)
  values
    (p_user,p_signal,p_severity,p_event_key,coalesce(p_metadata,'{}'::jsonb));

  v_increment:=greatest(1,ceil(p_severity::numeric/5)::integer);

  insert into public.threeb_economy_risk_profiles
    (user_id,risk_score,review_required,last_signal,updated_at)
  values
    (p_user,least(100,v_increment),v_increment>=16,p_signal,now())
  on conflict(user_id) do update
  set risk_score=least(100,public.threeb_economy_risk_profiles.risk_score+v_increment),
      review_required=(least(100,public.threeb_economy_risk_profiles.risk_score+v_increment)>=80),
      last_signal=p_signal,
      updated_at=now()
  returning risk_score,review_required into v_score,v_review;

  return jsonb_build_object(
    'risk_score',v_score,
    'review_required',v_review,
    'sensitive_rewards_held',v_score>=50
  );
end
$$;

revoke all on function public.threeb_record_economy_anomaly_server(uuid,text,integer,text,jsonb)
from public,anon,authenticated;
grant execute on function public.threeb_record_economy_anomaly_server(uuid,text,integer,text,jsonb)
to service_role;

create or replace function public.threeb_economy_risk_snapshot_server(p_user uuid)
returns jsonb
language sql
security definer
stable
set search_path=''
as $$
  select jsonb_build_object(
    'risk_score',coalesce(r.risk_score,0),
    'review_required',coalesce(r.review_required,false),
    'sensitive_rewards_held',coalesce(r.risk_score,0)>=50
  )
  from (select 1) x
  left join public.threeb_economy_risk_profiles r on r.user_id=p_user;
$$;

revoke all on function public.threeb_economy_risk_snapshot_server(uuid)
from public,anon,authenticated;
grant execute on function public.threeb_economy_risk_snapshot_server(uuid)
to service_role;

create or replace function public.threeb_economy_review_server(
  p_user uuid,
  p_new_score integer,
  p_resolution text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_score integer:=greatest(0,least(100,coalesce(p_new_score,0)));
begin
  if p_user is null or p_resolution is null or length(trim(p_resolution))<3 or length(p_resolution)>240 then
    raise exception 'invalid_review';
  end if;

  insert into public.threeb_economy_risk_profiles
    (user_id,risk_score,review_required,last_signal,updated_at)
  values
    (p_user,v_score,v_score>=80,'manual_review',now())
  on conflict(user_id) do update
  set risk_score=v_score,
      review_required=v_score>=80,
      last_signal='manual_review',
      updated_at=now();

  update public.threeb_economy_anomalies
  set reviewed_at=coalesce(reviewed_at,now()),
      resolution=coalesce(resolution,p_resolution)
  where user_id=p_user and reviewed_at is null;

  return jsonb_build_object(
    'risk_score',v_score,
    'review_required',v_score>=80,
    'sensitive_rewards_held',v_score>=50
  );
end
$$;

revoke all on function public.threeb_economy_review_server(uuid,integer,text)
from public,anon,authenticated;
grant execute on function public.threeb_economy_review_server(uuid,integer,text)
to service_role;

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

  v_event_key := 'reward:'||p_reward_code;
  v_idempotency := v_event_key||':'||p_event_id;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,0,0);

  if exists(
    select 1 from public.threeb_wallet_ledger
    where user_id=p_user_id
      and event_key=v_event_key
      and event_id=p_event_id
  ) then
    return v_wallet||jsonb_build_object('ok',true,'idempotent',true,'reward_code',p_reward_code);
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

  v_xp_delta := round(v_reward.xp * v_factor)::integer;
  v_coins_delta := round(v_reward.coins * v_factor)::bigint;

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
      'risk_score',v_risk
    )
  );

  if v_xp_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'xp',v_xp_delta,'earn','reward',v_idempotency,
      jsonb_build_object('reward_code',p_reward_code,'event_id',p_event_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  if v_coins_delta <> 0 then
    insert into public.economy_transactions
    (user_id,asset,amount,kind,source,idempotency_key,metadata)
    values(
      p_user_id,'coins',v_coins_delta,'earn','reward',v_idempotency,
      jsonb_build_object('reward_code',p_reward_code,'event_id',p_event_id,'economy_version',coalesce(v_flags.economy_version,'2026.1'))
    );
  end if;

  v_wallet := public.threeb_wallet_apply_server(p_user_id,v_xp_delta,v_coins_delta);

  return v_wallet||jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'reward_code',p_reward_code,
    'xp_awarded',v_xp_delta,
    'coins_awarded',v_coins_delta,
    'diminishing_factor',v_factor
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
