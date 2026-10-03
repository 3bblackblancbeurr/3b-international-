-- New construction parcels have readable, type-specific proportions.
-- Saved placements retain their recorded dimensions, including when moved.
update public.nexus_city_buildings
set footprint = case
 when code='CITY_HALL_3B' then '{"w":12,"h":10}'::jsonb
 when code='HOME_ORIGIN' then '{"w":6,"h":5}'::jsonb
 when code like '%SCHOOL%' or code like '%CLINIC%' then '{"w":8,"h":6}'::jsonb
 else jsonb_build_object(
  'w',least(20,greatest(6,coalesce((footprint->>'w')::integer,1)*2)),
  'h',least(20,greatest(5,coalesce((footprint->>'h')::integer,1)*2)))
 end,
 metadata=coalesce(metadata,'{}'::jsonb)||'{"architectural_scale_version":2}'::jsonb
where category in ('home','shop','community','culture','sport','monument')
 and coalesce(metadata->>'architectural_scale_version','1')<>'2';
