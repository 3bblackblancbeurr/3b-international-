
-- Penalty Rush: economy rewards + private realtime room signals.

insert into public.reward_definitions(code,label,xp,coins,active,repeatable)
values
  ('penalty_match','Penalty Rush · Duel validé',12,2,true,true),
  ('penalty_win','Penalty Rush · Victoire',30,5,true,true),
  ('penalty_gold','Penalty Rush · Duel d’Or gagné',8,1,true,true)
on conflict(code) do update set
  label=excluded.label,
  xp=excluded.xp,
  coins=excluded.coins,
  active=excluded.active,
  repeatable=excluded.repeatable;

insert into public.threeb_reward_policy(
  reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,
  cooldown_seconds,diminishing,min_global_level,sensitive,active,max_events_lifetime,updated_at
)
values
  ('penalty_match','2026.2',8,96,16,90,'[1,1,0.75,0.5,0.25,0.1,0,0]'::jsonb,1,false,true,null,now()),
  ('penalty_win','2026.2',5,150,25,180,'[1,0.8,0.6,0.4,0.3]'::jsonb,1,false,true,null,now()),
  ('penalty_gold','2026.2',5,40,5,240,'[1,0.8,0.5,0.25,0]'::jsonb,1,false,true,null,now())
on conflict(reward_code) do update set
  policy_version=excluded.policy_version,
  max_events_per_day=excluded.max_events_per_day,
  daily_xp_cap=excluded.daily_xp_cap,
  daily_coins_cap=excluded.daily_coins_cap,
  cooldown_seconds=excluded.cooldown_seconds,
  diminishing=excluded.diminishing,
  min_global_level=excluded.min_global_level,
  sensitive=excluded.sensitive,
  active=excluded.active,
  max_events_lifetime=excluded.max_events_lifetime,
  updated_at=now();

create or replace function public.penalty_settle_match(
  p_room uuid,
  p_winner uuid,
  p_score_a integer,
  p_score_b integer,
  p_stats jsonb
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_room public.penalty_rooms%rowtype;
  v_a uuid;
  v_b uuid;
  v_ra integer;
  v_rb integer;
  v_expected_a numeric;
  v_actual_a numeric;
  v_k integer;
  v_delta_a integer;
  v_a_stats jsonb;
  v_b_stats jsonb;
  v_gold boolean;
  v_rep_a integer;
  v_rep_b integer;
  v_total_shots integer;
  v_reward_eligible boolean;
begin
  select * into v_room
  from public.penalty_rooms
  where id=p_room
  for update;

  if not found then
    raise exception 'Penalty room not found';
  end if;

  if v_room.status <> 'finished' or v_room.settled_at is not null then
    return false;
  end if;

  if cardinality(v_room.member_ids) <> 2 then
    raise exception 'Penalty room requires exactly two members';
  end if;

  if p_stats is null or jsonb_typeof(p_stats) <> 'array' then
    raise exception 'Invalid penalty stats';
  end if;

  v_a := v_room.member_ids[1];
  v_b := v_room.member_ids[2];

  if p_winner is not null and p_winner <> v_a and p_winner <> v_b then
    raise exception 'Invalid winner';
  end if;

  if p_score_a < 0 or p_score_b < 0 or p_score_a > 100 or p_score_b > 100 then
    raise exception 'Invalid score';
  end if;

  insert into public.penalty_ratings(user_id,country_id)
  select v_a,country_id from public.penalty_profiles where user_id=v_a
  on conflict(user_id) do nothing;

  insert into public.penalty_ratings(user_id,country_id)
  select v_b,country_id from public.penalty_profiles where user_id=v_b
  on conflict(user_id) do nothing;

  select rating into v_ra from public.penalty_ratings where user_id=v_a for update;
  select rating into v_rb from public.penalty_ratings where user_id=v_b for update;

  if v_ra is null or v_rb is null then
    raise exception 'Penalty rating profile missing';
  end if;

  v_expected_a := 1.0 / (1.0 + power(10.0, (v_rb-v_ra)::numeric / 400.0));
  v_actual_a := case when p_winner is null then 0.5 when p_winner=v_a then 1.0 else 0.0 end;
  v_k := case when v_room.mode='ranked' then 32 else 0 end;
  v_delta_a := round(v_k * (v_actual_a-v_expected_a))::integer;

  v_a_stats := coalesce(p_stats->0,'{}'::jsonb);
  v_b_stats := coalesce(p_stats->1,'{}'::jsonb);
  v_gold := coalesce((v_a_stats->>'goldenGoals')::integer,0)
          + coalesce((v_b_stats->>'goldenGoals')::integer,0) > 0;
  v_total_shots := coalesce((v_a_stats->>'shots')::integer,0)
                 + coalesce((v_b_stats->>'shots')::integer,0);

  v_rep_a :=
    4
    + case when p_winner=v_a then 12 else 0 end
    + case when v_room.mode='ranked' then 4 else 0 end
    + least(8,greatest(0,p_score_a)*2);

  v_rep_b :=
    4
    + case when p_winner=v_b then 12 else 0 end
    + case when v_room.mode='ranked' then 4 else 0 end
    + least(8,greatest(0,p_score_b)*2);

  insert into public.penalty_ratings(
    user_id,country_id,rating,games,wins,losses,goals_for,goals_against,saves,duel_gold_wins,duel_gold_played,updated_at
  )
  select
    v_a,p.country_id,greatest(0,1000+v_delta_a),1,
    case when p_winner=v_a then 1 else 0 end,
    case when p_winner is not null and p_winner<>v_a then 1 else 0 end,
    p_score_a,p_score_b,coalesce((v_a_stats->>'saves')::integer,0),
    case when v_gold and p_winner=v_a then 1 else 0 end,
    case when v_gold then 1 else 0 end,
    now()
  from public.penalty_profiles p where p.user_id=v_a
  on conflict(user_id) do update set
    country_id=excluded.country_id,
    rating=greatest(0,public.penalty_ratings.rating+v_delta_a),
    games=public.penalty_ratings.games+1,
    wins=public.penalty_ratings.wins+excluded.wins,
    losses=public.penalty_ratings.losses+excluded.losses,
    goals_for=public.penalty_ratings.goals_for+excluded.goals_for,
    goals_against=public.penalty_ratings.goals_against+excluded.goals_against,
    saves=public.penalty_ratings.saves+excluded.saves,
    duel_gold_wins=public.penalty_ratings.duel_gold_wins+excluded.duel_gold_wins,
    duel_gold_played=public.penalty_ratings.duel_gold_played+excluded.duel_gold_played,
    updated_at=now();

  insert into public.penalty_ratings(
    user_id,country_id,rating,games,wins,losses,goals_for,goals_against,saves,duel_gold_wins,duel_gold_played,updated_at
  )
  select
    v_b,p.country_id,greatest(0,1000-v_delta_a),1,
    case when p_winner=v_b then 1 else 0 end,
    case when p_winner is not null and p_winner<>v_b then 1 else 0 end,
    p_score_b,p_score_a,coalesce((v_b_stats->>'saves')::integer,0),
    case when v_gold and p_winner=v_b then 1 else 0 end,
    case when v_gold then 1 else 0 end,
    now()
  from public.penalty_profiles p where p.user_id=v_b
  on conflict(user_id) do update set
    country_id=excluded.country_id,
    rating=greatest(0,public.penalty_ratings.rating-v_delta_a),
    games=public.penalty_ratings.games+1,
    wins=public.penalty_ratings.wins+excluded.wins,
    losses=public.penalty_ratings.losses+excluded.losses,
    goals_for=public.penalty_ratings.goals_for+excluded.goals_for,
    goals_against=public.penalty_ratings.goals_against+excluded.goals_against,
    saves=public.penalty_ratings.saves+excluded.saves,
    duel_gold_wins=public.penalty_ratings.duel_gold_wins+excluded.duel_gold_wins,
    duel_gold_played=public.penalty_ratings.duel_gold_played+excluded.duel_gold_played,
    updated_at=now();

  update public.penalty_profiles
  set reputation=reputation+v_rep_a, updated_at=now()
  where user_id=v_a;

  update public.penalty_profiles
  set reputation=reputation+v_rep_b, updated_at=now()
  where user_id=v_b;

  insert into public.penalty_match_history(room_id,mode,player_a,player_b,winner_user_id,score_a,score_b,stats)
  values(p_room,v_room.mode,v_a,v_b,p_winner,p_score_a,p_score_b,coalesce(p_stats,'[]'::jsonb))
  on conflict(room_id) do nothing;

  -- Economy rewards: public/private friend rooms never mint XP/Coins.
  -- A completed quick/ranked match needs at least four real shots and must not be a forfeit.
  v_reward_eligible :=
    v_room.mode in ('quick','ranked')
    and v_total_shots >= 4
    and coalesce(v_room.state->'lastEvent'->>'type','') <> 'forfeit';

  if v_reward_eligible then
    insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
    values
      (v_a,'penalty_match','penalty:'||p_room::text||':match:'||v_a::text,'penalty-rush'),
      (v_b,'penalty_match','penalty:'||p_room::text||':match:'||v_b::text,'penalty-rush')
    on conflict(user_id,reward_code,event_id) do nothing;

    if p_winner is not null then
      insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
      values(p_winner,'penalty_win','penalty:'||p_room::text||':win:'||p_winner::text,'penalty-rush')
      on conflict(user_id,reward_code,event_id) do nothing;

      if v_gold then
        insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
        values(p_winner,'penalty_gold','penalty:'||p_room::text||':gold:'||p_winner::text,'penalty-rush')
        on conflict(user_id,reward_code,event_id) do nothing;
      end if;
    end if;
  end if;

  update public.penalty_rooms
  set settled_at=now(),updated_at=now()
  where id=p_room;

  return true;
end;
$function$;

revoke all on function public.penalty_settle_match(uuid,uuid,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.penalty_settle_match(uuid,uuid,integer,integer,jsonb) to service_role;

create or replace function public.penalty_broadcast_room_changes()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  perform realtime.send(
    jsonb_build_object(
      'roomId',new.id,
      'revision',new.revision,
      'status',new.status
    ),
    'room_updated',
    'penalty:'||new.id::text,
    true
  );
  return new;
end;
$function$;

revoke all on function public.penalty_broadcast_room_changes() from public, anon, authenticated;
grant execute on function public.penalty_broadcast_room_changes() to service_role;

drop trigger if exists penalty_rooms_realtime_broadcast on public.penalty_rooms;
create trigger penalty_rooms_realtime_broadcast
after insert or update of revision,status on public.penalty_rooms
for each row execute function public.penalty_broadcast_room_changes();

drop policy if exists penalty_room_broadcast_receive on realtime.messages;
create policy penalty_room_broadcast_receive
on realtime.messages
for select
to authenticated
using (
  extension='broadcast'
  and split_part((select realtime.topic()),':',1)='penalty'
  and exists (
    select 1
    from public.penalty_rooms r
    where r.id::text=split_part((select realtime.topic()),':',2)
      and (select auth.uid())=any(r.member_ids)
  )
);
