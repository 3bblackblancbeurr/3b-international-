begin;
-- The selected slot is transaction-local, never a mutable active-city preference.
create function public.city3b_request_slot() returns smallint language sql stable security invoker set search_path='' as $$
 select coalesce(nullif(current_setting('city3b.slot',true),'')::smallint,1::smallint)
$$;
revoke all on function public.city3b_request_slot() from public,anon;
grant execute on function public.city3b_request_slot() to authenticated,service_role;
alter table public.nexus_cities add column slot_no smallint not null default public.city3b_request_slot() check(slot_no between 1 and 3);
alter table public.nexus_cities drop constraint nexus_cities_pkey;
alter table public.nexus_cities add primary key(user_id,slot_no);
-- Preserve the physical table, foreign keys and RLS; existing gameplay functions
-- operate through an automatically updatable, security-invoker view.
create view public.nexus_city_current with (security_invoker=true) as select * from public.nexus_cities where slot_no=public.city3b_request_slot() with local check option;
revoke all on public.nexus_city_current from public,anon,authenticated;
grant all on public.nexus_city_current to service_role;

do $scope$
declare f record;body text;
begin
 for f in select oid,proname from pg_proc where pronamespace='public'::regnamespace and prokind='f' and prosrc like '%public.nexus_cities%'
 and (proname like 'nexus_%' or proname='nexus_city_materials')
 and proname not in ('nexus_city_can_view','nexus_city_visit','nexus_city_favorite') loop
  body:=pg_get_functiondef(f.oid);
  body:=regexp_replace(body,'(from|join|update|into) public\.nexus_cities\M','\1 public.nexus_city_current','gi');
  if f.proname='nexus_city_materials' then
   -- The material wallet and escrow are account-wide. Lock owners, including
   -- their other slots, and resolve public destinations by their actual city id.
   body:=replace(body,'from public.nexus_city_current where city_id=p_target','from public.nexus_cities where city_id=p_target');
   body:=replace(body,'from public.nexus_city_current where user_id in','from public.nexus_cities where user_id in');
   body:=replace(body,'join public.nexus_city_current sender on','join (select distinct on (user_id) user_id,name from public.nexus_cities order by user_id,slot_no) sender on');
   body:=replace(body,'join public.nexus_city_current receiver on','join (select distinct on (user_id) user_id,name from public.nexus_cities order by user_id,slot_no) receiver on');
  end if;
  execute body;
 end loop;
end $scope$;

create function public.nexus_city_slot_call(p_user uuid,p_slot integer,p_city uuid,p_operation text,p_args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare proc record;arg text;argtype text;parts text[]:=array[]::text[];i integer;result jsonb;previous text;actual uuid;
begin
 if p_slot is null or p_slot not between 1 and 3 then raise exception 'Choisis un emplacement de 1 à 3';end if;
 if p_operation is null or p_operation not in (
 'nexus_city_create_map','nexus_city_campaign_snapshot','nexus_city_budget_snapshot','nexus_city_life_snapshot',
 'nexus_city_construction_claim','nexus_city_life_action','nexus_city_budget_claim','nexus_city_materials','nexus_city_plan_signals',
 'nexus_city_plan_networks','nexus_city_plan_terrain','nexus_city_plan_roads_v2','nexus_city_plan_roads','nexus_city_mission_claim',
 'nexus_city_place_v2','nexus_city_move_v2','nexus_city_store_v2','nexus_city_display_item','nexus_city_remove_display','nexus_city_asset_set',
 'nexus_city_settings','nexus_city_environment','nexus_city_recalculate') then raise exception 'Action de sauvegarde invalide';end if;
 if jsonb_typeof(p_args) is distinct from 'object' then raise exception 'Paramètres invalides';end if;
 perform 1 from public.member_profiles where user_id=p_user and passport_state='active' for update;
 if not found then raise exception 'Passeport 3B actif requis';end if;
 select city_id into actual from public.nexus_cities where user_id=p_user and slot_no=p_slot for update;
 if p_city is not null and actual is distinct from p_city then raise exception 'Cette partie a changé. Retourne aux sauvegardes.';end if;
 if p_operation<>'nexus_city_create_map' and actual is null then raise exception 'Emplacement vide. Crée une nouvelle ville.';end if;
 if p_operation not in ('nexus_city_create_map','nexus_city_campaign_snapshot','nexus_city_budget_snapshot','nexus_city_life_snapshot') and p_city is null then raise exception 'Recharge la partie avant de modifier ta ville';end if;
 select p.oid,p.proargnames,p.proargtypes,p.prorettype into proc from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=p_operation;
 if not found then raise exception 'Action indisponible';end if;
 if exists(select 1 from jsonb_object_keys(p_args) k where not k=any(proc.proargnames)) then raise exception 'Paramètre inconnu';end if;
 for i in 1..array_length(proc.proargnames,1) loop
  arg:=proc.proargnames[i];argtype:=format_type(proc.proargtypes[i-1],null);
  if arg='p_user' then parts:=array_append(parts,format('%I => $2',arg));
  elsif p_args ? arg then
   if argtype='jsonb' then parts:=array_append(parts,format('%I => ($1->%L)',arg,arg));
   else parts:=array_append(parts,format('%I => ($1->>%L)::%s',arg,arg,argtype));end if;
  end if;
 end loop;
 previous:=current_setting('city3b.slot',true);perform set_config('city3b.slot',p_slot::text,true);
 if proc.prorettype='void'::regtype then execute format('select public.%I(%s)',p_operation,array_to_string(parts,',')) using p_args,p_user;result:='null';
 else execute format('select to_jsonb(public.%I(%s))',p_operation,array_to_string(parts,',')) into result using p_args,p_user;end if;
 perform set_config('city3b.slot',coalesce(previous,''),true);
 return result;
end $$;
revoke all on function public.nexus_city_slot_call(uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nexus_city_slot_call(uuid,integer,uuid,text,jsonb) to service_role;
-- Account prestige uses the best saved city, never an arbitrary first row.
do $prestige$ declare body text;begin
 if to_regprocedure('public.threeb_prestige_eligibility_server(uuid)') is not null then
  body:=pg_get_functiondef('public.threeb_prestige_eligibility_server(uuid)'::regprocedure);
  body:=replace(body,'select coalesce(city_level,0)','select coalesce(max(city_level),0)');execute body;
 end if;
end $prestige$;
notify pgrst,'reload schema';
commit;
