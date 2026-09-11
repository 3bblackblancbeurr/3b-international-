-- Transactional verification of the existing account rewards and campaign storage.
-- No fixture account, balance, ledger entry or save is retained.
begin;
select set_config('testmaze.uid',gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('testmaze.uid')::uuid,'maze-'||current_setting('testmaze.uid')||'@example.invalid');
insert into public.member_profiles(user_id,handle,name,country,recovery_hash) values(current_setting('testmaze.uid')::uuid,'maze-'||left(current_setting('testmaze.uid'),16),'Test Labyrinthe','France',repeat('0',64));
select set_config('testmaze.run',public.loyalty_start_game(current_setting('testmaze.uid')::uuid,'maze')::text,true);
do $$
declare reward jsonb; balance record; seconds_before integer;
begin
 for n in 1..4 loop
  update public.member_game_runs set last_beat=now()-interval '15 seconds' where id=current_setting('testmaze.run')::uuid;
  perform public.loyalty_game_beat(current_setting('testmaze.uid')::uuid,current_setting('testmaze.run')::uuid,n);
 end loop;
 select xp,points into balance from public.member_profiles where user_id=current_setting('testmaze.uid')::uuid;
 if balance.xp<>20 or balance.points<>1 then raise exception 'Minute reward mismatch';end if;
 reward=public.loyalty_game_beat(current_setting('testmaze.uid')::uuid,current_setting('testmaze.run')::uuid,4);
 if reward<>jsonb_build_object('xp',0,'points',0) then raise exception 'Duplicate credited';end if;
 select active_seconds into seconds_before from public.member_game_runs where id=current_setting('testmaze.run')::uuid;
 update public.member_game_runs set last_beat=now()-interval '2 minutes' where id=current_setting('testmaze.run')::uuid;
 reward=public.loyalty_game_beat(current_setting('testmaze.uid')::uuid,current_setting('testmaze.run')::uuid,5);
 if reward<>jsonb_build_object('xp',0,'points',0) or (select active_seconds from public.member_game_runs where id=current_setting('testmaze.run')::uuid)<>seconds_before then raise exception 'Inactive gap credited';end if;
 if has_function_privilege('authenticated','public.loyalty_game_beat(uuid,uuid,integer)','execute') or has_column_privilege('authenticated','public.member_profiles','xp','update') then raise exception 'Client can forge XP';end if;
end $$;
insert into public.member_game_saves(user_id,data) values(current_setting('testmaze.uid')::uuid,'{"version":1,"records":{},"maze":{"version":1,"selected":2,"completed":[1],"best":{"1":{"stars":3,"score":1200,"time":45}}}}');
select jsonb_build_object('minute_xp',p.xp,'minute_points',p.points,'campaign_selected',s.data->'maze'->'selected','campaign_completed',s.data->'maze'->'completed','duplicate','rejected','inactive_gap','not_credited','direct_balance_write','denied','fixtures','rolled_back') as result from public.member_profiles p join public.member_game_saves s on s.user_id=p.user_id where p.user_id=current_setting('testmaze.uid')::uuid;
rollback;
