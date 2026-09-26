
alter table public.penalty_international_windows
  add column if not exists selection_closes_at timestamptz,
  add column if not exists matches_start_at timestamptz,
  add column if not exists matches_end_at timestamptz,
  add column if not exists squad_size smallint not null default 12;

update public.penalty_international_windows
set selection_closes_at=coalesce(selection_closes_at,ends_at),
    matches_start_at=coalesce(matches_start_at,ends_at),
    matches_end_at=coalesce(matches_end_at,ends_at+interval '7 days')
where selection_closes_at is null
   or matches_start_at is null
   or matches_end_at is null;

alter table public.penalty_international_windows
  alter column selection_closes_at set not null,
  alter column matches_start_at set not null,
  alter column matches_end_at set not null;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='penalty_international_windows_phase_times_check') then
    alter table public.penalty_international_windows
      add constraint penalty_international_windows_phase_times_check
      check(selection_closes_at>=starts_at
        and matches_start_at>=selection_closes_at
        and matches_end_at>matches_start_at);
  end if;
  if not exists(select 1 from pg_constraint where conname='penalty_international_windows_squad_size_check') then
    alter table public.penalty_international_windows
      add constraint penalty_international_windows_squad_size_check
      check(squad_size between 4 and 24);
  end if;
end $$;

create index if not exists penalty_international_windows_phase_idx
  on public.penalty_international_windows(starts_at,selection_closes_at,matches_start_at,matches_end_at);

create or replace function public.penalty_player_progression_settle()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_room public.penalty_rooms%rowtype;
  v_a_stats jsonb:=coalesce(new.stats->0,'{}'::jsonb);
  v_b_stats jsonb:=coalesce(new.stats->1,'{}'::jsonb);
  v_base integer;
  v_a_gain integer;
  v_b_gain integer;
begin
  select * into v_room from public.penalty_rooms where id=new.room_id;
  if not found then return new; end if;

  v_base:=case new.mode
    when 'international' then 55
    when 'ranked' then 40
    when 'quick' then 20
    else 0
  end;

  if v_base<=0 then return new; end if;

  v_a_gain:=v_base
    +least(15,coalesce((v_a_stats->>'goals')::integer,0)*4+coalesce((v_a_stats->>'saves')::integer,0)*2)
    +case when new.winner_user_id=new.player_a then 10 else 0 end;

  v_b_gain:=v_base
    +least(15,coalesce((v_b_stats->>'goals')::integer,0)*4+coalesce((v_b_stats->>'saves')::integer,0)*2)
    +case when new.winner_user_id=new.player_b then 10 else 0 end;

  update public.penalty_profiles
  set archetype_xp=archetype_xp+v_a_gain,
      archetype_level=least(50,1+floor(sqrt((archetype_xp+v_a_gain)::numeric/35.0))::integer),
      updated_at=now()
  where user_id=new.player_a;

  update public.penalty_profiles
  set archetype_xp=archetype_xp+v_b_gain,
      archetype_level=least(50,1+floor(sqrt((archetype_xp+v_b_gain)::numeric/35.0))::integer),
      updated_at=now()
  where user_id=new.player_b;

  return new;
end;
$$;

revoke all on function public.penalty_player_progression_settle() from public,anon,authenticated;

drop trigger if exists penalty_player_progression_settle on public.penalty_match_history;
create trigger penalty_player_progression_settle
after insert on public.penalty_match_history
for each row execute function public.penalty_player_progression_settle();

comment on column public.penalty_international_windows.selection_closes_at is
  'Last instant at which a preselected player may accept or decline the national call-up.';
comment on column public.penalty_international_windows.matches_start_at is
  'Server-authoritative opening of international matchmaking.';
comment on column public.penalty_international_windows.matches_end_at is
  'Server-authoritative closing of international matchmaking.';
comment on function public.penalty_player_progression_settle() is
  'Awards bounded archetype XP from server-settled official matches. It never changes authoritative gameplay tuning.';
