
alter table public.member_game_runs
  drop constraint if exists member_game_runs_game_check;

alter table public.member_game_runs
  add constraint member_game_runs_game_check
  check (game = any(array[
    'arena'::text,'tower'::text,'maze'::text,'refuge'::text,
    'cities'::text,'world'::text,'penalty-rush'::text
  ]));

create or replace function public.loyalty_game_beat(
  p_user uuid,
  p_run uuid,
  p_seq integer
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  r public.member_game_runs;
  seconds integer;
  new_seconds integer;
  x integer;
  p integer;
  used_x integer;
  used_p integer;
begin
  perform 1 from public.member_profiles where user_id=p_user for update;

  select * into r
  from public.member_game_runs
  where id=p_run and user_id=p_user
  for update;

  if not found or r.ended then
    raise exception 'Partie expirée';
  end if;

  if p_seq<=r.seq then
    return jsonb_build_object('xp',0,'points',0);
  end if;

  seconds=floor(extract(epoch from now()-r.last_beat));

  if seconds<10 then
    return jsonb_build_object('xp',0,'points',0);
  end if;

  seconds=case when seconds>45 then 0 else least(20,seconds) end;
  new_seconds=r.active_seconds+seconds;

  -- Penalty Rush has its own server-authoritative reward system.
  -- Keep global play-session analytics, but never mint duplicate loyalty rewards here.
  if r.game='penalty-rush' then
    update public.member_game_runs
    set active_seconds=new_seconds,last_beat=now(),seq=p_seq
    where id=p_run;

    return jsonb_build_object(
      'xp',0,
      'points',0,
      'tracked_seconds',new_seconds,
      'reward_source','penalty-rush'
    );
  end if;

  x=(new_seconds/30-r.active_seconds/30)*10;
  p=new_seconds/60-r.active_seconds/60;

  select coalesce(sum(xp),0),coalesce(sum(points),0)
  into used_x,used_p
  from public.member_ledger
  where user_id=p_user
    and source='game'
    and created_at>=((now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris');

  x=greatest(0,least(x,600-used_x));
  p=greatest(0,least(p,20-used_p));

  update public.member_game_runs
  set active_seconds=new_seconds,last_beat=now(),seq=p_seq
  where id=p_run;

  if x>0 or p>0 then
    perform public.loyalty_grant(
      p_user,
      'game:'||p_run||':'||p_seq,
      'game',
      'Temps de jeu · '||r.game,
      x,
      p
    );
  end if;

  return jsonb_build_object('xp',x,'points',p);
end;
$function$;

revoke all on function public.loyalty_game_beat(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.loyalty_game_beat(uuid,uuid,integer) to service_role;
