begin;
-- First objective: draw the first road. Existing mission claims keep their IDs and rewards.
update public.nexus_city_mission_definitions set sort_order=case code when 'foundation_road' then 1 when 'foundation_hall' then 2 else 3 end where code in ('foundation_road','foundation_hall','foundation_homes');
do $roads$
declare original text;
begin
 original:=pg_get_functiondef('public.nexus_city_plan_roads(uuid,jsonb)'::regprocedure);
 if position('half*.91-1' in original)=0 then raise exception 'Unexpected road bounds';end if;
 execute replace(original,'half*.91-1','half');
end $roads$;
create function public.nexus_city_plan_roads_v2(p_user uuid,p_roads jsonb,p_expected jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if c.city_id is null then raise exception 'Ville introuvable';end if;
 if coalesce(c.city->'roads','[]'::jsonb) is distinct from p_expected then raise exception 'Les routes ont changé. Recharge ta ville avant de continuer.';end if;
 perform public.nexus_city_plan_roads(p_user,p_roads);
end $$;
revoke all on function public.nexus_city_plan_roads_v2(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_roads_v2(uuid,jsonb,jsonb) to service_role;
-- One player-authored landscape. Never reset saved roads, purchased buildings or balances.
create function public.city3b_point_distance(px numeric,pz numeric,r jsonb) returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare x1 numeric:=(r->>'x1')::numeric;z1 numeric:=(r->>'z1')::numeric;dx numeric:=(r->>'x2')::numeric-x1;dz numeric:=(r->>'z2')::numeric-z1;l numeric;t numeric;
begin
 l:=dx*dx+dz*dz;t:=case when l=0 then 0 else greatest(0,least(1,((px-x1)*dx+(pz-z1)*dz)/l)) end;
 return sqrt((px-x1-t*dx)^2+(pz-z1-t*dz)^2);
end $$;
revoke all on function public.city3b_point_distance(numeric,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.city3b_point_distance(numeric,numeric,jsonb) to service_role;

create function public.city3b_segment_distance(a jsonb,b jsonb) returns numeric language plpgsql immutable security invoker set search_path='' as $$
declare ax numeric:=(a->>'x1')::numeric;az numeric:=(a->>'z1')::numeric;bx numeric:=(a->>'x2')::numeric;bz numeric:=(a->>'z2')::numeric;
 cx numeric:=(b->>'x1')::numeric;cz numeric:=(b->>'z1')::numeric;dx numeric:=(b->>'x2')::numeric;dz numeric:=(b->>'z2')::numeric;
begin
 if ((bx-ax)*(cz-az)-(bz-az)*(cx-ax))*((bx-ax)*(dz-az)-(bz-az)*(dx-ax))<0 and ((dx-cx)*(az-cz)-(dz-cz)*(ax-cx))*((dx-cx)*(bz-cz)-(dz-cz)*(bx-cx))<0 then return 0;end if;
 return least(public.city3b_point_distance(ax,az,b),public.city3b_point_distance(bx,bz,b),public.city3b_point_distance(cx,cz,a),public.city3b_point_distance(dx,dz,a));
end $$;
revoke all on function public.city3b_segment_distance(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.city3b_segment_distance(jsonb,jsonb) to service_role;

create or replace function public.city3b_validate_parcel() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;half numeric;core numeric;px numeric;pz numeric;fr numeric;r jsonb;d record;
begin
 if new.placement_state='stored' then return new;end if;
 if tg_op='UPDATE' and old.placement_state='placed' and (new.x,new.z,new.rotation,new.footprint_w,new.footprint_h) is not distinct from (old.x,old.z,old.rotation,old.footprint_w,old.footprint_h) then return new;end if;
 select * into c from public.nexus_cities where city_id=new.city_id for update;
 half:=500;core:=greatest(95,least(500,coalesce((c.city->>'core_half')::numeric,95)));
 if new.x < -half or new.z < -half or new.x+new.footprint_w-1>half or new.z+new.footprint_h-1>half then raise exception 'Hors du terrain';end if;
 px:=new.x+new.footprint_w/2.0;pz:=new.z+new.footprint_h/2.0;fr:=greatest(1.2,least(8,sqrt(new.footprint_w^2+new.footprint_h^2)*.26));
 for d in select v.*,coalesce(t.unlocked,false) unlocked from (values
 ('France',0::numeric,-.66::numeric),('Algérie',.48,-.47),('Espagne',.68,0),('Maroc',.48,.47),('Italie',0,.66),('Tunisie',-.48,.47),('Turquie',-.68,0),('Estonie',-.48,-.47)) v(country,ux,uz)
 left join public.nexus_city_districts t on t.city_id=c.city_id and t.country=v.country loop
  if not d.unlocked and power((px-d.ux*core*.72)/greatest(18,core*.18),2)+power((pz-d.uz*core*.72)/greatest(15,core*.15),2)<=1 then raise exception 'Quartier % verrouillé',d.country;end if;
 end loop;
 for r in select * from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)) loop
  if public.city3b_point_distance(px,pz,r)<coalesce((r->>'width')::numeric,4)/2+fr then raise exception 'Axe routier réservé';end if;
 end loop;
 for r in select * from jsonb_array_elements(coalesce(c.city->'terrain','[]'::jsonb)) loop
  if public.city3b_point_distance(px,pz,r)<(r->>'width')::numeric/2+fr then raise exception 'Eau ou décor occupé';end if;
 end loop;
 return new;
end $$;

create function public.nexus_city_plan_terrain(p_user uuid,p_features jsonb,p_expected jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities;f jsonb;r jsonb;b record;clean jsonb:='[]';ids text[]:=array[]::text[];k text;rid text;x1 numeric;z1 numeric;x2 numeric;z2 numeric;w numeric;
begin
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if c.city_id is null then raise exception 'Ville introuvable';end if;
 if coalesce(c.city->'terrain','[]'::jsonb) is distinct from p_expected then raise exception 'Le paysage a changé. Recharge ta ville avant de continuer.';end if;
 if p_features is null or jsonb_typeof(p_features)<>'array' or jsonb_array_length(p_features)>128 then raise exception 'Paysage invalide';end if;
 for f in select * from jsonb_array_elements(p_features) loop
  k:=f->>'kind';rid:=f->>'id';
  if k is null or k not in ('lake','river','tree','garden','bench','light') or rid is null or rid!~'^[a-zA-Z0-9:_-]{1,80}$' or rid=any(ids) then raise exception 'Objet de paysage invalide';end if;
  if not (f ?& array['x1','z1','x2','z2','width']) or jsonb_typeof(f->'x1')<>'number' or jsonb_typeof(f->'z1')<>'number' or jsonb_typeof(f->'x2')<>'number' or jsonb_typeof(f->'z2')<>'number' or jsonb_typeof(f->'width')<>'number' then raise exception 'Coordonnées invalides';end if;
  x1:=(f->>'x1')::numeric;z1:=(f->>'z1')::numeric;x2:=(f->>'x2')::numeric;z2:=(f->>'z2')::numeric;w:=(f->>'width')::numeric;
  if w<2 or w>(case when k='lake' then 40 when k in ('river','garden') then 12 when k='tree' then 6 else 2 end) or least(x1,x2)-w/2< -500 or greatest(x1,x2)+w/2>500 or least(z1,z2)-w/2< -500 or greatest(z1,z2)+w/2>500 or x1<>round(x1) or z1<>round(z1) or x2<>round(x2) or z2<>round(z2) then raise exception 'Hors du terrain ou dimensions invalides';end if;
  if k<>'river' and (x1<>x2 or z1<>z2) then raise exception 'Forme invalide';end if;
  if k='river' and sqrt((x2-x1)^2+(z2-z1)^2)<6 then raise exception 'Rivière trop courte';end if;
  f:=jsonb_build_object('id',rid,'kind',k,'x1',x1,'z1',z1,'x2',x2,'z2',z2,'width',w);
  if not exists(select 1 from jsonb_array_elements(coalesce(c.city->'terrain','[]'::jsonb)) o where o.value=f) then
   for b in select * from public.nexus_city_placements where city_id=c.city_id and placement_state='placed' loop
    if public.city3b_point_distance(b.x+b.footprint_w/2.0,b.z+b.footprint_h/2.0,f)<w/2+greatest(1.2,least(8,sqrt(b.footprint_w^2+b.footprint_h^2)*.26)) then raise exception 'Ce paysage traverse un bâtiment';end if;
   end loop;
   if k in ('lake','river') then for r in select * from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)) loop
    if public.city3b_segment_distance(f,r)<w/2+(r->>'width')::numeric/2 then raise exception 'Une route passe ici';end if;
   end loop;end if;
  end if;
  ids:=array_append(ids,rid);clean:=clean||jsonb_build_array(f);
 end loop;
 update public.nexus_cities set city=jsonb_set(coalesce(city,'{}'),'{terrain}',clean,true),updated_at=now(),revision=revision+1 where city_id=c.city_id;
end $$;
revoke all on function public.nexus_city_plan_terrain(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_plan_terrain(uuid,jsonb,jsonb) to service_role;

create or replace function public.city3b_validate_roads() returns trigger language plpgsql security invoker set search_path='' as $$
declare r jsonb;f jsonb;b record;
begin
 if coalesce(new.city->'roads','[]'::jsonb) is not distinct from coalesce(old.city->'roads','[]'::jsonb) then return new;end if;
 for r in select value from jsonb_array_elements(coalesce(new.city->'roads','[]'::jsonb)) loop
  if exists(select 1 from jsonb_array_elements(coalesce(old.city->'roads','[]'::jsonb)) p where p.value=r) then continue;end if;
  for b in select * from public.nexus_city_placements where city_id=new.city_id and placement_state='placed' loop
   if public.city3b_point_distance(b.x+b.footprint_w/2.0,b.z+b.footprint_h/2.0,r)<coalesce((r->>'width')::numeric,4)/2+greatest(1.2,least(8,sqrt(b.footprint_w^2+b.footprint_h^2)*.26)) then raise exception 'Cette route traverse un bâtiment. Déplace-le ou choisis un autre tracé.';end if;
  end loop;
  for f in select value from jsonb_array_elements(coalesce(new.city->'terrain','[]'::jsonb)) where value->>'kind' in ('lake','river') loop
   if public.city3b_segment_distance(r,f)<(r->>'width')::numeric/2+(f->>'width')::numeric/2 then raise exception 'Une étendue d’eau bloque ce tracé';end if;
  end loop;
 end loop;
 return new;
end $$;
commit;
