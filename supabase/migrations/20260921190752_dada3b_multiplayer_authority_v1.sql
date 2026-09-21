create table public.dada_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  mode text not null check (mode in ('private','quick','ranked')),
  host_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','active','finished','cancelled')),
  max_players smallint not null default 2 check (max_players between 2 and 8),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules)='object' and octet_length(rules::text)<=12000),
  players jsonb not null default '[]'::jsonb check (jsonb_typeof(players)='array' and jsonb_array_length(players)<=8 and octet_length(players::text)<=32000),
  spectators jsonb not null default '[]'::jsonb check (jsonb_typeof(spectators)='array' and jsonb_array_length(spectators)<=8 and octet_length(spectators::text)<=24000),
  member_ids uuid[] not null default '{}'::uuid[] check (cardinality(member_ids)<=16),
  state jsonb check (state is null or (jsonb_typeof(state)='object' and octet_length(state::text)<=180000)),
  revision bigint not null default 0 check (revision>=0),
  turn_deadline timestamptz,
  winner_user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '30 minutes'
);

create index dada_rooms_waiting_idx on public.dada_rooms(mode,status,created_at) where status='waiting';
create index dada_rooms_member_ids_idx on public.dada_rooms using gin(member_ids);
create index dada_rooms_expires_idx on public.dada_rooms(status,expires_at);

alter table public.dada_rooms enable row level security;
revoke all on public.dada_rooms from public,anon,authenticated;
grant select on public.dada_rooms to authenticated;
grant all on public.dada_rooms to service_role;

create policy dada_rooms_member_select
on public.dada_rooms
for select
to authenticated
using ((select auth.uid()) = any(member_ids));

create table public.dada_room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.dada_rooms(id) on delete cascade,
  revision bigint not null check (revision>=0),
  actor_user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind ~ '^[a-z0-9_-]{2,40}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=32000),
  created_at timestamptz not null default now(),
  unique(room_id,revision)
);

create index dada_room_events_room_idx on public.dada_room_events(room_id,created_at desc);

alter table public.dada_room_events enable row level security;
revoke all on public.dada_room_events from public,anon,authenticated;
grant all on public.dada_room_events to service_role;
grant usage,select on sequence public.dada_room_events_id_seq to service_role;

create table public.dada_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1000 check (rating between 0 and 100000),
  games integer not null default 0 check (games>=0),
  wins integer not null default 0 check (wins>=0),
  losses integer not null default 0 check (losses>=0),
  streak integer not null default 0 check (streak between -100000 and 100000),
  updated_at timestamptz not null default now()
);

create index dada_ratings_rank_idx on public.dada_ratings(rating desc,wins desc,games);

alter table public.dada_ratings enable row level security;
revoke all on public.dada_ratings from public,anon,authenticated;
grant all on public.dada_ratings to service_role;

do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='dada_rooms'
  ) then
    alter publication supabase_realtime add table public.dada_rooms;
  end if;
end $$;

insert into public.reward_definitions(code,label,xp,coins,active,repeatable)
values
 ('dada_match','DADA 3B · Partie validée',12,2,true,true),
 ('dada_win','DADA 3B · Victoire',30,5,true,true),
 ('dada_nexus','DADA 3B · Fragment Nexus',6,0,true,true)
on conflict(code) do update set
 label=excluded.label,xp=excluded.xp,coins=excluded.coins,active=true,repeatable=true;

insert into public.threeb_reward_policy(
 reward_code,policy_version,max_events_per_day,daily_xp_cap,daily_coins_cap,
 cooldown_seconds,diminishing,min_global_level,sensitive,active,max_events_lifetime,updated_at
)
values
 ('dada_match','2026.2',8,96,16,120,'[1.0,1.0,0.75,0.5]'::jsonb,1,false,true,null,now()),
 ('dada_win','2026.2',5,150,25,180,'[1.0,0.8,0.6,0.4,0.3]'::jsonb,1,false,true,null,now()),
 ('dada_nexus','2026.2',16,96,0,0,'[1.0,0.8,0.6,0.4]'::jsonb,1,false,true,null,now())
on conflict(reward_code) do update set
 policy_version=excluded.policy_version,
 max_events_per_day=excluded.max_events_per_day,
 daily_xp_cap=excluded.daily_xp_cap,
 daily_coins_cap=excluded.daily_coins_cap,
 cooldown_seconds=excluded.cooldown_seconds,
 diminishing=excluded.diminishing,
 min_global_level=excluded.min_global_level,
 sensitive=excluded.sensitive,
 active=true,
 max_events_lifetime=excluded.max_events_lifetime,
 updated_at=now();