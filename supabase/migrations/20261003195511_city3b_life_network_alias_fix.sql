begin;
-- The former JSON alias `n` collided with the PL/pgSQL needs record before
-- that record was assigned. Any finished building could break the life view.
do $patch$ declare body text;begin
 body:=pg_get_functiondef('public.nexus_city_life_metrics(uuid,integer,text)'::regprocedure);
 if position('jsonb_agg(n.value)' in body)=0 or position(' n where n.value' in body)=0 then raise exception 'Review life network aliases before applying';end if;
 body:=replace(body,'jsonb_agg(n.value)','jsonb_agg(network_feature.value)');
 body:=replace(body,' n where n.value',' network_feature where network_feature.value');
 execute body;
end $patch$;
notify pgrst,'reload schema';
commit;
