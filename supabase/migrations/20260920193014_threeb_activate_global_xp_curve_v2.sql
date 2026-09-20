create or replace function public.threeb_level_curve_valid(p_version text)
returns boolean
language sql
stable
set search_path=''
as $$
  with ordered as (
    select
      level,
      xp_required,
      lag(xp_required) over(order by level) as previous_xp
    from public.threeb_level_curve
    where curve_version=p_version
  )
  select
    count(*)=150
    and min(level)=1
    and max(level)=150
    and min(xp_required) filter(where level=1)=0
    and bool_and(
      case when level=1 then xp_required=0
           else previous_xp is not null and xp_required>previous_xp
      end
    )
  from ordered;
$$;

revoke all on function public.threeb_level_curve_valid(text)
from public,anon,authenticated;
grant execute on function public.threeb_level_curve_valid(text)
to service_role;

create or replace function public.threeb_xp_curve_flag_guard()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if new.xp_curve_version is distinct from old.xp_curve_version then
    if not public.threeb_level_curve_valid(new.xp_curve_version) then
      raise exception 'invalid_xp_curve_version';
    end if;
  end if;
  return new;
end
$$;

revoke all on function public.threeb_xp_curve_flag_guard()
from public,anon,authenticated,service_role;

drop trigger if exists threeb_xp_curve_flag_guard
on public.threeb_economy_flags;

create trigger threeb_xp_curve_flag_guard
before update of xp_curve_version
on public.threeb_economy_flags
for each row
execute function public.threeb_xp_curve_flag_guard();

insert into public.threeb_level_curve(level,xp_required,curve_version)
select level,xp_required,'global-150-v2'
from public.threeb_level_curve
where curve_version='global-150-v2-candidate'
on conflict(curve_version,level) do update
set xp_required=excluded.xp_required;

do $$
begin
  if not public.threeb_level_curve_valid('global-150-v2') then
    raise exception 'global_150_v2_invalid';
  end if;
end
$$;

-- The active runtime no longer calls this service-only legacy purchase RPC.
revoke execute on function public.nexus_purchase_and_place_building(
  text,integer,integer,smallint,uuid
) from service_role;

comment on function public.nexus_purchase_and_place_building(
  text,integer,integer,smallint,uuid
) is 'Deprecated legacy City purchase path. Runtime uses nexus_city_place_v2.';

update public.threeb_economy_flags
set xp_curve_version='global-150-v2',
    economy_version='2026.2',
    updated_at=now()
where singleton=true;
