create or replace function public.penalty_settle_match(
  p_room uuid,p_winner uuid,p_score_a integer,p_score_b integer,p_stats jsonb
)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_room public.penalty_rooms%rowtype;
  v_a uuid; v_b uuid;
  v_ra integer; v_rb integer;
  v_expected_a numeric; v_actual_a numeric;
  v_k integer; v_delta_a integer;
  v_a_stats jsonb; v_b_stats jsonb;
  v_gold boolean; v_rep_a integer:=0; v_rep_b integer:=0;
  v_total_shots integer;
  v_recent_pair_matches integer:=0;
  v_stat_eligible boolean:=false;
  v_reward_eligible boolean:=false;
begin
  select * into v_room from public.penalty_rooms where id=p_room for update;
  if not found then raise exception 'Penalty room not found'; end if;
  if v_room.status<>'finished' or v_room.settled_at is not null then return false; end if;
  if cardinality(v_room.member_ids)<>2 then raise exception 'Penalty room requires exactly two members'; end if;
  if p_stats is null or jsonb_typeof(p_stats)<>'array' then raise exception 'Invalid penalty stats'; end if;

  v_a:=v_room.member_ids[1]; v_b:=v_room.member_ids[2];
  if p_winner is not null and p_winner<>v_a and p_winner<>v_b then raise exception 'Invalid winner'; end if;
  if p_score_a<0 or p_score_b<0 or p_score_a>100 or p_score_b>100 then raise exception 'Invalid score'; end if;

  v_a_stats:=coalesce(p_stats->0,'{}'::jsonb);
  v_b_stats:=coalesce(p_stats->1,'{}'::jsonb);
  v_gold:=coalesce((v_a_stats->>'goldenGoals')::integer,0)+coalesce((v_b_stats->>'goldenGoals')::integer,0)>0;
  v_total_shots:=coalesce((v_a_stats->>'shots')::integer,0)+coalesce((v_b_stats->>'shots')::integer,0);

  select count(*)::integer into v_recent_pair_matches
  from public.penalty_match_history h
  where h.mode in ('quick','ranked')
    and h.created_at>=now()-interval '24 hours'
    and ((h.player_a=v_a and h.player_b=v_b) or (h.player_a=v_b and h.player_b=v_a));

  v_stat_eligible :=
    v_room.mode='international'
    or (v_room.mode in ('quick','ranked') and v_recent_pair_matches<3);

  if v_stat_eligible then
    insert into public.penalty_ratings(user_id,country_id)
    select v_a,country_id from public.penalty_profiles where user_id=v_a
    on conflict(user_id) do nothing;
    insert into public.penalty_ratings(user_id,country_id)
    select v_b,country_id from public.penalty_profiles where user_id=v_b
    on conflict(user_id) do nothing;

    select rating into v_ra from public.penalty_ratings where user_id=v_a for update;
    select rating into v_rb from public.penalty_ratings where user_id=v_b for update;
    if v_ra is null or v_rb is null then raise exception 'Penalty rating profile missing'; end if;

    v_expected_a:=1.0/(1.0+power(10.0,(v_rb-v_ra)::numeric/400.0));
    v_actual_a:=case when p_winner is null then .5 when p_winner=v_a then 1.0 else 0.0 end;
    v_k:=case when v_room.mode='ranked' then 32 else 0 end;
    v_delta_a:=round(v_k*(v_actual_a-v_expected_a))::integer;

    v_rep_a:=4
      +case when p_winner=v_a then 12 else 0 end
      +case when v_room.mode='ranked' then 4 when v_room.mode='international' then 8 else 0 end
      +least(8,greatest(0,p_score_a)*2);
    v_rep_b:=4
      +case when p_winner=v_b then 12 else 0 end
      +case when v_room.mode='ranked' then 4 when v_room.mode='international' then 8 else 0 end
      +least(8,greatest(0,p_score_b)*2);

    insert into public.penalty_ratings(
      user_id,country_id,rating,games,wins,losses,goals_for,goals_against,saves,duel_gold_wins,duel_gold_played,updated_at
    )
    select v_a,p.country_id,greatest(0,1000+v_delta_a),1,
      case when p_winner=v_a then 1 else 0 end,
      case when p_winner is not null and p_winner<>v_a then 1 else 0 end,
      p_score_a,p_score_b,coalesce((v_a_stats->>'saves')::integer,0),
      case when v_gold and p_winner=v_a then 1 else 0 end,
      case when v_gold then 1 else 0 end,now()
    from public.penalty_profiles p where p.user_id=v_a
    on conflict(user_id) do update set
      country_id=excluded.country_id,rating=greatest(0,public.penalty_ratings.rating+v_delta_a),
      games=public.penalty_ratings.games+1,wins=public.penalty_ratings.wins+excluded.wins,
      losses=public.penalty_ratings.losses+excluded.losses,goals_for=public.penalty_ratings.goals_for+excluded.goals_for,
      goals_against=public.penalty_ratings.goals_against+excluded.goals_against,saves=public.penalty_ratings.saves+excluded.saves,
      duel_gold_wins=public.penalty_ratings.duel_gold_wins+excluded.duel_gold_wins,
      duel_gold_played=public.penalty_ratings.duel_gold_played+excluded.duel_gold_played,updated_at=now();

    insert into public.penalty_ratings(
      user_id,country_id,rating,games,wins,losses,goals_for,goals_against,saves,duel_gold_wins,duel_gold_played,updated_at
    )
    select v_b,p.country_id,greatest(0,1000-v_delta_a),1,
      case when p_winner=v_b then 1 else 0 end,
      case when p_winner is not null and p_winner<>v_b then 1 else 0 end,
      p_score_b,p_score_a,coalesce((v_b_stats->>'saves')::integer,0),
      case when v_gold and p_winner=v_b then 1 else 0 end,
      case when v_gold then 1 else 0 end,now()
    from public.penalty_profiles p where p.user_id=v_b
    on conflict(user_id) do update set
      country_id=excluded.country_id,rating=greatest(0,public.penalty_ratings.rating-v_delta_a),
      games=public.penalty_ratings.games+1,wins=public.penalty_ratings.wins+excluded.wins,
      losses=public.penalty_ratings.losses+excluded.losses,goals_for=public.penalty_ratings.goals_for+excluded.goals_for,
      goals_against=public.penalty_ratings.goals_against+excluded.goals_against,saves=public.penalty_ratings.saves+excluded.saves,
      duel_gold_wins=public.penalty_ratings.duel_gold_wins+excluded.duel_gold_wins,
      duel_gold_played=public.penalty_ratings.duel_gold_played+excluded.duel_gold_played,updated_at=now();

    update public.penalty_profiles set reputation=reputation+v_rep_a,updated_at=now() where user_id=v_a;
    update public.penalty_profiles set reputation=reputation+v_rep_b,updated_at=now() where user_id=v_b;
  end if;

  insert into public.penalty_match_history(room_id,mode,player_a,player_b,winner_user_id,score_a,score_b,stats)
  values(p_room,v_room.mode,v_a,v_b,p_winner,p_score_a,p_score_b,coalesce(p_stats,'[]'::jsonb))
  on conflict(room_id) do nothing;

  v_reward_eligible:=
    v_room.mode in ('quick','ranked')
    and v_total_shots>=4
    and v_recent_pair_matches<3
    and coalesce(v_room.state->'lastEvent'->>'type','')<>'forfeit';

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

  update public.penalty_rooms set settled_at=now(),updated_at=now() where id=p_room;
  return true;
end;
$$;

create or replace function public.penalty_competitive_history_settle()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_room public.penalty_rooms%rowtype;
  v_season public.penalty_ranked_seasons%rowtype;
  v_a public.penalty_ranked_stats%rowtype;
  v_b public.penalty_ranked_stats%rowtype;
  v_expected_a numeric; v_actual_a numeric;
  v_k integer; v_delta integer;
  v_forfeit boolean; v_loser uuid;
  v_selected_a boolean; v_selected_b boolean;
  v_pair_count integer:=0;
  v_counted boolean:=true;
begin
  select * into v_room from public.penalty_rooms where id=new.room_id;
  if not found then return new; end if;

  if new.mode='ranked' and v_room.ranked_season_id is not null then
    select * into v_season from public.penalty_ranked_seasons
      where id=v_room.ranked_season_id and status in ('active','closed');

    if found then
      select count(*)::integer into v_pair_count
      from public.penalty_match_history h
      where h.mode='ranked'
        and h.created_at>=now()-interval '24 hours'
        and ((h.player_a=new.player_a and h.player_b=new.player_b)
          or (h.player_a=new.player_b and h.player_b=new.player_a));
      v_counted:=v_pair_count<=3;

      insert into public.penalty_ranked_stats(season_id,user_id,country_id)
      select v_season.id,new.player_a,p.country_id from public.penalty_profiles p where p.user_id=new.player_a
      on conflict(season_id,user_id) do nothing;
      insert into public.penalty_ranked_stats(season_id,user_id,country_id)
      select v_season.id,new.player_b,p.country_id from public.penalty_profiles p where p.user_id=new.player_b
      on conflict(season_id,user_id) do nothing;

      select * into v_a from public.penalty_ranked_stats where season_id=v_season.id and user_id=new.player_a for update;
      select * into v_b from public.penalty_ranked_stats where season_id=v_season.id and user_id=new.player_b for update;

      v_expected_a:=1.0/(1.0+power(10.0,(v_b.rating-v_a.rating)::numeric/400.0));
      v_actual_a:=case when new.winner_user_id is null then .5 when new.winner_user_id=new.player_a then 1.0 else 0.0 end;
      v_k:=case when v_counted and least(v_a.games,v_b.games)<v_season.placement_matches then 40
                when v_counted then 28 else 0 end;
      v_delta:=round(v_k*(v_actual_a-v_expected_a))::integer;
      v_forfeit:=coalesce(v_room.state->'lastEvent'->>'type','')='forfeit';
      v_loser:=case when new.winner_user_id=new.player_a then new.player_b when new.winner_user_id=new.player_b then new.player_a else null end;

      update public.penalty_ranked_stats set
        rating=greatest(0,rating+v_delta),
        games=games+case when v_counted then 1 else 0 end,
        wins=wins+case when v_counted and new.winner_user_id=new.player_a then 1 else 0 end,
        losses=losses+case when v_counted and new.winner_user_id=new.player_b then 1 else 0 end,
        streak=case when not v_counted then streak when new.winner_user_id=new.player_a then streak+1 else 0 end,
        best_rating=greatest(best_rating,greatest(0,rating+v_delta)),
        forfeits=forfeits+case when v_forfeit and v_loser=new.player_a then 1 else 0 end,
        country_id=(select p.country_id from public.penalty_profiles p where p.user_id=new.player_a),
        updated_at=now()
      where season_id=v_season.id and user_id=new.player_a;

      update public.penalty_ranked_stats set
        rating=greatest(0,rating-v_delta),
        games=games+case when v_counted then 1 else 0 end,
        wins=wins+case when v_counted and new.winner_user_id=new.player_b then 1 else 0 end,
        losses=losses+case when v_counted and new.winner_user_id=new.player_a then 1 else 0 end,
        streak=case when not v_counted then streak when new.winner_user_id=new.player_b then streak+1 else 0 end,
        best_rating=greatest(best_rating,greatest(0,rating-v_delta)),
        forfeits=forfeits+case when v_forfeit and v_loser=new.player_b then 1 else 0 end,
        country_id=(select p.country_id from public.penalty_profiles p where p.user_id=new.player_b),
        updated_at=now()
      where season_id=v_season.id and user_id=new.player_b;

      update public.penalty_match_history set ranked_season_id=v_season.id where id=new.id;
    end if;
  end if;

  if new.mode='international' and v_room.international_window_id is not null then
    select exists(select 1 from public.penalty_international_selections s
      where s.window_id=v_room.international_window_id and s.user_id=new.player_a and s.status='selected') into v_selected_a;
    select exists(select 1 from public.penalty_international_selections s
      where s.window_id=v_room.international_window_id and s.user_id=new.player_b and s.status='selected') into v_selected_b;
    if v_selected_a and v_selected_b then
      update public.penalty_profiles set international_caps=international_caps+1,
        international_goals=international_goals+new.score_a,updated_at=now() where user_id=new.player_a;
      update public.penalty_profiles set international_caps=international_caps+1,
        international_goals=international_goals+new.score_b,updated_at=now() where user_id=new.player_b;
      update public.penalty_match_history set international_window_id=v_room.international_window_id where id=new.id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.penalty_player_progression_settle()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_a_stats jsonb:=coalesce(new.stats->0,'{}'::jsonb);
  v_b_stats jsonb:=coalesce(new.stats->1,'{}'::jsonb);
  v_base integer;
  v_a_gain integer; v_b_gain integer;
  v_pair_count integer:=0;
begin
  v_base:=case new.mode
    when 'international' then 55
    when 'ranked' then 40
    when 'quick' then 20
    else 0
  end;
  if v_base<=0 then return new; end if;

  if new.mode in ('quick','ranked') then
    select count(*)::integer into v_pair_count
    from public.penalty_match_history h
    where h.mode in ('quick','ranked')
      and h.created_at>=now()-interval '24 hours'
      and ((h.player_a=new.player_a and h.player_b=new.player_b)
        or (h.player_a=new.player_b and h.player_b=new.player_a));
    if v_pair_count>3 then return new; end if;
  end if;

  v_a_gain:=v_base+least(15,coalesce((v_a_stats->>'goals')::integer,0)*4+coalesce((v_a_stats->>'saves')::integer,0)*2)
    +case when new.winner_user_id=new.player_a then 10 else 0 end;
  v_b_gain:=v_base+least(15,coalesce((v_b_stats->>'goals')::integer,0)*4+coalesce((v_b_stats->>'saves')::integer,0)*2)
    +case when new.winner_user_id=new.player_b then 10 else 0 end;

  update public.penalty_profiles set
    archetype_xp=archetype_xp+v_a_gain,
    archetype_level=least(50,1+floor(sqrt((archetype_xp+v_a_gain)::numeric/35.0))::integer),
    updated_at=now()
  where user_id=new.player_a;

  update public.penalty_profiles set
    archetype_xp=archetype_xp+v_b_gain,
    archetype_level=least(50,1+floor(sqrt((archetype_xp+v_b_gain)::numeric/35.0))::integer),
    updated_at=now()
  where user_id=new.player_b;
  return new;
end;
$$;

revoke all on function public.penalty_player_progression_settle() from public,anon,authenticated;
