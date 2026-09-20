insert into public.threeb_level_curve(level,xp_required,curve_version)
select level,
       case when level=1 then 0
            else round(50 * power((level-1)::numeric,1.82))::bigint
       end,
       'global-150-v2-candidate'
from generate_series(1,150) level
on conflict(curve_version,level) do update
set xp_required=excluded.xp_required;
