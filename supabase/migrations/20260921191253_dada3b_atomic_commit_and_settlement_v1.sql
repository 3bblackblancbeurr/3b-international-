alter table public.dada_rooms
add column settled_at timestamptz;

create or replace function public.dada3b_commit_room(
  p_room uuid,
  p_revision bigint,
  p_players jsonb,
  p_spectators jsonb,
  p_member_ids uuid[],
  p_state jsonb,
  p_status text,
  p_turn_deadline timestamptz,
  p_winner uuid,
  p_event_kind text,
  p_event_payload jsonb,
  p_actor uuid,
  p_started_at timestamptz default null,
  p_finished_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns bigint
language plpgsql
security invoker
set search_path to ''
as $$
declare
  room public.dada_rooms;
  next_revision bigint;
begin
  if p_room is null
     or p_revision is null
     or p_revision < 0
     or p_status not in ('waiting','active','finished','cancelled')
     or p_event_kind is null
     or p_event_kind !~ '^[a-z0-9_-]{2,40}$'
     or p_players is null
     or jsonb_typeof(p_players) <> 'array'
     or jsonb_array_length(p_players) > 8
     or p_spectators is null
     or jsonb_typeof(p_spectators) <> 'array'
     or jsonb_array_length(p_spectators) > 8
     or p_member_ids is null
     or cardinality(p_member_ids) > 16
     or p_event_payload is null
     or jsonb_typeof(p_event_payload) <> 'object'
  then
    raise exception 'invalid_dada_commit';
  end if;

  select * into room
  from public.dada_rooms
  where id=p_room
  for update;

  if room.id is null or room.revision <> p_revision then
    return null;
  end if;

  next_revision := room.revision + 1;

  update public.dada_rooms
  set players=p_players,
      spectators=p_spectators,
      member_ids=p_member_ids,
      state=p_state,
      status=p_status,
      revision=next_revision,
      turn_deadline=p_turn_deadline,
      winner_user_id=p_winner,
      started_at=coalesce(p_started_at,started_at),
      finished_at=case when p_status='finished' then coalesce(p_finished_at,finished_at,now()) else finished_at end,
      expires_at=coalesce(p_expires_at,expires_at),
      updated_at=now()
  where id=p_room;

  insert into public.dada_room_events(room_id,revision,actor_user_id,kind,payload)
  values(p_room,next_revision,p_actor,p_event_kind,p_event_payload);

  return next_revision;
end
$$;

revoke all on function public.dada3b_commit_room(
  uuid,bigint,jsonb,jsonb,uuid[],jsonb,text,timestamptz,uuid,text,jsonb,uuid,timestamptz,timestamptz,timestamptz
) from public,anon,authenticated;
grant execute on function public.dada3b_commit_room(
  uuid,bigint,jsonb,jsonb,uuid[],jsonb,text,timestamptz,uuid,text,jsonb,uuid,timestamptz,timestamptz,timestamptz
) to service_role;

create or replace function public.dada3b_settle_room(
  p_room uuid,
  p_rewards jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $$
declare
  room public.dada_rooms;
  item jsonb;
  reward_user uuid;
  reward_code text;
  reward_event text;
  player jsonb;
  uid uuid;
  humans uuid[] := '{}'::uuid[];
  loser uuid;
  reward_count integer := 0;
begin
  if p_room is null
     or p_rewards is null
     or jsonb_typeof(p_rewards) <> 'array'
     or jsonb_array_length(p_rewards) > 64
  then
    raise exception 'invalid_dada_settlement';
  end if;

  select * into room
  from public.dada_rooms
  where id=p_room
  for update;

  if room.id is null then
    raise exception 'dada_room_not_found';
  end if;

  if room.status <> 'finished' then
    raise exception 'dada_room_not_finished';
  end if;

  if room.settled_at is not null then
    return jsonb_build_object('ok',true,'idempotent',true,'rewards',0);
  end if;

  for player in select value from jsonb_array_elements(room.players)
  loop
    if player->>'type' = 'human'
       and coalesce(player->>'uid','') ~ '^[a-f0-9-]{36}$'
    then
      uid := (player->>'uid')::uuid;
      if uid = any(room.member_ids) and not uid = any(humans) then
        humans := array_append(humans,uid);
      end if;
    end if;
  end loop;

  if room.mode='ranked' and cardinality(humans)=2 and room.winner_user_id is not null then
    insert into public.dada_ratings(user_id)
    select unnest(humans)
    on conflict(user_id) do nothing;

    loser := case when humans[1]=room.winner_user_id then humans[2] else humans[1] end;

    update public.dada_ratings
    set games=games+1,
        wins=wins+1,
        rating=least(100000,rating+16),
        streak=greatest(1,streak+1),
        updated_at=now()
    where user_id=room.winner_user_id;

    update public.dada_ratings
    set games=games+1,
        losses=losses+1,
        rating=greatest(0,rating-16),
        streak=least(-1,streak-1),
        updated_at=now()
    where user_id=loser;
  end if;

  for item in select value from jsonb_array_elements(p_rewards)
  loop
    reward_user := nullif(item->>'userId','')::uuid;
    reward_code := item->>'rewardCode';
    reward_event := item->>'eventId';

    if reward_user is null
       or not reward_user = any(room.member_ids)
       or reward_code not in ('dada_match','dada_win','dada_nexus')
       or reward_event is null
       or reward_event !~ '^[A-Za-z0-9:_-]{3,160}$'
    then
      raise exception 'invalid_dada_reward';
    end if;

    insert into public.threeb_reward_outbox(user_id,reward_code,event_id,source)
    values(reward_user,reward_code,reward_event,'dada3b')
    on conflict(user_id,reward_code,event_id) do nothing;

    reward_count := reward_count + 1;
  end loop;

  update public.dada_rooms
  set settled_at=now(),updated_at=now()
  where id=room.id;

  return jsonb_build_object(
    'ok',true,
    'idempotent',false,
    'rewards',reward_count,
    'human_players',cardinality(humans)
  );
end
$$;

revoke all on function public.dada3b_settle_room(uuid,jsonb)
from public,anon,authenticated;
grant execute on function public.dada3b_settle_room(uuid,jsonb)
to service_role;