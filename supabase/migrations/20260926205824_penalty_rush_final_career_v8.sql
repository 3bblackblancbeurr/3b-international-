
alter table public.penalty_profiles
  add column if not exists passport_public_id uuid,
  add column if not exists identity_status text not null default 'passport',
  add column if not exists appearance jsonb not null default '{"skinTone":"tone4","hairStyle":"short","hairColor":"dark-brown","faceShape":"balanced","facialHair":"none","heightCm":178,"build":"athletic"}'::jsonb,
  add column if not exists preferred_role text not null default 'versatile',
  add column if not exists dominant_foot text not null default 'right',
  add column if not exists profile_completed_at timestamptz,
  add column if not exists archetype_xp integer not null default 0,
  add column if not exists archetype_level smallint not null default 1;

update public.penalty_profiles p
set passport_public_id=m.passport_public_id,
    profile_completed_at=coalesce(p.profile_completed_at,p.created_at,now())
from public.member_profiles m
where m.user_id=p.user_id
  and p.passport_public_id is null;

alter table public.penalty_profiles
  alter column passport_public_id set not null;

create unique index if not exists penalty_profiles_passport_public_id_uidx
  on public.penalty_profiles(passport_public_id);

do $$
begin
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_passport_public_id_fkey') then
    alter table public.penalty_profiles
      add constraint penalty_profiles_passport_public_id_fkey
      foreign key(passport_public_id) references public.member_profiles(passport_public_id) on update cascade on delete cascade;
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_identity_status_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_identity_status_check
      check(identity_status in ('passport','review'));
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_appearance_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_appearance_check
      check(jsonb_typeof(appearance)='object' and pg_column_size(appearance)<=4096);
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_preferred_role_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_preferred_role_check
      check(preferred_role in ('attacker','keeper','versatile'));
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_dominant_foot_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_dominant_foot_check
      check(dominant_foot in ('left','right'));
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_archetype_xp_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_archetype_xp_check check(archetype_xp>=0);
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_profiles_archetype_level_check') then
    alter table public.penalty_profiles add constraint penalty_profiles_archetype_level_check check(archetype_level between 1 and 50);
  end if;
end $$;

create table if not exists public.penalty_ranked_seasons(
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(code ~ '^[a-z0-9-]{3,32}$'),
  name text not null check(char_length(name) between 3 and 80),
  status text not null default 'planned' check(status in ('planned','active','closed')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  placement_matches smallint not null default 5 check(placement_matches between 3 and 10),
  created_at timestamptz not null default now(),
  check(ends_at>starts_at)
);

create unique index if not exists penalty_ranked_one_active_season_uidx
  on public.penalty_ranked_seasons((status)) where status='active';

insert into public.penalty_ranked_seasons(code,name,status,starts_at,ends_at,placement_matches)
select '2026-s1','Saison 1 · Héritage','active','2026-09-26 00:00:00+00','2026-12-31 23:59:59+00',5
where not exists(select 1 from public.penalty_ranked_seasons where status='active');

create table if not exists public.penalty_ranked_stats(
  season_id uuid not null references public.penalty_ranked_seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  country_id text not null check(country_id in ('fr','dz','ma','tn','tr','it','es','ee')),
  rating integer not null default 1000 check(rating between 0 and 100000),
  games integer not null default 0 check(games>=0),
  wins integer not null default 0 check(wins>=0),
  losses integer not null default 0 check(losses>=0),
  streak integer not null default 0 check(streak between 0 and 100000),
  best_rating integer not null default 1000 check(best_rating between 0 and 100000),
  forfeits integer not null default 0 check(forfeits>=0),
  updated_at timestamptz not null default now(),
  primary key(season_id,user_id)
);
create index if not exists penalty_ranked_stats_country_rating_idx
  on public.penalty_ranked_stats(season_id,country_id,rating desc,games desc);

create table if not exists public.penalty_club_invites(
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.penalty_clubs(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default(now()+interval '72 hours'),
  responded_at timestamptz,
  check(expires_at>created_at)
);
create unique index if not exists penalty_club_invites_pending_uidx
  on public.penalty_club_invites(club_id,target_user_id) where status='pending';
create index if not exists penalty_club_invites_target_idx
  on public.penalty_club_invites(target_user_id,status,created_at desc);

alter table public.penalty_rooms
  add column if not exists ranked_season_id uuid references public.penalty_ranked_seasons(id) on delete set null,
  add column if not exists international_window_id uuid references public.penalty_international_windows(id) on delete set null;

alter table public.penalty_match_history
  add column if not exists ranked_season_id uuid references public.penalty_ranked_seasons(id) on delete set null,
  add column if not exists international_window_id uuid references public.penalty_international_windows(id) on delete set null;

create index if not exists penalty_rooms_ranked_season_idx on public.penalty_rooms(ranked_season_id,status);
create index if not exists penalty_rooms_international_window_idx on public.penalty_rooms(international_window_id,status);
create index if not exists penalty_match_history_ranked_season_idx on public.penalty_match_history(ranked_season_id,created_at desc);
create index if not exists penalty_match_history_international_window_idx on public.penalty_match_history(international_window_id,created_at desc);

alter table public.penalty_rooms drop constraint if exists penalty_rooms_mode_check;
alter table public.penalty_rooms add constraint penalty_rooms_mode_check
  check(mode in ('private','quick','ranked','international'));
alter table public.penalty_match_history drop constraint if exists penalty_match_history_mode_check;
alter table public.penalty_match_history add constraint penalty_match_history_mode_check
  check(mode in ('private','quick','ranked','international'));

alter table public.penalty_ranked_seasons enable row level security;
alter table public.penalty_ranked_stats enable row level security;
alter table public.penalty_club_invites enable row level security;
revoke all on public.penalty_ranked_seasons from anon,authenticated;
revoke all on public.penalty_ranked_stats from anon,authenticated;
revoke all on public.penalty_club_invites from anon,authenticated;

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
  v_expected_a numeric;
  v_actual_a numeric;
  v_k integer;
  v_delta integer;
  v_forfeit boolean;
  v_loser uuid;
  v_selected_a boolean;
  v_selected_b boolean;
begin
  select * into v_room from public.penalty_rooms where id=new.room_id;
  if not found then return new; end if;

  if new.mode='ranked' and v_room.ranked_season_id is not null then
    select * into v_season from public.penalty_ranked_seasons
      where id=v_room.ranked_season_id and status in ('active','closed');

    if found then
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
      v_k:=case when least(v_a.games,v_b.games)<v_season.placement_matches then 40 else 28 end;
      v_delta:=round(v_k*(v_actual_a-v_expected_a))::integer;
      v_forfeit:=coalesce(v_room.state->'lastEvent'->>'type','')='forfeit';
      v_loser:=case when new.winner_user_id=new.player_a then new.player_b when new.winner_user_id=new.player_b then new.player_a else null end;

      update public.penalty_ranked_stats set
        rating=greatest(0,rating+v_delta),
        games=games+1,
        wins=wins+case when new.winner_user_id=new.player_a then 1 else 0 end,
        losses=losses+case when new.winner_user_id=new.player_b then 1 else 0 end,
        streak=case when new.winner_user_id=new.player_a then streak+1 else 0 end,
        best_rating=greatest(best_rating,greatest(0,rating+v_delta)),
        forfeits=forfeits+case when v_forfeit and v_loser=new.player_a then 1 else 0 end,
        country_id=(select p.country_id from public.penalty_profiles p where p.user_id=new.player_a),
        updated_at=now()
      where season_id=v_season.id and user_id=new.player_a;

      update public.penalty_ranked_stats set
        rating=greatest(0,rating-v_delta),
        games=games+1,
        wins=wins+case when new.winner_user_id=new.player_b then 1 else 0 end,
        losses=losses+case when new.winner_user_id=new.player_a then 1 else 0 end,
        streak=case when new.winner_user_id=new.player_b then streak+1 else 0 end,
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
      where s.window_id=v_room.international_window_id and s.user_id=new.player_a and s.status='selected')
      into v_selected_a;
    select exists(select 1 from public.penalty_international_selections s
      where s.window_id=v_room.international_window_id and s.user_id=new.player_b and s.status='selected')
      into v_selected_b;
    if v_selected_a and v_selected_b then
      update public.penalty_profiles set
        international_caps=international_caps+1,
        international_goals=international_goals+new.score_a,
        updated_at=now()
      where user_id=new.player_a;
      update public.penalty_profiles set
        international_caps=international_caps+1,
        international_goals=international_goals+new.score_b,
        updated_at=now()
      where user_id=new.player_b;
      update public.penalty_match_history set international_window_id=v_room.international_window_id where id=new.id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.penalty_competitive_history_settle() from public,anon,authenticated;

drop trigger if exists penalty_competitive_history_settle on public.penalty_match_history;
create trigger penalty_competitive_history_settle
after insert on public.penalty_match_history
for each row execute function public.penalty_competitive_history_settle();

comment on table public.penalty_ranked_seasons is 'Server-authoritative Penalty Rush ranked seasons.';
comment on table public.penalty_ranked_stats is 'Server-only seasonal competitive rating and discipline stats.';
comment on table public.penalty_club_invites is 'Server-only club recruitment invitation lifecycle.';
comment on column public.penalty_profiles.passport_public_id is 'Opaque Passport 3B public identity binding. Never use auth.users.id as public identity.';
comment on column public.penalty_profiles.appearance is 'Cosmetic-only football avatar appearance. It must never affect authoritative competitive stats.';
