begin;
create table public.nexus_city_districts(
 city_id uuid not null references public.nexus_cities(city_id) on delete cascade,
 country text not null check(country in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne')),
 level integer not null default 0 check(level between 0 and 10),
 unlocked boolean not null default false,
 xp bigint not null default 0 check(xp>=0),
 updated_at timestamptz not null default now(),
 primary key(city_id,country)
);
create table public.nexus_city_collectible_displays(
 city_id uuid not null references public.nexus_cities(city_id) on delete cascade,
 item_instance_id uuid not null references public.item_instances(id) on delete cascade,
 x integer not null check(x between -500 and 500),
 z integer not null check(z between -500 and 500),
 rotation smallint not null default 0 check(rotation in (0,90,180,270)),
 displayed_at timestamptz not null default now(),
 primary key(city_id,item_instance_id),unique(city_id,x,z)
);
alter table public.nexus_city_districts enable row level security;alter table public.nexus_city_collectible_displays enable row level security;
revoke all on public.nexus_city_districts,public.nexus_city_collectible_displays from public,anon,authenticated;
grant select on public.nexus_city_districts,public.nexus_city_collectible_displays to authenticated;grant all on public.nexus_city_districts,public.nexus_city_collectible_displays to service_role;
create policy nexus_city_districts_read on public.nexus_city_districts for select to authenticated using(exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_districts.city_id and (c.user_id=(select auth.uid()) or c.visibility='public')));
create policy nexus_city_displays_read on public.nexus_city_collectible_displays for select to authenticated using(exists(select 1 from public.nexus_cities c where c.city_id=nexus_city_collectible_displays.city_id and (c.user_id=(select auth.uid()) or c.visibility='public')));
create index nexus_city_districts_city_idx on public.nexus_city_districts(city_id,unlocked,country);create index nexus_city_displays_city_idx on public.nexus_city_collectible_displays(city_id,displayed_at);

insert into public.nexus_city_buildings(code,name,category,country,unlock_level,cost_coins,metadata) values
('FRANCE_SQUARE','Place Justice','monument','France',2,250,'{"district":"France","value":"Justice"}'),
('ITALY_HOPE_GALLERY','Galerie Espoir','culture','Italie',2,250,'{"district":"Italie","value":"Espoir"}'),
('ESTONIA_WISDOM_TOWER','Tour Sagesse','monument','Estonie',2,250,'{"district":"Estonie","value":"Sagesse"}'),
('TURKEY_FAITH_GARDEN','Jardin de la Foi','nature','Turquie',2,250,'{"district":"Turquie","value":"Foi"}'),
('ALGERIA_LOYALTY_HOUSE','Maison Loyauté','community','Algérie',2,250,'{"district":"Algérie","value":"Loyauté"}'),
('TUNISIA_COURAGE_GATE','Porte Courage','monument','Tunisie',2,250,'{"district":"Tunisie","value":"Courage"}'),
('MOROCCO_NOBILITY_COURT','Cour Noblesse','culture','Maroc',2,250,'{"district":"Maroc","value":"Noblesse"}'),
('SPAIN_PASSION_PLAZA','Plaza Passion','culture','Espagne',2,250,'{"district":"Espagne","value":"Passion"}')
on conflict(code) do nothing;
commit;
