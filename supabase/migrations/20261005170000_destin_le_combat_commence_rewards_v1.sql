begin;

insert into public.inventory_items(
 code,name,category,coin_price,active,metadata,description,item_type,rarity,
 tradeable,marketable,permanent,stackable,max_supply
) values
(
 'DESTIN_MEMORY_KEY','Clé des Origines','destin_reward',0,true,
 '{"destin":true,"path":"memoire","world_capability":"echo_origins","world_place":"memory_archives","passport_title":"Héritier des voix","city_building":"DESTIN_MEMORY_PAVILION"}'::jsonb,
 'Objet permanent du Destin 3B · Mémoire. Réveille les traces narratives prévues dans le Monde 3B.',
 'tool','special',false,false,true,false,null
),
(
 'DESTIN_FUTURE_COMPASS','Boussole de l’Aube','destin_reward',0,true,
 '{"destin":true,"path":"avenir","world_capability":"dawn_trace","world_place":"central_marina","passport_title":"Éclaireur de l’Aube","city_building":"DESTIN_FUTURE_WORKSHOP"}'::jsonb,
 'Objet permanent du Destin 3B · Avenir. Révèle les itinéraires narratifs prévus dans le Monde 3B.',
 'tool','special',false,false,true,false,null
)
on conflict(code) do update set
 name=excluded.name,category=excluded.category,coin_price=0,active=true,
 metadata=excluded.metadata,description=excluded.description,item_type=excluded.item_type,
 rarity=excluded.rarity,tradeable=false,marketable=false,permanent=true,stackable=false,max_supply=null;

insert into public.nexus_city_buildings(code,name,category,country,unlock_level,cost_coins,footprint,permanent,active,metadata)
values
(
 'DESTIN_MEMORY_PAVILION','Pavillon de la Mémoire','culture',null,1,0,'{"w":4,"h":4}'::jsonb,true,true,
 '{"destin_reward":true,"destin_path":"memoire","destin_required_item":"DESTIN_MEMORY_KEY","city_role":"mixed","max_per_city":1,"service_capacity":30,"cultural_capacity":30,"jobs":8,"non_purchasable":true}'::jsonb
),
(
 'DESTIN_FUTURE_WORKSHOP','Atelier de l’Avenir','community',null,1,0,'{"w":4,"h":4}'::jsonb,true,true,
 '{"destin_reward":true,"destin_path":"avenir","destin_required_item":"DESTIN_FUTURE_COMPASS","city_role":"civic","service":"education","service_capacity":30,"jobs":6,"max_per_city":1,"non_purchasable":true}'::jsonb
)
on conflict(code) do update set
 name=excluded.name,category=excluded.category,country=null,unlock_level=1,cost_coins=0,
 footprint=excluded.footprint,permanent=true,active=true,metadata=excluded.metadata;

create table if not exists public.destin_path_rewards(
 user_id uuid not null references auth.users(id) on delete cascade,
 story_id uuid not null references public.destin_stories(id) on delete cascade,
 ending_id text not null check(ending_id in ('combat-memoire','combat-avenir')),
 item_instance_id uuid not null unique references public.item_instances(id) on delete restrict,
 item_code text not null references public.inventory_items(code),
 passport_title text not null,
 world_capability text not null,
 world_place text not null,
 city_building_code text not null references public.nexus_city_buildings(code),
 created_at timestamptz not null default now(),
 primary key(user_id,story_id)
);
alter table public.destin_path_rewards enable row level security;
revoke all on public.destin_path_rewards from public,anon,authenticated;
grant select on public.destin_path_rewards to authenticated;
grant select,insert,update,delete on public.destin_path_rewards to service_role;
drop policy if exists destin_path_rewards_read_own on public.destin_path_rewards;
create policy destin_path_rewards_read_own on public.destin_path_rewards
 for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.destin_path_reward_server(p_user uuid,p_story uuid,p_ending text)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
declare
 existing public.destin_path_rewards%rowtype;
 item_code text;
 passport_title text;
 world_capability text;
 world_place text;
 city_code text;
 item_id uuid;
begin
 if p_user is null or p_story is null or p_ending not in ('combat-memoire','combat-avenir') then return null; end if;
 if not exists(
  select 1 from public.destin_unlocks
  where user_id=p_user and story_id=p_story and ending_id=p_ending
 ) then raise exception 'Ce chemin n’est pas encore accompli.'; end if;

 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_story::text,4633));
 select * into existing from public.destin_path_rewards where user_id=p_user and story_id=p_story;
 if found then
  if existing.ending_id<>p_ending then raise exception 'Ce destin possède déjà un autre chemin définitif.'; end if;
  return jsonb_build_object(
   'endingId',existing.ending_id,'itemCode',existing.item_code,'itemInstanceId',existing.item_instance_id,
   'passportTitle',existing.passport_title,'worldCapability',existing.world_capability,'worldPlace',existing.world_place,
   'cityBuilding',existing.city_building_code
  );
 end if;

 if p_ending='combat-memoire' then
  item_code:='DESTIN_MEMORY_KEY';
  passport_title:='Héritier des voix';
  world_capability:='echo_origins';
  world_place:='memory_archives';
  city_code:='DESTIN_MEMORY_PAVILION';
 else
  item_code:='DESTIN_FUTURE_COMPASS';
  passport_title:='Éclaireur de l’Aube';
  world_capability:='dawn_trace';
  world_place:='central_marina';
  city_code:='DESTIN_FUTURE_WORKSHOP';
 end if;

 item_id:=public.market_mint_item(
  p_user,item_code,'game_reward','destin:'||p_story::text||':'||p_ending,
  jsonb_build_object('destin',true,'storyId',p_story,'endingId',p_ending,'passportTitle',passport_title,
                     'worldCapability',world_capability,'worldPlace',world_place,'cityBuilding',city_code)
 );
 insert into public.destin_path_rewards(user_id,story_id,ending_id,item_instance_id,item_code,passport_title,world_capability,world_place,city_building_code)
 values(p_user,p_story,p_ending,item_id,item_code,passport_title,world_capability,world_place,city_code);

 return jsonb_build_object(
  'endingId',p_ending,'itemCode',item_code,'itemInstanceId',item_id,'passportTitle',passport_title,
  'worldCapability',world_capability,'worldPlace',world_place,'cityBuilding',city_code
 );
end
$function$;
revoke all on function public.destin_path_reward_server(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.destin_path_reward_server(uuid,uuid,text) to service_role;

create or replace function public.destin_claim_server(p_user uuid,p_story uuid,p_ending text)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $function$
#variable_conflict use_column
declare
 u public.destin_unlocks%rowtype;
 result jsonb;
 path_reward jsonb;
begin
 select * into u from public.destin_unlocks
 where user_id=p_user and story_id=p_story and ending_id=p_ending
 for update;
 if not found then raise exception 'Cette fin n’est pas encore débloquée.'; end if;

 path_reward:=public.destin_path_reward_server(p_user,p_story,p_ending);

 if u.reward_status='awarded' then
  result:=coalesce(u.reward,'{}'::jsonb);
  if path_reward is not null then
   result:=result||jsonb_build_object('pathReward',path_reward);
   update public.destin_unlocks set reward=result where user_id=p_user and story_id=p_story and ending_id=p_ending;
  end if;
  return jsonb_build_object('status','awarded','reward',result);
 end if;

 if u.reward_status<>'pending' or u.last_attempt>clock_timestamp()-interval '30 seconds' then
  result:=coalesce(u.reward,'{}'::jsonb);
  if path_reward is not null then
   result:=result||jsonb_build_object('pathReward',path_reward);
   update public.destin_unlocks set reward=result where user_id=p_user and story_id=p_story and ending_id=p_ending;
  end if;
  return jsonb_build_object('status',u.reward_status,'reward',result);
 end if;

 begin
  result:=public.threeb_credit_reward_server(p_user,'destin_ending','destin:'||p_story::text||':'||p_ending);
  if path_reward is not null then result:=coalesce(result,'{}'::jsonb)||jsonb_build_object('pathReward',path_reward); end if;
  update public.destin_unlocks
   set reward_status='awarded',reward=result,last_attempt=clock_timestamp()
   where user_id=p_user and story_id=p_story and ending_id=p_ending;
  return jsonb_build_object('status','awarded','reward',result);
 exception when others then
  result:=coalesce(u.reward,'{}'::jsonb);
  if path_reward is not null then result:=result||jsonb_build_object('pathReward',path_reward); end if;
  update public.destin_unlocks
   set reward=result,last_attempt=clock_timestamp()
   where user_id=p_user and story_id=p_story and ending_id=p_ending;
  return jsonb_build_object('status','pending','reward',result,'message','Récompense de chemin conservée. Le bonus XP/Coins sera retenté depuis Mes destins.');
 end;
end
$function$;
revoke all on function public.destin_claim_server(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.destin_claim_server(uuid,uuid,text) to service_role;

create or replace function public.destin_city_reward_guard()
returns trigger
language plpgsql
security invoker
set search_path=''
as $function$
declare
 owner_id uuid;
 required_item text;
begin
 select c.user_id,b.metadata->>'destin_required_item'
 into owner_id,required_item
 from public.nexus_cities c
 join public.nexus_city_buildings b on b.code=new.building_code
 where c.city_id=new.city_id;

 if coalesce(required_item,'')='' then return new; end if;
 if not exists(
  select 1 from public.item_instances i
  where i.owner_id=owner_id and i.item_code=required_item and i.state='owned'
 ) then raise exception 'Ce bâtiment appartient à un autre chemin du Destin 3B.'; end if;

 if exists(
  select 1
  from public.nexus_city_placements p
  join public.nexus_cities c on c.city_id=p.city_id
  where c.user_id=owner_id and p.building_code=new.building_code and p.id<>new.id
 ) then raise exception 'Un seul exemplaire de ce bâtiment du Destin est disponible par compte.'; end if;

 return new;
end
$function$;
revoke all on function public.destin_city_reward_guard() from public,anon,authenticated;
grant execute on function public.destin_city_reward_guard() to service_role;
drop trigger if exists destin_city_reward_guard on public.nexus_city_placements;
create trigger destin_city_reward_guard
 before insert or update of building_code on public.nexus_city_placements
 for each row execute function public.destin_city_reward_guard();

commit;
