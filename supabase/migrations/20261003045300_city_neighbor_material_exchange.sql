begin;
-- Local game materials, not Passport items, currencies or real-money assets.
insert into public.nexus_city_buildings(code,name,category,unlock_level,cost_coins,footprint,metadata) values
('TIMBER_WORKS_3B','Atelier du bois','shop',4,420,'{"w":5,"h":4}','{"city_role":"commerce","architecture":"matrix","service":"industry","material":"timber","jobs":18}'),
('METAL_WORKS_3B','Atelier des métaux','shop',5,520,'{"w":6,"h":4}','{"city_role":"commerce","architecture":"horizon","service":"industry","material":"steel","jobs":24}'),
('CIRCUIT_WORKS_3B','Atelier numérique','shop',5,560,'{"w":5,"h":4}','{"city_role":"commerce","architecture":"matrix","service":"industry","material":"circuits","jobs":24}') on conflict(code) do nothing;
create table public.nexus_city_material_stock(
 user_id uuid not null references auth.users(id) on delete cascade,
 material text not null check(material in ('timber','steel','circuits')),
 quantity integer not null default 0 check(quantity between 0 and 100000),
 primary key(user_id,material));
create table public.nexus_city_material_claims(
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,primary key(user_id,day));
create table public.nexus_city_material_offers(
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id),receiver uuid not null references auth.users(id),
 give_material text not null check(give_material in ('timber','steel','circuits')),
 give_quantity integer not null check(give_quantity between 1 and 24),
 get_material text not null check(get_material in ('timber','steel','circuits')),
 get_quantity integer not null check(get_quantity between 1 and 24),
 state text not null default 'pending' check(state in ('pending','accepted','cancelled')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '48 hours',
 check(sender<>receiver),check(give_material<>get_material));
create index city_offer_sender on public.nexus_city_material_offers(sender,created_at desc);
create index city_offer_receiver on public.nexus_city_material_offers(receiver,created_at desc);
alter table public.nexus_city_material_stock enable row level security;
alter table public.nexus_city_material_claims enable row level security;
alter table public.nexus_city_material_offers enable row level security;
create policy city_material_own on public.nexus_city_material_stock for select to authenticated using(user_id=(select auth.uid()));
create policy city_material_claim_own on public.nexus_city_material_claims for select to authenticated using(user_id=(select auth.uid()));
create policy city_material_offer_participant on public.nexus_city_material_offers for select to authenticated using(sender=(select auth.uid()) or receiver=(select auth.uid()));
revoke all on public.nexus_city_material_stock,public.nexus_city_material_claims,public.nexus_city_material_offers from public,anon,authenticated;
grant select on public.nexus_city_material_stock,public.nexus_city_material_claims,public.nexus_city_material_offers to authenticated;
grant all on public.nexus_city_material_stock,public.nexus_city_material_claims,public.nexus_city_material_offers to service_role;

create function public.city3b_has_trade_house(p_user uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.nexus_city_placements p join public.nexus_cities c using(city_id) where c.user_id=p_user and p.building_code='TRADE_CENTER_3B' and p.placement_state='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now()));
$$;
revoke all on function public.city3b_has_trade_house(uuid) from public,anon,authenticated;
grant execute on function public.city3b_has_trade_house(uuid) to service_role;

create function public.nexus_city_materials(p_user uuid,p_action text default 'snapshot',p_offer uuid default null,p_target uuid default null,p_deal text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.nexus_cities; target public.nexus_cities; o public.nexus_city_material_offers; r record; offered uuid; available boolean;
 give text;receive text;gq integer;rq integer;counts jsonb;stocks jsonb;offers jsonb;claim_id uuid;cost1 integer;cost2 integer;item1 text;item2 text;projects jsonb;seen boolean;yield jsonb;
begin
 if p_action not in ('snapshot','claim','offer','accept','cancel','upgrade') then raise exception 'Action de matériaux invalide';end if;
 if not exists(select 1 from public.member_profiles where user_id=p_user and passport_state='active') then raise exception 'Passeport 3B actif requis';end if;
 -- Transfers lock both city owners in the same order, independent of caller.
 if p_action in ('accept','cancel') then
  select * into o from public.nexus_city_material_offers where id=p_offer;
  if not found or p_user not in (o.sender,o.receiver) then raise exception 'Échange introuvable';end if;
  perform 1 from public.nexus_cities where user_id in (o.sender,o.receiver) order by user_id for update;
 elsif p_action='offer' then
  select * into target from public.nexus_cities where city_id=p_target and visibility='public';
  if not found or target.user_id=p_user then raise exception 'Ville voisine indisponible';end if;
  perform 1 from public.nexus_cities where user_id in (p_user,target.user_id) order by user_id for update;
 else perform 1 from public.nexus_cities where user_id=p_user for update;end if;
 select * into c from public.nexus_cities where user_id=p_user;
 if not found then raise exception 'Ville introuvable';end if;
 insert into public.nexus_city_material_stock(user_id,material) select p_user,x from unnest(array['timber','steel','circuits']) x on conflict do nothing;
 -- A sender's expired escrow is returned on their next visit. No client timer handles funds.
 for o in select * from public.nexus_city_material_offers where sender=p_user and state='pending' and expires_at<=now() for update loop
  update public.nexus_city_material_stock set quantity=quantity+o.give_quantity where user_id=p_user and material=o.give_material;
  update public.nexus_city_material_offers set state='cancelled' where id=o.id;
 end loop;
 available:=public.city3b_has_trade_house(p_user);
 select coalesce(jsonb_object_agg(material,amount),'{}'::jsonb) into yield from (
  select b.metadata->>'material' material,least(24,count(*)*8)::integer amount from public.nexus_city_placements p join public.nexus_city_buildings b on b.code=p.building_code
  where p.city_id=c.city_id and p.placement_state='placed' and (p.construction_ready_at is null or p.construction_ready_at<=now()) and b.metadata->>'material' in ('timber','steel','circuits')
   and exists(select 1 from jsonb_array_elements(coalesce(c.city->'roads','[]'::jsonb)) road where public.city3b_point_distance(p.x+p.footprint_w/2.0,p.z+p.footprint_h/2.0,road)<=14)
  group by b.metadata->>'material') q;
 select exists(select 1 from public.nexus_city_material_claims where user_id=p_user and day=(now() at time zone 'UTC')::date) into seen;
 if p_action='claim' and not seen then
  if yield='{}'::jsonb then raise exception 'Termine un atelier et relie-le à une route';end if;
  insert into public.nexus_city_material_claims(user_id,day) values(p_user,(now() at time zone 'UTC')::date);
  for r in select key,value from jsonb_each_text(yield) loop update public.nexus_city_material_stock set quantity=least(10000,quantity+r.value::integer) where user_id=p_user and material=r.key;end loop;
  seen:=true;
 elsif p_action='offer' then
  if p_offer is null then raise exception 'Identifiant de contrat requis';end if;
  if exists(select 1 from public.nexus_city_material_offers where id=p_offer) then
   if exists(select 1 from public.nexus_city_material_offers where id=p_offer and sender=p_user) then return public.nexus_city_materials(p_user,'snapshot');end if;
   raise exception 'Identifiant de contrat invalide';
  end if;
  if not available or not public.city3b_has_trade_house(target.user_id) then raise exception 'Chaque ville doit posséder une Maison des échanges terminée';end if;
  if (select count(*) from public.nexus_city_material_offers where sender=p_user and state='pending')>=20 then raise exception '20 échanges en attente maximum';end if;
  case p_deal
   when 'timber_steel' then give:='timber';receive:='steel';gq:=6;rq:=4;
   when 'steel_timber' then give:='steel';receive:='timber';gq:=4;rq:=6;
   when 'steel_circuits' then give:='steel';receive:='circuits';gq:=4;rq:=3;
   when 'circuits_steel' then give:='circuits';receive:='steel';gq:=3;rq:=4;
   when 'timber_circuits' then give:='timber';receive:='circuits';gq:=6;rq:=3;
   when 'circuits_timber' then give:='circuits';receive:='timber';gq:=3;rq:=6;
   else raise exception 'Contrat invalide';
  end case;
  update public.nexus_city_material_stock set quantity=quantity-gq where user_id=p_user and material=give and quantity>=gq;
  if not found then raise exception 'Matériaux insuffisants';end if;
  insert into public.nexus_city_material_offers(id,sender,receiver,give_material,give_quantity,get_material,get_quantity) values(p_offer,p_user,target.user_id,give,gq,receive,rq) returning id into offered;
 elsif p_action in ('accept','cancel') then
  select * into o from public.nexus_city_material_offers where id=p_offer for update;
  if p_action='accept' and o.receiver<>p_user then raise exception 'Seule la ville destinataire peut accepter';end if;
  if p_action='cancel' and o.sender<>p_user then raise exception 'Seule la ville émettrice peut annuler';end if;
  if o.state='pending' then
   if p_action='accept' then
    if o.expires_at<=now() then raise exception 'Cet échange a expiré';end if;
    if not public.city3b_has_trade_house(o.sender) or not public.city3b_has_trade_house(o.receiver) then raise exception 'Les Maisons des échanges doivent rester en service';end if;
    insert into public.nexus_city_material_stock(user_id,material) select o.sender,x from unnest(array['timber','steel','circuits']) x on conflict do nothing;
    update public.nexus_city_material_stock set quantity=quantity-o.get_quantity where user_id=o.receiver and material=o.get_material and quantity>=o.get_quantity;
    if not found then raise exception 'Matériaux insuffisants';end if;
    update public.nexus_city_material_stock set quantity=quantity+o.get_quantity where user_id=o.sender and material=o.get_material;
    update public.nexus_city_material_stock set quantity=quantity+o.give_quantity where user_id=o.receiver and material=o.give_material;
    update public.nexus_city_material_offers set state='accepted' where id=o.id;
   else
    update public.nexus_city_material_stock set quantity=quantity+o.give_quantity where user_id=o.sender and material=o.give_material;
    update public.nexus_city_material_offers set state='cancelled' where id=o.id;
   end if;
  end if;
 elsif p_action='upgrade' then
  projects:=coalesce(c.city->'municipalUpgrades','{}'::jsonb);
  if c.city_level<5 then raise exception 'Projets municipaux disponibles au niveau 5';end if;
  if p_deal not in ('water_efficiency','energy_efficiency','housing_gardens') then raise exception 'Projet invalide';end if;
  if coalesce((projects->>p_deal)::boolean,false) then return public.nexus_city_materials(p_user,'snapshot');end if;
  if p_deal='water_efficiency' then item1:='steel';cost1:=12;item2:='circuits';cost2:=6;
  elsif p_deal='energy_efficiency' then item1:='circuits';cost1:=12;item2:='steel';cost2:=6;
  else item1:='timber';cost1:=12;item2:='steel';cost2:=6;end if;
  update public.nexus_city_material_stock set quantity=quantity-cost1 where user_id=p_user and material=item1 and quantity>=cost1;
  if not found then raise exception 'Matériaux insuffisants';end if;
  update public.nexus_city_material_stock set quantity=quantity-cost2 where user_id=p_user and material=item2 and quantity>=cost2;
  if not found then raise exception 'Matériaux insuffisants';end if;
  update public.nexus_cities set city=jsonb_set(city,'{municipalUpgrades}',projects||jsonb_build_object(p_deal,true)),city_xp=city_xp+300,revision=revision+1,updated_at=now() where user_id=p_user;
  insert into public.nexus_city_journal(city_id,user_id,action,coins,metadata) values(c.city_id,p_user,'municipal_upgrade',0,jsonb_build_object('project',p_deal,'cityXp',300));
 end if;
 select coalesce(jsonb_object_agg(material,quantity),'{}'::jsonb) into stocks from public.nexus_city_material_stock where user_id=p_user;
 select coalesce(jsonb_agg(v),'[]'::jsonb) into offers from (
  select offerrow.id,offerrow.give_material "give",offerrow.give_quantity "giveQuantity",offerrow.get_material "get",offerrow.get_quantity "getQuantity",offerrow.state,offerrow.expires_at "expiresAt",offerrow.sender=p_user outgoing,
   case when offerrow.sender=p_user then receiver.name else sender.name end "otherCity"
  from public.nexus_city_material_offers offerrow join public.nexus_cities sender on sender.user_id=offerrow.sender join public.nexus_cities receiver on receiver.user_id=offerrow.receiver
  where p_user in (offerrow.sender,offerrow.receiver) order by offerrow.created_at desc limit 40) v;
 return jsonb_build_object('available',available,'stock',stocks,'yield',yield,'claimedToday',seen,'offers',offers,'createdOffer',offered,'upgrades',(select coalesce(city->'municipalUpgrades','{}'::jsonb) from public.nexus_cities where user_id=p_user));
end $$;
revoke all on function public.nexus_city_materials(uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.nexus_city_materials(uuid,text,uuid,uuid,text) to service_role;

do $upgrades$
declare original text;
begin
 original:=pg_get_functiondef('public.nexus_city_life_metrics(uuid,integer,text)'::regprocedure);
 original:=replace(original,' working:=ceil(', $new$ if coalesce((c.city->'municipalUpgrades'->>'water_efficiency')::boolean,false) then water:=floor(water*1.2);end if;
 if coalesce((c.city->'municipalUpgrades'->>'energy_efficiency')::boolean,false) then energy:=floor(energy*1.2);end if;
 if coalesce((c.city->'municipalUpgrades'->>'housing_gardens')::boolean,false) then capacity:=floor(capacity*1.2);end if;
 working:=ceil($new$);
 execute original;
end $upgrades$;
commit;
