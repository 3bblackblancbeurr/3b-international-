-- True global scarcity for 3B collectibles.
-- Ultime: at most 8 item instances globally. Unique: at most 1 globally.

create or replace function public.threeb_enforce_global_item_rarity_supply()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_rarity text;v_cap integer;v_count bigint;
begin
 select d.rarity into v_rarity from public.inventory_items d where d.code=new.item_code and d.active=true;
 if not found then raise exception 'item_definition_missing';end if;
 select supply_cap into v_cap from public.nexus_rarity_config where rarity=v_rarity;
 if v_cap is null then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('3b-global-rarity:'||v_rarity,0));
 select count(*) into v_count from public.item_instances ii join public.inventory_items d on d.code=ii.item_code where d.rarity=v_rarity;
 if v_count>=v_cap then raise exception 'global_rarity_supply_exhausted';end if;
 return new;
end$$;
drop trigger if exists threeb_global_item_rarity_supply_guard on public.item_instances;
create trigger threeb_global_item_rarity_supply_guard before insert on public.item_instances for each row execute function public.threeb_enforce_global_item_rarity_supply();
revoke all on function public.threeb_enforce_global_item_rarity_supply() from public,anon,authenticated;

create or replace function public.nexus_enforce_collectible_supply()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_rarity text;v_global_cap integer;v_item_cap integer;v_global_count bigint;v_item_count bigint;next_copy integer;
begin
 select c.rarity,c.supply_cap,r.supply_cap into v_rarity,v_item_cap,v_global_cap
 from public.nexus_collectible_catalog c join public.nexus_rarity_config r on r.rarity=c.rarity
 where c.item_id=new.item_id and c.active=true;
 if not found then raise exception 'collectible_unavailable';end if;
 if v_global_cap is not null then
  perform pg_advisory_xact_lock(hashtextextended('nexus-global-rarity:'||v_rarity,0));
  select count(*) into v_global_count from public.nexus_collectible_claims cc join public.nexus_collectible_catalog c on c.item_id=cc.item_id where c.rarity=v_rarity;
  if v_global_count>=v_global_cap then raise exception 'global_rarity_supply_exhausted';end if;
 end if;
 if v_item_cap is null and v_global_cap is null then new.copy_no:=null;return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('nexus-item:'||new.item_id,0));
 select count(*),coalesce(max(copy_no),0)+1 into v_item_count,next_copy from public.nexus_collectible_claims where item_id=new.item_id;
 if v_item_cap is not null and v_item_count>=v_item_cap then raise exception 'collectible_supply_exhausted';end if;
 new.copy_no:=next_copy;return new;
end$$;

create or replace function public.threeb_rarity_supply_status()
returns table(rarity text,supply_cap integer,minted bigint,remaining bigint)
language sql stable security definer set search_path=public as $$
 select r.rarity,r.supply_cap,count(ii.id)::bigint,
  case when r.supply_cap is null then null::bigint else greatest(0,r.supply_cap-count(ii.id))::bigint end
 from public.nexus_rarity_config r
 left join public.inventory_items d on d.rarity=r.rarity
 left join public.item_instances ii on ii.item_code=d.code
 group by r.rarity,r.supply_cap,r.weight_per_billion
 order by r.weight_per_billion desc;
$$;
revoke all on function public.threeb_rarity_supply_status() from public,anon;
grant execute on function public.threeb_rarity_supply_status() to authenticated,service_role;
