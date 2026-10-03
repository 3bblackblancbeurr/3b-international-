begin;
-- Mobility must use the roads the player can actually see and build.
do $mobility$
declare original text;legacy text;
begin
 original:=pg_get_functiondef('public.nexus_city_life_metrics(uuid,integer,text)'::regprocedure);
 legacy:=$old$close_road:=(abs(px)<=14 and abs(pz)<=half*.82+14) or (abs(pz)<=14 and abs(px)<=half*.82+14)
   or abs(sqrt(px*px+pz*pz)-half*.24)<=14 or abs(sqrt(px*px+pz*pz)-half*.47)<=14 or abs(sqrt(px*px+pz*pz)-half*.72)<=14;$old$;
 if position(legacy in original)=0 then raise exception 'Unexpected mobility implementation';end if;
 execute replace(original,legacy,'close_road:=false;');
end $mobility$;
commit;
