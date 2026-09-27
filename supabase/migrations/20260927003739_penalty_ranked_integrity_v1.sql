create table public.penalty_season_ratings (
 season_id text not null check (season_id ~ '^[0-9]{4}-[0-9]{2}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 rating integer not null default 1000 check (rating>=0),
 games integer not null default 0 check (games>=0),
 wins integer not null default 0 check (wins>=0),
 losses integer not null default 0 check (losses>=0),
 updated_at timestamptz not null default now(),
 primary key(season_id,user_id)
);
alter table public.penalty_season_ratings enable row level security;
revoke all on public.penalty_season_ratings from public, anon, authenticated;
grant all on public.penalty_season_ratings to service_role;
create index penalty_season_ranking_idx on public.penalty_season_ratings(season_id,rating desc,games desc);

-- Only eligible ranked matches affect rating, reputation and national scouting.
CREATE OR REPLACE FUNCTION public.penalty_settle_match(p_room uuid, p_winner uuid, p_score_a integer, p_score_b integer, p_stats jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_recent_pair_matches integer := 0;
  v_reward_eligible boolean;
  v_competitive boolean;
  v_season text;
  v_sa integer;
  v_sb integer;
  v_season_delta integer;
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

  -- Stable lock ordering serializes shared players and prevents reverse-pair deadlocks.
  perform 1 from public.penalty_ratings where user_id in (v_a,v_b) order by user_id for update;
  select count(*)::integer into v_recent_pair_matches
  from public.penalty_match_history h
  where h.mode='ranked' and h.created_at >= now()-interval '24 hours'
    and ((h.player_a=v_a and h.player_b=v_b) or (h.player_a=v_b and h.player_b=v_a));
  v_competitive := v_room.mode='ranked' and v_recent_pair_matches < 3;

  select rating into v_ra from public.penalty_ratings where user_id=v_a for update;
  select rating into v_rb from public.penalty_ratings where user_id=v_b for update;

  if v_ra is null or v_rb is null then
    raise exception 'Penalty rating profile missing';
  end if;

  v_expected_a := 1.0 / (1.0 + power(10.0, (v_rb-v_ra)::numeric / 400.0));
  v_actual_a := case when p_winner is null then 0.5 when p_winner=v_a then 1.0 else 0.0 end;
  v_k := case when v_competitive then 32 else 0 end;
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

  if v_competitive then
  -- Attribute the result to the UTC month when the match started.
  v_season := to_char(coalesce(v_room.started_at,v_room.created_at) at time zone 'UTC','YYYY-MM');
  insert into public.penalty_season_ratings(season_id,user_id)
  values(v_season,v_a),(v_season,v_b) on conflict do nothing;
  perform 1 from public.penalty_season_ratings where season_id=v_season and user_id in (v_a,v_b) order by user_id for update;
  select rating into v_sa from public.penalty_season_ratings where season_id=v_season and user_id=v_a;
  select rating into v_sb from public.penalty_season_ratings where season_id=v_season and user_id=v_b;
  v_season_delta := round(32*(v_actual_a-1.0/(1.0+power(10.0,(v_sb-v_sa)::numeric/400.0))))::integer;
  update public.penalty_season_ratings set
    rating=greatest(0,rating+case when user_id=v_a then v_season_delta else -v_season_delta end),
    games=games+1,
    wins=wins+case when user_id=p_winner then 1 else 0 end,
    losses=losses+case when p_winner is not null and user_id<>p_winner then 1 else 0 end,
    updated_at=now()
  where season_id=v_season and user_id in (v_a,v_b);

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

  end if;

  insert into public.penalty_match_history(room_id,mode,player_a,player_b,winner_user_id,score_a,score_b,stats)
  values(p_room,v_room.mode,v_a,v_b,p_winner,p_score_a,p_score_b,coalesce(p_stats,'[]'::jsonb))
  on conflict(room_id) do nothing;

  -- Economy rewards: private friend rooms never mint XP/Coins.
  -- Quick/ranked rewards are server-earned, require real play and are capped per opponent pair.
  select count(*)::integer into v_recent_pair_matches
  from public.penalty_match_history h
  where h.room_id <> p_room
    and h.mode in ('quick','ranked')
    and h.created_at >= now() - interval '24 hours'
    and (
      (h.player_a=v_a and h.player_b=v_b)
      or
      (h.player_a=v_b and h.player_b=v_a)
    );

  v_reward_eligible :=
    v_room.mode in ('quick','ranked')
    and v_total_shots >= 4
    and v_recent_pair_matches < 3
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
$function$
;