-- Anonymous public aggregates only; session IDs and account details remain private.
create or replace function public.app_traffic_summary()
returns table(site_online bigint, app_online bigint, site_visits bigint, app_visits bigint, active_15m bigint)
language sql security definer set search_path = '' stable
as $$
  select
    count(*) filter (where platform = 'site' and last_seen > now() - interval '90 seconds'),
    count(*) filter (where platform = 'app' and last_seen > now() - interval '90 seconds'),
    count(*) filter (where platform = 'site'),
    count(*) filter (where platform = 'app'),
    count(*) filter (where last_seen > now() - interval '15 minutes')
  from public.app_presence;
$$;
revoke all on function public.app_traffic_summary() from public;
grant execute on function public.app_traffic_summary() to anon, authenticated;
