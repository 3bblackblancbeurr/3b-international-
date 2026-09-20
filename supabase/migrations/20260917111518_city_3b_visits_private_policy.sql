begin;
drop policy if exists nexus_city_visits_read_own on public.nexus_city_visits;create policy nexus_city_visits_read_own on public.nexus_city_visits for select to authenticated using(visitor_id=(select auth.uid()) or exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_visits.city_id and c.user_id=(select auth.uid())));grant select on public.nexus_city_visits to authenticated;
commit;
