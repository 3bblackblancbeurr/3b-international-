begin;
-- Network editing is compare-and-swap under the city lock. No client can overwrite another session silently.
create function public.nexus_city_plan_networks(p_user uuid,p_features jsonb,p_expected jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;f jsonb;b record;t jsonb;x numeric;z numeric;w numeric;k text;minimum integer;
begin
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 if jsonb_typeof(p_features) is distinct from 'array' or jsonb_typeof(p_expected) is distinct from 'array' or jsonb_array_length(p_features)>128 or jsonb_array_length(p_expected)>128 then raise exception 'Réseau invalide';end if;
 if p_features=coalesce(c.city->'networks','[]'::jsonb) then return;end if;
 if p_expected is distinct from coalesce(c.city->'networks','[]'::jsonb) then raise exception 'La ville a changé. Recharge-la avant de tracer.';end if;
 for f in select value from jsonb_array_elements(p_features) loop
  k:=f->>'kind';minimum:=case k when 'bridge' then 4 when 'tunnel' then 5 when 'rail' then 5 when 'power' then 2 when 'water' then 2 when 'internet' then 4 else null end;
  if minimum is null then raise exception 'Type de réseau invalide';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(c.city->'networks','[]'::jsonb)) old where old.value=f) then continue;end if;
  if c.city_level<minimum then raise exception 'Disponible au niveau %',minimum;end if;
  if jsonb_typeof(f->'width') is distinct from 'number' or jsonb_typeof(f->'x1') is distinct from 'number' or jsonb_typeof(f->'z1') is distinct from 'number' or jsonb_typeof(f->'x2') is distinct from 'number' or jsonb_typeof(f->'z2') is distinct from 'number' then raise exception 'Coordonnées invalides';end if;
  w:=(f->>'width')::numeric;
  if w<2 or w>8 then raise exception 'Largeur invalide';end if;
  foreach x in array array[(f->>'x1')::numeric,(f->>'x2')::numeric,(f->>'z1')::numeric,(f->>'z2')::numeric] loop if abs(x)+w/2>500 then raise exception 'Hors du terrain';end if;end loop;
  if sqrt(power((f->>'x1')::numeric-(f->>'x2')::numeric,2)+power((f->>'z1')::numeric-(f->>'z2')::numeric,2))<(case when k='bridge' then 12 else 6 end) then raise exception 'Tracé trop court';end if;
  if k in ('rail','bridge') then
   for b in select * from public.nexus_city_placements where city_id=c.city_id and placement_state='placed' loop
    if public.city3b_point_distance(b.x+b.footprint_w/2.0,b.z+b.footprint_h/2.0,f)<w/2+greatest(1.2,least(8,sqrt(b.footprint_w^2+b.footprint_h^2)*.26)) then raise exception 'Ce tracé traverse un bâtiment';end if;
   end loop;
  end if;
  if k='rail' then for t in select value from jsonb_array_elements(coalesce(c.city->'terrain','[]'::jsonb)) where value->>'kind' in ('lake','river','hill','basin') loop
   if public.city3b_segment_distance(f,t)<w/2+(t->>'width')::numeric/2 then raise exception 'Les rails nécessitent un terrain libre';end if;
  end loop;end if;
 end loop;
 update public.nexus_cities set city=jsonb_set(city,'{networks}',p_features),revision=revision+1,updated_at=now() where city_id=c.city_id;
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(c.city_id,p_user,'plan_networks',0,jsonb_build_object('count',jsonb_array_length(p_features)));
end $$;
revoke all on function public.nexus_city_plan_networks(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_networks(uuid,jsonb,jsonb) to service_role;

-- Utilities remain automatic until the player chooses to lay that kind of network.
-- Once enabled, coverage requires a continuous path from a finished source to the home.
create function public.city3b_network_served(p_city uuid,p_kind text,px numeric,pz numeric) returns boolean language sql stable security invoker set search_path='' as $$
 with recursive lines as (
  select r.ordinality id,r.value line from public.nexus_cities c,jsonb_array_elements(coalesce(c.city->'networks','[]'::jsonb)) with ordinality r where c.city_id=p_city and r.value->>'kind'=p_kind
 ),connected(id) as (
  select distinct l.id from lines l join public.nexus_city_placements p on p.city_id=p_city join public.nexus_city_buildings b on b.code=p.building_code
  where p.placement_state='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now()) and b.metadata->>'service'=case p_kind when 'power' then 'energy' when 'water' then 'water' when 'internet' then 'internet' end and public.city3b_point_distance(p.x+p.footprint_w/2.0,p.z+p.footprint_h/2.0,l.line)<=12
  union
  select b.id from connected c join lines a on a.id=c.id join lines b on public.city3b_segment_distance(a.line,b.line)<=2
 ) select not exists(select 1 from lines) or exists(select 1 from connected c join lines l on l.id=c.id where public.city3b_point_distance(px,pz,l.line)<=12);
$$;
revoke all on function public.city3b_network_served(uuid,text,numeric,numeric) from public,anon,authenticated;
grant execute on function public.city3b_network_served(uuid,text,numeric,numeric) to service_role;

-- Keep the one-hall limit and all server progression; scale coverage only by truly connected homes.
do $utilities$
declare original text;
begin
 original:=pg_get_functiondef('public.nexus_city_life_metrics(uuid,integer,text)'::regprocedure);
 original:=replace(original,'sport integer:=0;','sport integer:=0; homes integer:=0; water_homes integer:=0; power_homes integer:=0; internet_homes integer:=0;');
 original:=replace(original,'capacity:=capacity+case role', $new$if role='housing' then
   homes:=homes+1;
   if public.city3b_network_served(c.city_id,'water',px,pz) then water_homes:=water_homes+1;end if;
   if public.city3b_network_served(c.city_id,'power',px,pz) then power_homes:=power_homes+1;end if;
   if public.city3b_network_served(c.city_id,'internet',px,pz) then internet_homes:=internet_homes+1;end if;
  end if;
  capacity:=capacity+case role$new$);
 original:=replace(original,' working:=ceil(', $new$ if homes>0 then water:=floor(water::numeric*water_homes/homes);energy:=floor(energy::numeric*power_homes/homes);internet:=floor(internet::numeric*internet_homes/homes);end if;
 working:=ceil($new$);
 original:=replace(original,$roadold$else '[]'::jsonb end) r where$roadold$,$roadnew$else '[]'::jsonb end || coalesce((select jsonb_agg(n.value) from jsonb_array_elements(coalesce(c.city->'networks','[]'::jsonb)) n where n.value->>'kind' in ('bridge','tunnel')),'[]'::jsonb)) r where$roadnew$);
 execute original;
end $utilities$;
do $corridors$
declare original text;
begin
 original:=pg_get_functiondef('public.city3b_validate_parcel()'::regprocedure);
 original:=replace(original,' return new;', $new$ for r in select value from jsonb_array_elements(coalesce(c.city->'networks','[]'::jsonb)) where value->>'kind' in ('rail','bridge') loop
  if public.city3b_point_distance(px,pz,r)<(r->>'width')::numeric/2+fr then raise exception 'Un réseau de transport occupe cette parcelle';end if;
 end loop;
 return new;$new$);
 execute original;
end $corridors$;
-- Keep visible transport corridors coherent when new terrain is added.
create function public.city3b_network_terrain_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare f jsonb;r jsonb;
begin
 if coalesce(new.city->'terrain','[]'::jsonb) is not distinct from coalesce(old.city->'terrain','[]'::jsonb) then return new;end if;
 for f in select value from jsonb_array_elements(coalesce(new.city->'terrain','[]'::jsonb)) loop
  if exists(select 1 from jsonb_array_elements(coalesce(old.city->'terrain','[]'::jsonb)) a where a.value=f) then continue;end if;
  for r in select value from jsonb_array_elements(coalesce(new.city->'networks','[]'::jsonb)) where value->>'kind'='rail' or value->>'kind'='bridge' and f->>'kind' in ('hill','basin') loop
   if public.city3b_segment_distance(f,r)<(f->>'width')::numeric/2+(r->>'width')::numeric/2 then raise exception 'Un réseau de transport passe ici';end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function public.city3b_network_terrain_guard() from public,anon,authenticated;
grant execute on function public.city3b_network_terrain_guard() to service_role;
create trigger city3b_network_terrain before update of city on public.nexus_cities for each row execute function public.city3b_network_terrain_guard();
commit;
