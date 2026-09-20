insert into public.economy_accounts(user_id,xp,coins)
select user_id,0,0 from public.member_profiles
on conflict(user_id) do nothing;

create unique index if not exists economy_transactions_user_idempotency_uq
on public.economy_transactions(user_id,idempotency_key);

alter table public.nexus_city_placements
  add column if not exists placement_state text not null default 'placed',
  add column if not exists stored_at timestamptz,
  add column if not exists mutation_request_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='nexus_city_placements_state_check'
  ) then
    alter table public.nexus_city_placements
      add constraint nexus_city_placements_state_check
      check (placement_state in ('placed','stored'));
  end if;
end $$;

alter table public.nexus_city_placements
  drop constraint if exists nexus_city_placements_city_id_x_z_key;

create unique index if not exists nexus_city_placements_live_origin_uq
on public.nexus_city_placements(city_id,x,z)
where placement_state='placed';

create index if not exists nexus_city_placements_state_idx
on public.nexus_city_placements(city_id,placement_state,placed_at);

create index if not exists nexus_city_placements_mutation_request_idx
on public.nexus_city_placements(city_id,mutation_request_id)
where mutation_request_id is not null;

create or replace function public.nexus_city_create(p_user uuid,p_name text,p_country text)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare cid uuid; clean_name text:=trim(p_name); country text:=p_country;
begin
 if p_user is null or not exists(select 1 from public.member_profiles where user_id=p_user) then raise exception 'Compte 3B introuvable'; end if;
 if length(clean_name)<2 or length(clean_name)>40 then raise exception 'Nom de ville invalide'; end if;
 if country not in ('France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne') then raise exception 'Pays 3B invalide'; end if;
 insert into public.economy_accounts(user_id,xp,coins) values(p_user,0,0) on conflict(user_id) do nothing;
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is not null then return cid; end if;
 insert into public.nexus_cities(user_id,name,origin_country,visibility,city,save_version)
 values(p_user,clean_name,country,'private',jsonb_build_object('version',2,'level',1,'xp',0,'theme','origin','currency',0,'roads','[]'::jsonb,'placements','[]'::jsonb,'unlocked','[]'::jsonb),1)
 returning city_id into cid;
 insert into public.nexus_city_districts(city_id,country,level,unlocked,xp)
 select cid,c,case when c=country then 1 else 0 end,c=country,0
 from unnest(array['France','Italie','Estonie','Turquie','Algérie','Tunisie','Maroc','Espagne']) c;
 insert into public.nexus_city_unlocks(city_id,building_code,source)
 select cid,code,'starter' from public.nexus_city_buildings where metadata->>'starter'='true' and active=true on conflict do nothing;
 return cid;
end $$;

create or replace function public.nexus_city_place_v2(p_user uuid,p_building text,p_x integer,p_z integer,p_rotation smallint,p_request uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 c public.nexus_cities;
 b public.nexus_city_buildings;
 pid uuid;
 wallet_coins bigint;
 lvl integer;
 fw integer;
 fh integer;
 half integer;
 count_build integer;
begin
 if p_request is null then raise exception 'Identifiant de construction requis'; end if;
 if p_rotation not in (0,90,180,270) then raise exception 'Rotation invalide'; end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Crée ta ville 3B d abord'; end if;
 select id into pid from public.nexus_city_placements where city_id=c.city_id and request_id=p_request;
 if pid is not null then return pid; end if;
 select count(*) into count_build from public.nexus_city_placements where city_id=c.city_id and placement_state='placed';
 if count_build>=least(500,50+c.land_tier*45) then raise exception 'Limite de constructions atteinte pour ce terrain'; end if;
 select * into b from public.nexus_city_buildings where code=p_building and active=true;
 if not found then raise exception 'Bâtiment indisponible'; end if;
 lvl=greatest(1,least(50,c.city_level));
 if lvl<b.unlock_level then raise exception 'Niveau de ville insuffisant'; end if;
 if b.country is not null and b.country<>'3B International' and not exists(
   select 1 from public.nexus_city_districts where city_id=c.city_id and country=b.country and unlocked=true
 ) then raise exception 'Quartier non débloqué'; end if;
 fw=greatest(1,least(20,coalesce((b.footprint->>'w')::integer,1)));
 fh=greatest(1,least(20,coalesce((b.footprint->>'h')::integer,1)));
 if p_rotation in (90,270) then select fh,fw into fw,fh; end if;
 half=50+c.land_tier*45;
 if p_x< -half or p_z< -half or p_x+fw-1>half or p_z+fh-1>half then raise exception 'Construction hors du terrain'; end if;
 if exists(
   select 1 from public.nexus_city_placements q
   where q.city_id=c.city_id and q.placement_state='placed'
     and p_x<=q.x+q.footprint_w-1 and p_x+fw-1>=q.x
     and p_z<=q.z+q.footprint_h-1 and p_z+fh-1>=q.z
 ) then raise exception 'Cette parcelle est déjà occupée'; end if;
 insert into public.economy_accounts(user_id,xp,coins) values(p_user,0,0) on conflict(user_id) do nothing;
 select coins into wallet_coins from public.economy_accounts where user_id=p_user for update;
 if b.cost_coins>0 and wallet_coins<b.cost_coins then raise exception 'Coins 3B insuffisants'; end if;
 if b.cost_coins>0 then
   update public.economy_accounts set coins=coins-b.cost_coins,updated_at=now() where user_id=p_user;
   insert into public.economy_transactions(user_id,asset,amount,kind,source,idempotency_key,metadata)
   values(p_user,'coins',-b.cost_coins,'spend','city_build','city:build:'||p_request,
     jsonb_build_object('building',b.code,'request_id',p_request));
 end if;
 insert into public.nexus_city_placements(city_id,building_code,x,z,rotation,footprint_w,footprint_h,request_id,placement_state)
 values(c.city_id,b.code,p_x,p_z,p_rotation,fw,fh,p_request,'placed') returning id into pid;
 insert into public.nexus_city_unlocks(city_id,building_code,source) values(c.city_id,b.code,'level') on conflict do nothing;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
 values(c.city_id,p_user,'build',pid,-b.cost_coins,jsonb_build_object('building',b.code,'x',p_x,'z',p_z));
 update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=c.city_id;
 return pid;
end $$;

create or replace function public.nexus_city_move_v2(p_user uuid,p_placement uuid,p_x integer,p_z integer,p_rotation smallint,p_request uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
 c public.nexus_cities;
 p public.nexus_city_placements;
 b public.nexus_city_buildings;
 fw integer;
 fh integer;
 half integer;
 was_state text;
begin
 if p_request is null then raise exception 'Identifiant de déplacement requis'; end if;
 if p_rotation not in (0,90,180,270) then raise exception 'Rotation invalide'; end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 select * into p from public.nexus_city_placements where id=p_placement and city_id=c.city_id for update;
 if not found then raise exception 'Bâtiment introuvable'; end if;
 if p.mutation_request_id=p_request then return p.id; end if;
 select * into b from public.nexus_city_buildings where code=p.building_code and active=true;
 if not found then raise exception 'Bâtiment indisponible'; end if;
 fw=greatest(1,least(20,coalesce((b.footprint->>'w')::integer,1)));
 fh=greatest(1,least(20,coalesce((b.footprint->>'h')::integer,1)));
 if p_rotation in (90,270) then select fh,fw into fw,fh; end if;
 half=50+c.land_tier*45;
 if p_x< -half or p_z< -half or p_x+fw-1>half or p_z+fh-1>half then raise exception 'Construction hors du terrain'; end if;
 if exists(
   select 1 from public.nexus_city_placements q
   where q.city_id=c.city_id and q.id<>p.id and q.placement_state='placed'
     and p_x<=q.x+q.footprint_w-1 and p_x+fw-1>=q.x
     and p_z<=q.z+q.footprint_h-1 and p_z+fh-1>=q.z
 ) then raise exception 'Cette parcelle est déjà occupée'; end if;
 was_state=p.placement_state;
 update public.nexus_city_placements
 set x=p_x,z=p_z,rotation=p_rotation,footprint_w=fw,footprint_h=fh,
     placement_state='placed',stored_at=null,mutation_request_id=p_request
 where id=p.id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
 values(c.city_id,p_user,case when was_state='stored' then 'restore' else 'move' end,p.id,0,
   jsonb_build_object('x',p_x,'z',p_z,'rotation',p_rotation));
 update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=c.city_id;
 return p.id;
end $$;

create or replace function public.nexus_city_store_v2(p_user uuid,p_placement uuid,p_request uuid)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare c public.nexus_cities; p public.nexus_city_placements;
begin
 if p_request is null then raise exception 'Identifiant de rangement requis'; end if;
 select * into c from public.nexus_cities where user_id=p_user for update;
 if not found then raise exception 'Ville introuvable'; end if;
 select * into p from public.nexus_city_placements where id=p_placement and city_id=c.city_id for update;
 if not found then raise exception 'Bâtiment introuvable'; end if;
 if p.mutation_request_id=p_request then return p.id; end if;
 if p.placement_state='stored' then
   update public.nexus_city_placements set mutation_request_id=p_request where id=p.id;
   return p.id;
 end if;
 update public.nexus_city_placements
 set placement_state='stored',stored_at=now(),mutation_request_id=p_request
 where id=p.id;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
 values(c.city_id,p_user,'store',p.id,0,jsonb_build_object('building',p.building_code));
 update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=c.city_id;
 return p.id;
end $$;

create or replace function public.nexus_city_move(p_user uuid,p_placement uuid,p_x integer,p_z integer,p_rotation smallint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
begin
 perform public.nexus_city_move_v2(p_user,p_placement,p_x,p_z,p_rotation,gen_random_uuid());
 return true;
end $$;

create or replace function public.nexus_city_remove(p_user uuid,p_placement uuid)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare cid uuid; current_state text;
begin
 select city_id into cid from public.nexus_cities where user_id=p_user for update;
 if cid is null then raise exception 'Ville introuvable'; end if;
 select placement_state into current_state from public.nexus_city_placements where id=p_placement and city_id=cid for update;
 if current_state is null then raise exception 'Bâtiment introuvable'; end if;
 if current_state='stored' then return true; end if;
 update public.nexus_city_placements set placement_state='stored',stored_at=now(),mutation_request_id=gen_random_uuid() where id=p_placement and city_id=cid;
 insert into public.nexus_city_journal(city_id,user_id,action,reference_id,coins,metadata)
 values(cid,p_user,'store',p_placement,0,'{}'::jsonb);
 update public.nexus_cities set revision=revision+1,updated_at=now() where city_id=cid;
 return true;
end $$;

revoke all on function public.nexus_city_move_v2(uuid,uuid,integer,integer,smallint,uuid) from public,anon,authenticated;
revoke all on function public.nexus_city_store_v2(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.nexus_city_move_v2(uuid,uuid,integer,integer,smallint,uuid) to service_role;
grant execute on function public.nexus_city_store_v2(uuid,uuid,uuid) to service_role;
