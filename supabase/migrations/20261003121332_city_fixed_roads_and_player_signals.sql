begin;
-- Typed roads keep their exact carriageway dimensions. Legacy plans retain their saved width.
create or replace function public.nexus_city_plan_roads(p_user uuid,p_roads jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;r jsonb;clean jsonb:='[]';k text;w numeric;lev integer;rid text;ids text[]:=array[]::text[];
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 if p_roads is null or jsonb_typeof(p_roads)<>'array' or jsonb_array_length(p_roads)>256 then raise exception 'Plan routier invalide';end if;
 for r in select * from jsonb_array_elements(p_roads) loop
  if jsonb_typeof(r->'x1') is distinct from 'number' or jsonb_typeof(r->'z1') is distinct from 'number' or jsonb_typeof(r->'x2') is distinct from 'number' or jsonb_typeof(r->'z2') is distinct from 'number' then raise exception 'Coordonnées de route invalides';end if;
  if greatest(abs((r->>'x1')::numeric),abs((r->>'x2')::numeric),abs((r->>'z1')::numeric),abs((r->>'z2')::numeric))+coalesce((r->>'width')::numeric,4)/2>500 then raise exception 'Route hors du terrain';end if;
  if power((r->>'x2')::numeric-(r->>'x1')::numeric,2)+power((r->>'z2')::numeric-(r->>'z1')::numeric,2)<36 then raise exception 'Route trop courte';end if;
  rid:=r->>'id';if rid is null or rid!~'^[a-zA-Z0-9:_-]{1,80}$' or rid=any(ids) then raise exception 'Identifiant de route invalide';end if;
  k:=r->>'roadType';w:=coalesce((r->>'width')::numeric,4);
  if k is not null then
   if k not in ('pedestrian','dirt','simple','oneway','double','motorway') then raise exception 'Modèle de route invalide';end if;
   if w<>(case k when 'pedestrian' then 2 when 'dirt' then 3 when 'simple' then 4 when 'oneway' then 4 when 'double' then 8 else 10 end) then raise exception 'Ce modèle utilise une largeur fixe';end if;
   lev:=case k when 'oneway' then 2 when 'double' then 3 when 'motorway' then 5 else 1 end;
   if c.city_level<lev then raise exception 'Route disponible au niveau %',lev;end if;
  elsif w not in (2,4,8) and not exists(select 1 from jsonb_array_elements(coalesce(c.city->'roads','[]')) old where old=r) then raise exception 'Choisis un modèle de route à largeur fixe';end if;
  clean:=clean||jsonb_build_array(jsonb_build_object('id',rid,'x1',round((r->>'x1')::numeric),'z1',round((r->>'z1')::numeric),'x2',round((r->>'x2')::numeric),'z2',round((r->>'z2')::numeric),'width',w)||case when k is null then '{}'::jsonb else jsonb_build_object('roadType',k) end);
  ids:=array_append(ids,rid);
 end loop;
 update public.nexus_cities set city=jsonb_set(coalesce(city,'{}'),'{roads}',clean,true),updated_at=now(),revision=revision+1 where city_id=c.city_id;
 insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(c.city_id,p_user,'road_plan',0,jsonb_build_object('roads',jsonb_array_length(clean)));
 perform public.nexus_city_recalculate(p_user);
end $$;
revoke all on function public.nexus_city_plan_roads(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_roads(uuid,jsonb) to service_role;

-- Find true crossings, including T junctions; bridges, tunnels, footpaths and motorways are excluded.
create function public.city3b_road_junctions(p_roads jsonb) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare a jsonb;b jsonb;i integer;j integer;ax numeric;az numeric;bx numeric;bz numeric;det numeric;t numeric;u numeric;x numeric;z numeric;nodes jsonb:='[]';
begin
 for i in 0..jsonb_array_length(p_roads)-1 loop
  a:=p_roads->i;if coalesce(a->>'roadType','simple') in ('pedestrian','motorway') then continue;end if;
  for j in i+1..jsonb_array_length(p_roads)-1 loop
   b:=p_roads->j;if coalesce(b->>'roadType','simple') in ('pedestrian','motorway') then continue;end if;
   ax:=(a->>'x2')::numeric-(a->>'x1')::numeric;az:=(a->>'z2')::numeric-(a->>'z1')::numeric;bx:=(b->>'x2')::numeric-(b->>'x1')::numeric;bz:=(b->>'z2')::numeric-(b->>'z1')::numeric;det:=ax*bz-az*bx;
   if abs(det)<.01 then continue;end if;
   t:=(((b->>'x1')::numeric-(a->>'x1')::numeric)*bz-((b->>'z1')::numeric-(a->>'z1')::numeric)*bx)/det;
   u:=(((b->>'x1')::numeric-(a->>'x1')::numeric)*az-((b->>'z1')::numeric-(a->>'z1')::numeric)*ax)/det;
   if t<0 or t>1 or u<0 or u>1 then continue;end if;
   x:=(a->>'x1')::numeric+t*ax;z:=(a->>'z1')::numeric+t*az;
   if not exists(select 1 from jsonb_array_elements(nodes) n where power((n->>'x')::numeric-x,2)+power((n->>'z')::numeric-z,2)<1) then nodes:=nodes||jsonb_build_array(jsonb_build_object('x',x,'z',z));end if;
  end loop;
 end loop;
 return nodes;
end $$;
revoke all on function public.city3b_road_junctions(jsonb) from public,anon,authenticated;
grant execute on function public.city3b_road_junctions(jsonb) to service_role;

create function public.nexus_city_plan_signals(p_user uuid,p_features jsonb,p_expected jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;f jsonb;nodes jsonb;clean jsonb:='[]';ids text[]:=array[]::text[];rid text;x numeric;z numeric;mode text;green integer;
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable';end if;
 if p_features is null or jsonb_typeof(p_features)<>'array' or jsonb_array_length(p_features)>64 then raise exception 'Maximum 64 carrefours équipés';end if;
 if coalesce(c.city->'signals','[]') is distinct from p_expected then raise exception 'Les feux ont changé. Recharge ta ville.';end if;
 if c.city_level<3 then raise exception 'Feux disponibles au niveau 3';end if;
 nodes:=public.city3b_road_junctions(coalesce(c.city->'roads','[]'));
 for f in select * from jsonb_array_elements(p_features) loop
  rid:=f->>'id';mode:=f->>'mode';
  if rid is null or rid!~'^[a-zA-Z0-9:_-]{1,80}$' or rid=any(ids) or mode is null or mode not in ('balanced','x','z') then raise exception 'Réglage du feu invalide';end if;
  if jsonb_typeof(f->'x') is distinct from 'number' or jsonb_typeof(f->'z') is distinct from 'number' or jsonb_typeof(f->'green') is distinct from 'number' then raise exception 'Coordonnées du feu invalides';end if;
  x:=(f->>'x')::numeric;z:=(f->>'z')::numeric;
  if abs(x)>500 or abs(z)>500 or (f->>'green')::numeric not in (8,12,20) then raise exception 'Réglage du feu invalide';end if;green:=(f->>'green')::integer;
  if not exists(select 1 from jsonb_array_elements(nodes) n where power((n->>'x')::numeric-x,2)+power((n->>'z')::numeric-z,2)<.01) and not exists(select 1 from jsonb_array_elements(coalesce(c.city->'signals','[]')) old where old=f) then raise exception 'Installe le feu sur un carrefour de routes';end if;
  if exists(select 1 from jsonb_array_elements(clean) other where power((other->>'x')::numeric-x,2)+power((other->>'z')::numeric-z,2)<1) then raise exception 'Ce carrefour possède déjà des feux';end if;
  clean:=clean||jsonb_build_array(jsonb_build_object('id',rid,'x',x,'z',z,'mode',mode,'green',green));ids:=array_append(ids,rid);
 end loop;
 update public.nexus_cities set city=jsonb_set(coalesce(city,'{}'),'{signals}',clean,true),updated_at=now(),revision=revision+1 where city_id=c.city_id;
end $$;
revoke all on function public.nexus_city_plan_signals(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_signals(uuid,jsonb,jsonb) to service_role;
commit;
