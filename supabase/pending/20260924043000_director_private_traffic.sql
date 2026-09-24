-- Traffic is collected anonymously for service measurement. Only the verified
-- Director account can read aggregate totals, live pages and timelines.
drop function if exists public.app_director_traffic();
drop function if exists public.app_director_traffic_summary();
drop function if exists public.app_director_traffic_timeline(text);
create table if not exists public.app_traffic_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  platform text not null check (char_length(platform) between 1 and 32),
  page text not null check (char_length(page) between 1 and 64),
  observed_at timestamptz not null default now()
);

create index if not exists app_traffic_events_observed_at_idx on public.app_traffic_events(observed_at desc);
create index if not exists app_traffic_events_session_page_idx on public.app_traffic_events(session_id, page, observed_at desc);
alter table public.app_traffic_events enable row level security;
revoke all on public.app_traffic_events from anon, authenticated;

-- Keep the public ping endpoint, but store at most one anonymous page event
-- per session/page every 15 minutes. No IP address, name or account is stored.
create or replace function public.app_presence_ping(
  p_session_id uuid,
  p_platform text default 'web'::text,
  p_page text default 'unknown'::text
)
returns void
language plpgsql security definer set search_path to ''
as $function$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  v_ip text := split_part(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-real-ip', v_headers->>'x-forwarded-for', 'unknown'), ',', 1);
  v_rate_key text := pg_catalog.encode(extensions.digest('3b-telemetry-presence:' || v_ip, 'sha256'), 'hex');
  v_platform text := left(coalesce(nullif(trim(p_platform),''),'web'),32);
  v_page text := left(coalesce(nullif(trim(p_page),''),'unknown'),64);
begin
  if p_session_id is null or not public.loyalty_rate(v_rate_key, 120, 60) then return; end if;
  insert into public.app_presence(session_id,user_id,platform,page,first_seen,last_seen)
  values (p_session_id,auth.uid(),v_platform,v_page,now(),now())
  on conflict (session_id) do update set user_id=coalesce(auth.uid(),public.app_presence.user_id),platform=excluded.platform,page=excluded.page,last_seen=now();

  if not exists (
    select 1 from public.app_traffic_events
    where session_id=p_session_id and page=v_page and observed_at > now() - interval '15 minutes'
  ) then
    insert into public.app_traffic_events(session_id,platform,page) values (p_session_id,v_platform,v_page);
  end if;
end;
$function$;
create function public.app_director_traffic_summary()
returns table(site_online bigint, app_online bigint, unique_installs bigint, visits bigint, active_15m bigint)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if not exists (
    select 1 from public.member_profiles
    where user_id = auth.uid()
      and public_verified = true
      and public_badge_key = 'director_founder'
  ) then
    raise exception 'Director access required' using errcode = '42501';
  end if;

  return query select
    count(*) filter (where platform = 'site' and last_seen > now() - interval '90 seconds'),
    count(*) filter (where platform = 'app' and last_seen > now() - interval '90 seconds'),
    (select count(*) from public.app_installs),
    (select count(*) from public.app_presence),
    count(*) filter (where last_seen > now() - interval '15 minutes')
  from public.app_presence;
end;
$$;

create function public.app_director_traffic()
returns table(platform text, page text, visits bigint, active_now bigint)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if not exists (
    select 1 from public.member_profiles
    where user_id = auth.uid()
      and public_verified = true
      and public_badge_key = 'director_founder'
  ) then
    raise exception 'Director access required' using errcode = '42501';
  end if;

  return query select
    p.platform,
    p.page,
    count(*)::bigint,
    count(*) filter (where p.last_seen > now() - interval '90 seconds')::bigint
  from public.app_presence p
  group by p.platform, p.page
  order by count(*) desc, p.platform, p.page;
end;
$$;

create function public.app_director_traffic_timeline(p_period text default 'day')
returns table(bucket text, sessions bigint)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if not exists (
    select 1 from public.member_profiles
    where user_id = auth.uid()
      and public_verified = true
      and public_badge_key = 'director_founder'
  ) then
    raise exception 'Director access required' using errcode = '42501';
  end if;

  if p_period = 'month' then
    return query select
      to_char(date_trunc('month', observed_at), 'YYYY-MM'),
      count(distinct session_id)::bigint
    from public.app_traffic_events
    where observed_at >= date_trunc('month', now()) - interval '11 months'
    group by date_trunc('month', observed_at)
    order by date_trunc('month', observed_at);
  elsif p_period = 'day' then
    return query select
      to_char(date_trunc('day', observed_at), 'DD/MM'),
      count(distinct session_id)::bigint
    from public.app_traffic_events
    where observed_at >= date_trunc('day', now()) - interval '13 days'
    group by date_trunc('day', observed_at)
    order by date_trunc('day', observed_at);
  else
    raise exception 'Unsupported period' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.app_traffic_summary() from anon, authenticated;
revoke all on function public.app_director_traffic_summary() from public;
revoke all on function public.app_director_traffic() from public;
revoke all on function public.app_director_traffic_timeline(text) from public;
grant execute on function public.app_director_traffic_summary() to authenticated;
grant execute on function public.app_director_traffic() to authenticated;
grant execute on function public.app_director_traffic_timeline(text) to authenticated;
