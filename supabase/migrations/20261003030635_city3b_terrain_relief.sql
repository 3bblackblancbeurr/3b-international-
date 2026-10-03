create or replace function public.nexus_city_plan_terrain(p_user uuid,p_features jsonb,p_expected jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;f jsonb;r jsonb;b record;clean jsonb:='[]';ids text[]:=array[]::text[];k text;rid text;x1 numeric;z1 numeric;x2 numeric;z2 numeric;w numeric;
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if c.city_id is null then raise exception 'Ville introuvable';end if;
 if coalesce(c.city->'terrain','[]'::jsonb) is distinct from p_expected then raise exception 'Le paysage a changé. Recharge ta ville avant de continuer.';end if;
 if p_features is null or jsonb_typeof(p_features)<>'array' or jsonb_array_length(p_features)>128 then raise exception 'Paysage invalide';end if;
 for f in select * from jsonb_array_elements(p_features) loop
  k:=f->>'kind';rid:=f->>'id';
  if k is null or k not in ('lake','river','tree','garden','bench','light','hill','basin') or rid is null or rid!~'^[a-zA-Z0-9:_-]{1,80}$' or rid=any(ids) then raise exception 'Objet de paysage invalide';end if;
  if not (f ?& array['x1','z1','x2','z2','width']) or jsonb_typeof(f->'x1')<>'number' or jsonb_typeof(f->'z1')<>'number' or jsonb_typeof(f->'x2')<>'number' or jsonb_typeof(f->'z2')<>'number' or jsonb_typeof(f->'width')<>'number' then raise exception 'Coordonnées invalides';end if;
  x1:=(f->>'x1')::numeric;z1:=(f->>'z1')::numeric;x2:=(f->>'x2')::numeric;z2:=(f->>'z2')::numeric;w:=(f->>'width')::numeric;
  if w<2 or w>(case when k in ('hill','basin') then 120 when k='lake' then 40 when k in ('river','garden') then 12 when k='tree' then 6 else 2 end) or least(x1,x2)-w/2< -500 or greatest(x1,x2)+w/2>500 or least(z1,z2)-w/2< -500 or greatest(z1,z2)+w/2>500 or x1<>round(x1) or z1<>round(z1) or x2<>round(x2) or z2<>round(z2) then raise exception 'Hors du terrain ou dimensions invalides';end if;
  if k in ('hill','basin') and w<24 then raise exception 'Relief trop petit';end if;
  if k<>'river' and (x1<>x2 or z1<>z2) then raise exception 'Forme invalide';end if;
  if k='river' and sqrt((x2-x1)^2+(z2-z1)^2)<6 then raise exception 'Rivière trop courte';end if;
  f:=jsonb_build_object('id',rid,'kind',k,'x1',x1,'z1',z1,'x2',x2,'z2',z2,'width',w);
  if not exists(select 1 from jsonb_array_elements(coalesce(c.city->'terrain','[]'::jsonb)) o where o.value=f) then
   for b in select * from public.nexus_city_placements where city_id=c.city_id and placement_state='placed' loop
    if public.city3b_point_distance(b.x+b.footprint_w/2.0,b.z+b.footprint_h/2.0,f)<w/2+greatest(1.2,least(8,sqrt(b.footprint_w^2+b.footprint_h^2)*.26)) then raise exception 'Ce paysage traverse un bâtiment';end if;
   end loop;
   if k in ('lake','river','hill','basin') then for r in select * from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)) loop
    if public.city3b_segment_distance(f,r)<w/2+(r->>'width')::numeric/2 then raise exception 'Une route passe ici';end if;
   end loop;end if;
  end if;
  for r in select * from jsonb_array_elements(p_features) loop
   if r->>'id'<>rid and (k in ('hill','basin') or r->>'kind' in ('hill','basin')) and public.city3b_segment_distance(f,r)<w/2+(r->>'width')::numeric/2 then raise exception 'Un relief occupe cette zone';end if;
  end loop;
  ids:=array_append(ids,rid);clean:=clean||jsonb_build_array(f);
 end loop;
 update public.nexus_cities set city=jsonb_set(coalesce(city,'{}'),'{terrain}',clean,true),updated_at=now(),revision=revision+1 where city_id=c.city_id;
end $$;
revoke all on function public.nexus_city_plan_terrain(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_terrain(uuid,jsonb,jsonb) to service_role;


do $patch$
declare body text;
begin
 select pg_get_functiondef('public.city3b_validate_roads()'::regprocedure) into body;
 body:=replace(body,'''lake'',''river''','''lake'',''river'',''hill'',''basin''');
 execute body;
end $patch$;
