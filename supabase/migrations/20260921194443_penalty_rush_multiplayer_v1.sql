
create table public.penalty_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  shirt_name text not null check (char_length(shirt_name) between 1 and 14),
  shirt_number smallint not null default 10 check (shirt_number between 1 and 99),
  country_id text not null default 'fr' check (country_id = any (array['fr','dz','ma','tn','tr','it','es','ee']::text[])),
  style_id text not null default 'technicien' check (style_id = any (array['technicien','explosif','finisseur','imprevisible','maestro']::text[])),
  keeper_powers text[] not null default array['read','anchor']::text[]
    check (
      cardinality(keeper_powers)=2
      and keeper_powers <@ array['impulse','read','phantom','anchor']::text[]
      and keeper_powers[1] <> keeper_powers[2]
    ),
  kit jsonb not null default '{}'::jsonb
    check (jsonb_typeof(kit)='object' and octet_length(kit::text)<=4096),
  boots jsonb not null default '{}'::jsonb
    check (jsonb_typeof(boots)='object' and octet_length(boots::text)<=2048),
  celebration text not null default 'calme' check (char_length(celebration) between 1 and 24),
  reputation integer not null default 0 check (reputation>=0),
  international_caps integer not null default 0 check (international_caps>=0),
  international_goals integer not null default 0 check (international_goals>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.penalty_clubs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 40),
  colors jsonb not null default '{"primary":"#08090b","secondary":"#d8b35e"}'::jsonb
    check (jsonb_typeof(colors)='object' and octet_length(colors::text)<=2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.penalty_club_members (
  club_id uuid not null references public.penalty_clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role = any (array['owner','captain','member']::text[])),
  joined_at timestamptz not null default now(),
  primary key (club_id,user_id),
  unique (user_id)
);

create table public.penalty_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_id text not null default 'fr' check (country_id = any (array['fr','dz','ma','tn','tr','it','es','ee']::text[])),
  rating integer not null default 1000 check (rating between 0 and 100000),
  games integer not null default 0 check (games>=0),
  wins integer not null default 0 check (wins>=0),
  losses integer not null default 0 check (losses>=0),
  goals_for integer not null default 0 check (goals_for>=0),
  goals_against integer not null default 0 check (goals_against>=0),
  saves integer not null default 0 check (saves>=0),
  duel_gold_wins integer not null default 0 check (duel_gold_wins>=0),
  duel_gold_played integer not null default 0 check (duel_gold_played>=0),
  updated_at timestamptz not null default now()
);

create table public.penalty_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  mode text not null check (mode = any (array['private','quick','ranked']::text[])),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status = any (array['waiting','active','finished','cancelled']::text[])),
  players jsonb not null default '[]'::jsonb
    check (jsonb_typeof(players)='array' and jsonb_array_length(players)<=2 and octet_length(players::text)<=24000),
  member_ids uuid[] not null default '{}'::uuid[]
    check (cardinality(member_ids) between 0 and 2),
  state jsonb
    check (state is null or (jsonb_typeof(state)='object' and octet_length(state::text)<=180000)),
  revision bigint not null default 0 check (revision>=0),
  winner_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  settled_at timestamptz,
  expires_at timestamptz not null default (now()+interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or cardinality(member_ids)=2)
);

create table public.penalty_room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.penalty_rooms(id) on delete cascade,
  revision bigint not null check (revision>=0),
  actor_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind ~ '^[a-z0-9_.-]{2,40}$'),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=32000),
  created_at timestamptz not null default now()
);

create table public.penalty_match_history (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.penalty_rooms(id) on delete cascade,
  mode text not null check (mode = any (array['private','quick','ranked']::text[])),
  player_a uuid not null references auth.users(id) on delete cascade,
  player_b uuid not null references auth.users(id) on delete cascade,
  winner_user_id uuid references auth.users(id) on delete set null,
  score_a smallint not null check (score_a between 0 and 100),
  score_b smallint not null check (score_b between 0 and 100),
  stats jsonb not null default '[]'::jsonb
    check (jsonb_typeof(stats)='array' and octet_length(stats::text)<=32000),
  created_at timestamptz not null default now()
);

create table public.penalty_international_windows (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  competition text not null check (competition = any (array['3b-nations','continental-series','international-crown','crown-of-nations']::text[])),
  status text not null default 'planned' check (status = any (array['planned','selection','active','closed']::text[])),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.penalty_international_selections (
  id uuid primary key default gen_random_uuid(),
  window_id uuid not null references public.penalty_international_windows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  country_id text not null check (country_id = any (array['fr','dz','ma','tn','tr','it','es','ee']::text[])),
  status text not null default 'preselected' check (status = any (array['preselected','selected','declined','released']::text[])),
  role_profile text check (role_profile is null or role_profile = any (array['technicien','explosif','finisseur','imprevisible','maestro','pression','gardien-reflexe']::text[])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (window_id,user_id)
);

create index penalty_profiles_country_reputation_idx on public.penalty_profiles(country_id,reputation desc);
create index penalty_clubs_owner_user_id_idx on public.penalty_clubs(owner_user_id);
create index penalty_club_members_user_id_idx on public.penalty_club_members(user_id);
create index penalty_ratings_country_rating_idx on public.penalty_ratings(country_id,rating desc);
create index penalty_rooms_host_user_id_idx on public.penalty_rooms(host_user_id);
create index penalty_rooms_winner_user_id_idx on public.penalty_rooms(winner_user_id);
create index penalty_rooms_matchmaking_idx on public.penalty_rooms(mode,status,created_at) where status='waiting';
create index penalty_rooms_member_ids_idx on public.penalty_rooms using gin(member_ids);
create index penalty_room_events_room_id_idx on public.penalty_room_events(room_id,revision);
create index penalty_room_events_actor_user_id_idx on public.penalty_room_events(actor_user_id);
create index penalty_match_history_player_a_idx on public.penalty_match_history(player_a,created_at desc);
create index penalty_match_history_player_b_idx on public.penalty_match_history(player_b,created_at desc);
create index penalty_match_history_winner_user_id_idx on public.penalty_match_history(winner_user_id);
create index penalty_international_selections_user_id_idx on public.penalty_international_selections(user_id,created_at desc);
create index penalty_international_selections_window_id_idx on public.penalty_international_selections(window_id);
create index penalty_international_windows_status_idx on public.penalty_international_windows(status,starts_at);

alter table public.penalty_profiles enable row level security;
alter table public.penalty_clubs enable row level security;
alter table public.penalty_club_members enable row level security;
alter table public.penalty_ratings enable row level security;
alter table public.penalty_rooms enable row level security;
alter table public.penalty_room_events enable row level security;
alter table public.penalty_match_history enable row level security;
alter table public.penalty_international_windows enable row level security;
alter table public.penalty_international_selections enable row level security;

revoke all on public.penalty_profiles from anon, authenticated;
revoke all on public.penalty_clubs from anon, authenticated;
revoke all on public.penalty_club_members from anon, authenticated;
revoke all on public.penalty_ratings from anon, authenticated;
revoke all on public.penalty_rooms from anon, authenticated;
revoke all on public.penalty_room_events from anon, authenticated;
revoke all on public.penalty_match_history from anon, authenticated;
revoke all on public.penalty_international_windows from anon, authenticated;
revoke all on public.penalty_international_selections from anon, authenticated;

grant select (id,revision,updated_at,member_ids) on public.penalty_rooms to authenticated;

create policy penalty_rooms_member_signal_select
on public.penalty_rooms
for select
to authenticated
using (auth.uid() = any(member_ids));

alter publication supabase_realtime add table public.penalty_rooms;

create or replace function public.penalty_settle_match(
  p_room uuid,
  p_winner uuid,
  p_score_a integer,
  p_score_b integer,
  p_stats jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  v_gold := coalesce((v_a_stats->>'goldenGoals')::integer,0) + coalesce((v_b_stats->>'goldenGoals')::integer,0) > 0;

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

  update public.penalty_rooms
  set settled_at=now(),updated_at=now()
  where id=p_room;

  return true;
end;
$$;

revoke all on function public.penalty_settle_match(uuid,uuid,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.penalty_settle_match(uuid,uuid,integer,integer,jsonb) to service_role;

comment on table public.penalty_profiles is '3B Penalty Rush player identity and cosmetic loadout. No purchased field grants gameplay power.';
comment on table public.penalty_rooms is 'Authoritative online-only 1v1 Penalty Rush room state. Clients never write directly.';
comment on table public.penalty_ratings is 'Server-settled Penalty Rush competitive and career statistics.';
comment on function public.penalty_settle_match(uuid,uuid,integer,integer,jsonb) is 'Service-only idempotent Penalty Rush match settlement and Elo/career update.';
