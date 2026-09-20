do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='nexus_city_place_v2'
  limit 1;
  if d is null then raise exception 'nexus_city_place_v2 introuvable'; end if;
  d:=replace(d,'least(20,','least(64,');
  execute d;

  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='nexus_city_move_v2'
  limit 1;
  if d is null then raise exception 'nexus_city_move_v2 introuvable'; end if;
  d:=replace(d,'least(20,','least(64,');
  execute d;
end $$;
