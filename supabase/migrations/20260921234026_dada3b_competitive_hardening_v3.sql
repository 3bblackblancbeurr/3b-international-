
alter table public.dada_rooms
  drop constraint if exists dada_rooms_mode_check;

alter table public.dada_rooms
  add constraint dada_rooms_mode_check
  check (mode = any (array['private'::text,'quick'::text,'ranked'::text,'team2v2'::text,'tournament'::text]));

create table if not exists public.dada_team_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1000 check (rating between 0 and 100000),
  games integer not null default 0 check (games >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  streak integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.dada_team_ratings enable row level security;
revoke all on public.dada_team_ratings from anon, authenticated;
create index if not exists dada_team_ratings_rank_idx on public.dada_team_ratings(rating desc,wins desc,updated_at asc);

create table if not exists public.dada_tournaments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  title text not null check (char_length(title) between 3 and 80),
  status text not null default 'open' check (status in ('open','active','finished','cancelled')),
  format text not null default 'single_elimination' check (format='single_elimination'),
  max_entries smallint not null check (max_entries in (4,8,16)),
  created_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dada_tournaments enable row level security;
revoke all on public.dada_tournaments from anon, authenticated;
create index if not exists dada_tournaments_status_created_idx on public.dada_tournaments(status,created_at desc);

create table if not exists public.dada_tournament_entries (
  tournament_id uuid not null references public.dada_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  country_id text not null check (country_id in ('fr','dz','es','ma','it','tn','tr','ee')),
  seed smallint check (seed is null or seed between 1 and 16),
  status text not null default 'registered' check (status in ('registered','eliminated','winner')),
  joined_at timestamptz not null default now(),
  primary key(tournament_id,user_id)
);
alter table public.dada_tournament_entries enable row level security;
revoke all on public.dada_tournament_entries from anon, authenticated;
create index if not exists dada_tournament_entries_user_idx on public.dada_tournament_entries(user_id,joined_at desc);

create table if not exists public.dada_tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.dada_tournaments(id) on delete cascade,
  round_no smallint not null check (round_no between 1 and 4),
  slot_no smallint not null check (slot_no between 1 and 8),
  player_a uuid references auth.users(id) on delete set null,
  player_b uuid references auth.users(id) on delete set null,
  winner_user_id uuid references auth.users(id) on delete set null,
  room_id uuid references public.dada_rooms(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','ready','active','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id,round_no,slot_no)
);
alter table public.dada_tournament_matches enable row level security;
revoke all on public.dada_tournament_matches from anon, authenticated;
create index if not exists dada_tournament_matches_player_a_idx on public.dada_tournament_matches(player_a,status);
create index if not exists dada_tournament_matches_player_b_idx on public.dada_tournament_matches(player_b,status);
create index if not exists dada_tournament_matches_room_idx on public.dada_tournament_matches(room_id);

create or replace function public.dada3b_seed_tournament(p_tournament uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  t public.dada_tournaments;
  entry record;
  ids uuid[] := '{}'::uuid[];
  n integer;
  rounds integer;
  i integer;
begin
  select * into t from public.dada_tournaments where id=p_tournament for update;
  if t.id is null then raise exception 'dada_tournament_not_found'; end if;
  if t.status <> 'open' then raise exception 'dada_tournament_not_open'; end if;

  select array_agg(user_id order by joined_at,user_id)
    into ids
  from public.dada_tournament_entries
  where tournament_id=t.id and status='registered';

  n := coalesce(cardinality(ids),0);
  if n <> t.max_entries then raise exception 'dada_tournament_not_full'; end if;
  rounds := case n when 4 then 2 when 8 then 3 when 16 then 4 else 0 end;
  if rounds=0 then raise exception 'dada_tournament_size_invalid'; end if;

  for i in 1..n loop
    update public.dada_tournament_entries
    set seed=i
    where tournament_id=t.id and user_id=ids[i];
  end loop;

  for i in 1..(n/2) loop
    insert into public.dada_tournament_matches(tournament_id,round_no,slot_no,player_a,player_b,status)
    values(t.id,1,i,ids[i],ids[n-i+1],'ready')
    on conflict(tournament_id,round_no,slot_no) do update
      set player_a=excluded.player_a,player_b=excluded.player_b,status='ready',updated_at=now();
  end loop;

  if rounds >= 2 then
    for i in 1..(n/4) loop
      insert into public.dada_tournament_matches(tournament_id,round_no,slot_no,status)
      values(t.id,2,i,'pending')
      on conflict(tournament_id,round_no,slot_no) do nothing;
    end loop;
  end if;
  if rounds >= 3 then
    for i in 1..(n/8) loop
      insert into public.dada_tournament_matches(tournament_id,round_no,slot_no,status)
      values(t.id,3,i,'pending')
      on conflict(tournament_id,round_no,slot_no) do nothing;
    end loop;
  end if;
  if rounds >= 4 then
    insert into public.dada_tournament_matches(tournament_id,round_no,slot_no,status)
    values(t.id,4,1,'pending')
    on conflict(tournament_id,round_no,slot_no) do nothing;
  end if;

  update public.dada_tournaments
  set status='active',started_at=now(),updated_at=now()
  where id=t.id;

  return jsonb_build_object('ok',true,'entries',n,'rounds',rounds);
end
$$;

revoke all on function public.dada3b_seed_tournament(uuid) from public,anon,authenticated;

create or replace function public.dada3b_advance_tournament_room(p_room uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  m public.dada_tournament_matches;
  t public.dada_tournaments;
  r public.dada_rooms;
  total_rounds integer;
  next_slot integer;
  loser uuid;
  next_match public.dada_tournament_matches;
begin
  select * into m from public.dada_tournament_matches where room_id=p_room for update;
  if m.id is null then return jsonb_build_object('ok',false,'reason','not_tournament'); end if;

  select * into r from public.dada_rooms where id=p_room;
  if r.id is null or r.status<>'finished' or r.winner_user_id is null then
    raise exception 'dada_tournament_room_not_finished';
  end if;
  if m.status='finished' then return jsonb_build_object('ok',true,'idempotent',true); end if;
  if r.winner_user_id not in (m.player_a,m.player_b) then raise exception 'dada_tournament_winner_invalid'; end if;

  select * into t from public.dada_tournaments where id=m.tournament_id for update;
  total_rounds := case t.max_entries when 4 then 2 when 8 then 3 when 16 then 4 else 0 end;
  loser := case when r.winner_user_id=m.player_a then m.player_b else m.player_a end;

  update public.dada_tournament_matches
  set winner_user_id=r.winner_user_id,status='finished',updated_at=now()
  where id=m.id;

  if loser is not null then
    update public.dada_tournament_entries
    set status='eliminated'
    where tournament_id=t.id and user_id=loser;
  end if;

  if m.round_no >= total_rounds then
    update public.dada_tournament_entries set status='winner'
    where tournament_id=t.id and user_id=r.winner_user_id;
    update public.dada_tournaments
    set status='finished',finished_at=now(),updated_at=now()
    where id=t.id;
    return jsonb_build_object('ok',true,'finished',true,'winner',r.winner_user_id);
  end if;

  next_slot := ((m.slot_no + 1) / 2);
  select * into next_match
  from public.dada_tournament_matches
  where tournament_id=t.id and round_no=m.round_no+1 and slot_no=next_slot
  for update;

  if next_match.id is null then raise exception 'dada_tournament_next_match_missing'; end if;

  if (m.slot_no % 2)=1 then
    update public.dada_tournament_matches
    set player_a=r.winner_user_id,
        status=case when player_b is not null then 'ready' else 'pending' end,
        updated_at=now()
    where id=next_match.id;
  else
    update public.dada_tournament_matches
    set player_b=r.winner_user_id,
        status=case when player_a is not null then 'ready' else 'pending' end,
        updated_at=now()
    where id=next_match.id;
  end if;

  return jsonb_build_object('ok',true,'finished',false,'next_round',m.round_no+1,'next_slot',next_slot);
end
$$;

revoke all on function public.dada3b_advance_tournament_room(uuid) from public,anon,authenticated;

create or replace function public.dada3b_after_settle_competition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  winning_team text;
  player jsonb;
  uid uuid;
  winners uuid[] := '{}'::uuid[];
  losers uuid[] := '{}'::uuid[];
begin
  if old.settled_at is not null or new.settled_at is null then return new; end if;

  if new.mode='team2v2' then
    winning_team := nullif(new.state->>'winnerTeam','');
    if winning_team in ('A','B') then
      for player in select value from jsonb_array_elements(new.players)
      loop
        if coalesce(player->>'uid','') ~ '^[a-f0-9-]{36}$' then
          uid := (player->>'uid')::uuid;
          if player->>'team'=winning_team then winners := array_append(winners,uid);
          elsif player->>'team' in ('A','B') then losers := array_append(losers,uid);
          end if;
        end if;
      end loop;

      insert into public.dada_team_ratings(user_id)
      select unnest(winners || losers)
      on conflict(user_id) do nothing;

      update public.dada_team_ratings
      set games=games+1,wins=wins+1,rating=least(100000,rating+12),
          streak=greatest(1,streak+1),updated_at=now()
      where user_id=any(winners);

      update public.dada_team_ratings
      set games=games+1,losses=losses+1,rating=greatest(0,rating-12),
          streak=least(-1,streak-1),updated_at=now()
      where user_id=any(losers);
    end if;
  elsif new.mode='tournament' then
    perform public.dada3b_advance_tournament_room(new.id);
  end if;

  return new;
end
$$;

revoke all on function public.dada3b_after_settle_competition() from public,anon,authenticated;

drop trigger if exists dada3b_after_settle_competition on public.dada_rooms;
create trigger dada3b_after_settle_competition
after update of settled_at on public.dada_rooms
for each row
when (old.settled_at is null and new.settled_at is not null)
execute function public.dada3b_after_settle_competition();
