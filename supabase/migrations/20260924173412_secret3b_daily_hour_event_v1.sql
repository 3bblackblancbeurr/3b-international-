create table if not exists public.secret3b_daily_config (
  singleton boolean primary key default true check (singleton),
  schedule_salt uuid not null default extensions.gen_random_uuid(),
  open_minutes integer not null default 30 check (open_minutes between 5 and 180),
  attempt_minutes integer not null default 15 check (attempt_minutes between 3 and 60),
  earliest_minute integer not null default 480 check (earliest_minute between 0 and 1439),
  latest_minute integer not null default 1410 check (latest_minute between 0 and 1439),
  updated_at timestamptz not null default now(),
  check (latest_minute > earliest_minute)
);

insert into public.secret3b_daily_config(singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.secret3b_daily_events (
  event_date date primary key,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  attempt_seconds integer not null check (attempt_seconds between 180 and 3600),
  enabled boolean not null default true,
  source text not null default 'automatic' check (source in ('automatic','director')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.secret3b_daily_attempts (
  event_date date not null references public.secret3b_daily_events(event_date) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  completed_at timestamptz,
  state text not null default 'active' check (state in ('active','expired','completed')),
  updated_at timestamptz not null default now(),
  primary key (event_date,user_id),
  check (deadline_at >= started_at)
);

create index if not exists secret3b_daily_attempts_user_idx
on public.secret3b_daily_attempts(user_id,event_date desc);

alter table public.secret3b_daily_config enable row level security;
alter table public.secret3b_daily_events enable row level security;
alter table public.secret3b_daily_attempts enable row level security;

revoke all on public.secret3b_daily_config from anon, authenticated;
revoke all on public.secret3b_daily_events from anon, authenticated;
revoke all on public.secret3b_daily_attempts from anon, authenticated;

create or replace function public.secret3b_materialize_daily_event(p_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.secret3b_daily_config%rowtype;
  v_previous_minute integer;
  v_range integer;
  v_minute integer;
  v_open timestamptz;
begin
  if p_date is null then return; end if;
  if exists (select 1 from public.secret3b_daily_events where event_date = p_date) then return; end if;

  select * into v_config from public.secret3b_daily_config where singleton = true;
  if not found then raise exception 'Secret 3B daily config missing'; end if;

  v_range := v_config.latest_minute - v_config.earliest_minute + 1;
  v_minute := v_config.earliest_minute
    + abs(pg_catalog.hashtextextended(p_date::text || ':' || v_config.schedule_salt::text, 0) % v_range)::integer;

  select extract(hour from (opens_at at time zone 'Europe/Paris'))::integer * 60
       + extract(minute from (opens_at at time zone 'Europe/Paris'))::integer
    into v_previous_minute
  from public.secret3b_daily_events where event_date = p_date - 1;

  if v_previous_minute is not null and v_previous_minute = v_minute then
    v_minute := v_config.earliest_minute + ((v_minute - v_config.earliest_minute + 37) % v_range);
  end if;

  v_open := ((p_date::timestamp + pg_catalog.make_interval(mins => v_minute)) at time zone 'Europe/Paris');

  insert into public.secret3b_daily_events(event_date,opens_at,closes_at,attempt_seconds,enabled,source)
  values (p_date,v_open,v_open + pg_catalog.make_interval(mins => v_config.open_minutes),
          v_config.attempt_minutes * 60,true,'automatic')
  on conflict (event_date) do nothing;
end;
$$;

revoke all on function public.secret3b_materialize_daily_event(date) from public;

do $$
declare
  d date;
  start_date date := (pg_catalog.now() at time zone 'Europe/Paris')::date;
begin
  for d in select start_date + g from pg_catalog.generate_series(0,730) as g
  loop perform public.secret3b_materialize_daily_event(d); end loop;
end;
$$;

create or replace function public.secret3b_daily_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_date date := (v_now at time zone 'Europe/Paris')::date;
  v_uid uuid := auth.uid();
  v_event public.secret3b_daily_events%rowtype;
  v_attempt public.secret3b_daily_attempts%rowtype;
  v_phase text;
  v_can_start boolean := false;
  v_remaining integer := 0;
begin
  perform public.secret3b_materialize_daily_event(v_date);
  select * into v_event from public.secret3b_daily_events where event_date = v_date;

  if v_uid is not null then
    select * into v_attempt from public.secret3b_daily_attempts where event_date = v_date and user_id = v_uid;
    if found and v_attempt.state = 'active' and v_attempt.deadline_at <= v_now then
      update public.secret3b_daily_attempts set state='expired',updated_at=v_now
      where event_date=v_date and user_id=v_uid;
      v_attempt.state := 'expired';
    end if;
  end if;

  if not v_event.enabled then v_phase := 'disabled';
  elsif v_attempt.state = 'completed' then v_phase := 'completed';
  elsif v_attempt.state = 'expired' then v_phase := 'expired';
  elsif v_now < v_event.opens_at then v_phase := 'waiting';
  elsif v_now >= v_event.closes_at then v_phase := case when v_attempt.user_id is null then 'missed' else 'expired' end;
  elsif v_attempt.state = 'active' then v_phase := 'attempt';
  else v_phase := 'open'; v_can_start := v_uid is not null;
  end if;

  if v_phase='attempt' then
    v_remaining := greatest(0,extract(epoch from (least(v_attempt.deadline_at,v_event.closes_at)-v_now))::integer);
  elsif v_phase='open' then
    v_remaining := greatest(0,extract(epoch from (v_event.closes_at-v_now))::integer);
  end if;

  return pg_catalog.jsonb_build_object(
    'server_now',v_now,'paris_date',v_date,
    'paris_clock',pg_catalog.to_char(v_now at time zone 'Europe/Paris','HH24:MI:SS'),
    'phase',v_phase,'can_start',v_can_start,'window_remaining_seconds',v_remaining,
    'opens_at',case when v_phase in ('open','attempt','completed','expired','missed') then v_event.opens_at else null end,
    'closes_at',case when v_phase in ('open','attempt','completed','expired','missed') then v_event.closes_at else null end,
    'attempt_started_at',v_attempt.started_at,'attempt_deadline_at',v_attempt.deadline_at,'completed_at',v_attempt.completed_at,
    'message',case v_phase
      when 'waiting' then 'Reste attentif. L’Heure changera aujourd’hui.'
      when 'open' then 'Le signal est actif. Entre maintenant dans le Secret.'
      when 'attempt' then 'Ta tentative est en cours. Le Veilleur n’attendra pas.'
      when 'completed' then 'Secret accompli pour aujourd’hui.'
      when 'missed' then 'Le signal est passé. Le Nexus se rouvrira demain à une autre heure.'
      when 'expired' then 'Le temps est écoulé. Une nouvelle chance arrivera demain à une autre heure.'
      else 'Le Secret est momentanément désactivé.' end
  );
end;
$$;

revoke all on function public.secret3b_daily_status() from public;
grant execute on function public.secret3b_daily_status() to anon, authenticated;

create or replace function public.secret3b_start_daily_attempt()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_date date := (v_now at time zone 'Europe/Paris')::date;
  v_uid uuid := auth.uid();
  v_event public.secret3b_daily_events%rowtype;
  v_attempt public.secret3b_daily_attempts%rowtype;
  v_deadline timestamptz;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform public.secret3b_materialize_daily_event(v_date);
  select * into v_event from public.secret3b_daily_events where event_date=v_date;

  if not v_event.enabled or v_now < v_event.opens_at or v_now >= v_event.closes_at then
    return pg_catalog.jsonb_build_object('ok',false,'reason','closed','server_now',v_now);
  end if;

  select * into v_attempt from public.secret3b_daily_attempts where event_date=v_date and user_id=v_uid;
  if found then
    if v_attempt.state='completed' then
      return pg_catalog.jsonb_build_object('ok',false,'reason','completed','server_now',v_now,'deadline_at',v_attempt.deadline_at);
    end if;
    if v_attempt.state='expired' or v_attempt.deadline_at <= v_now then
      update public.secret3b_daily_attempts set state='expired',updated_at=v_now where event_date=v_date and user_id=v_uid;
      return pg_catalog.jsonb_build_object('ok',false,'reason','expired','server_now',v_now,'deadline_at',v_attempt.deadline_at);
    end if;
    return pg_catalog.jsonb_build_object('ok',true,'reason','resume','server_now',v_now,'deadline_at',v_attempt.deadline_at);
  end if;

  v_deadline := least(v_event.closes_at,v_now + pg_catalog.make_interval(secs=>v_event.attempt_seconds));
  insert into public.secret3b_daily_attempts(event_date,user_id,started_at,deadline_at,state)
  values(v_date,v_uid,v_now,v_deadline,'active') returning * into v_attempt;

  return pg_catalog.jsonb_build_object('ok',true,'reason','started','server_now',v_now,'deadline_at',v_attempt.deadline_at,'closes_at',v_event.closes_at);
end;
$$;

revoke all on function public.secret3b_start_daily_attempt() from public;
grant execute on function public.secret3b_start_daily_attempt() to authenticated;

create or replace function public.secret3b_complete_daily_attempt()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_date date := (v_now at time zone 'Europe/Paris')::date;
  v_uid uuid := auth.uid();
  v_attempt public.secret3b_daily_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_attempt from public.secret3b_daily_attempts where event_date=v_date and user_id=v_uid for update;
  if not found then return pg_catalog.jsonb_build_object('ok',false,'reason','not_started','server_now',v_now); end if;
  if v_attempt.state='completed' then
    return pg_catalog.jsonb_build_object('ok',true,'reason','already_completed','completed_at',v_attempt.completed_at,'server_now',v_now);
  end if;
  if v_attempt.state<>'active' or v_attempt.deadline_at<=v_now then
    update public.secret3b_daily_attempts set state='expired',updated_at=v_now where event_date=v_date and user_id=v_uid;
    return pg_catalog.jsonb_build_object('ok',false,'reason','expired','server_now',v_now);
  end if;
  update public.secret3b_daily_attempts set state='completed',completed_at=v_now,updated_at=v_now where event_date=v_date and user_id=v_uid;
  return pg_catalog.jsonb_build_object('ok',true,'reason','completed','completed_at',v_now,'server_now',v_now);
end;
$$;

revoke all on function public.secret3b_complete_daily_attempt() from public;
grant execute on function public.secret3b_complete_daily_attempt() to authenticated;

create or replace function public.secret3b_director_schedule(p_days integer default 14)
returns table(event_date date,opens_at timestamptz,closes_at timestamptz,attempt_seconds integer,enabled boolean,source text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_start date := (pg_catalog.now() at time zone 'Europe/Paris')::date;
  d date;
begin
  if v_uid is null or not exists (
    select 1 from public.member_profiles
    where user_id=v_uid and public_verified=true and public_badge_key='director_founder'
  ) then raise exception 'Director access required' using errcode='42501'; end if;
  p_days := greatest(1,least(coalesce(p_days,14),60));
  for d in select v_start + g from pg_catalog.generate_series(0,p_days-1) as g
  loop perform public.secret3b_materialize_daily_event(d); end loop;
  return query
  select e.event_date,e.opens_at,e.closes_at,e.attempt_seconds,e.enabled,e.source
  from public.secret3b_daily_events e
  where e.event_date between v_start and v_start+(p_days-1)
  order by e.event_date;
end;
$$;

revoke all on function public.secret3b_director_schedule(integer) from public;
grant execute on function public.secret3b_director_schedule(integer) to authenticated;

create or replace function public.secret3b_director_set_event(
  p_event_date date,p_local_time time,p_open_minutes integer default 30,p_attempt_minutes integer default 15,p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_open timestamptz;
begin
  if v_uid is null or not exists (
    select 1 from public.member_profiles
    where user_id=v_uid and public_verified=true and public_badge_key='director_founder'
  ) then raise exception 'Director access required' using errcode='42501'; end if;
  if p_event_date is null or p_local_time is null then raise exception 'Date and local time are required' using errcode='22023'; end if;
  if p_open_minutes not between 5 and 180 or p_attempt_minutes not between 3 and 60 then raise exception 'Invalid Secret timing' using errcode='22023'; end if;
  if exists(select 1 from public.secret3b_daily_attempts where event_date=p_event_date) then
    raise exception 'This event already has player attempts and can no longer be rescheduled' using errcode='55000';
  end if;
  v_open := ((p_event_date::timestamp+p_local_time) at time zone 'Europe/Paris');
  insert into public.secret3b_daily_events(event_date,opens_at,closes_at,attempt_seconds,enabled,source,updated_at)
  values(p_event_date,v_open,v_open+pg_catalog.make_interval(mins=>p_open_minutes),p_attempt_minutes*60,coalesce(p_enabled,true),'director',pg_catalog.now())
  on conflict(event_date) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,
    attempt_seconds=excluded.attempt_seconds,enabled=excluded.enabled,source='director',updated_at=pg_catalog.now();
  return pg_catalog.jsonb_build_object('ok',true,'event_date',p_event_date,'opens_at',v_open,
    'closes_at',v_open+pg_catalog.make_interval(mins=>p_open_minutes),'attempt_minutes',p_attempt_minutes,'enabled',coalesce(p_enabled,true));
end;
$$;

revoke all on function public.secret3b_director_set_event(date,time,integer,integer,boolean) from public;
grant execute on function public.secret3b_director_set_event(date,time,integer,integer,boolean) to authenticated;