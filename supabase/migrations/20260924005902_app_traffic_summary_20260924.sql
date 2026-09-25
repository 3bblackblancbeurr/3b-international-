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
create or replace function public.app_director_traffic()
returns table(platform text, page text, visits bigint, active_now bigint, active_15m bigint)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if auth.uid() is distinct from '864dc1e7-292a-4165-aec6-4420eae64ce7'::uuid then
    raise exception 'Accès réservé au directeur' using errcode = '42501';
  end if;
  return query select p.platform, p.page, count(*),
    count(*) filter (where p.last_seen > now() - interval '90 seconds'),
    count(*) filter (where p.last_seen > now() - interval '15 minutes')
  from public.app_presence p group by p.platform, p.page order by count(*) desc;
end;
$$;
revoke all on function public.app_director_traffic() from public;
grant execute on function public.app_director_traffic() to authenticated;