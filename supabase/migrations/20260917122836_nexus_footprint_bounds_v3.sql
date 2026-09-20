create or replace function public.nexus_can_place(p_city_id uuid,p_x integer,p_z integer,p_w integer,p_h integer,p_ignore uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select (abs(p_x)::numeric + greatest(1,p_w)::numeric/2 <= 500)
 and (abs(p_z)::numeric + greatest(1,p_h)::numeric/2 <= 500)
 and (select count(*) from public.nexus_city_placements where city_id=p_city_id) < 5000
 and not exists(
   select 1 from public.nexus_city_placements p
   where p.city_id=p_city_id and (p_ignore is null or p.id<>p_ignore)
   and abs(p.x-p_x) < ((greatest(1,p.footprint_w)+greatest(1,p_w))::numeric/2 + 1)
   and abs(p.z-p_z) < ((greatest(1,p.footprint_h)+greatest(1,p_h))::numeric/2 + 1)
 );
$$;
revoke all on function public.nexus_can_place(uuid,integer,integer,integer,integer,uuid) from public;
