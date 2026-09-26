-- Applied only to Supabase project zykdfgahzqqanlyxjtbe (3B Nosbloc Staging).
-- Never deploy this file to the production project.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_type where typname='nosbloc_stg_country') then
    create type public.nosbloc_stg_country as enum ('France','Algérie','Espagne','Maroc','Italie','Tunisie','Turquie','Estonie');
  end if;
end $$;

create table if not exists public.member_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check(handle ~ '^[a-z0-9][a-z0-9._-]{2,23}$'),
  name text not null check(char_length(name) between 2 and 80),
  country public.nosbloc_stg_country not null default 'France',
  public_badge_key text check(public_badge_key is null or public_badge_key ~ '^[a-z0-9_-]{3,40}$'),
  public_title text check(public_title is null or char_length(public_title) between 2 and 80),
  public_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(not public_verified or (public_badge_key is not null and public_title is not null))
);
create unique index if not exists member_profiles_director_founder_unique on public.member_profiles(public_badge_key) where public_badge_key='director_founder' and public_verified=true;

create table if not exists public.loyalty_rate_limits(
  rate_key text primary key check(char_length(rate_key) between 1 and 240),
  window_started_at timestamptz not null default clock_timestamp(),
  hits integer not null default 0 check(hits>=0),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.member_profiles enable row level security;
alter table public.loyalty_rate_limits enable row level security;
revoke all on public.member_profiles,public.loyalty_rate_limits from public,anon,authenticated;
grant all on public.member_profiles,public.loyalty_rate_limits to service_role;

create or replace function public.loyalty_rate(p_key text,p_limit integer,p_window integer) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_now timestamptz:=clock_timestamp();v_hits integer;
begin
 if p_key is null or char_length(p_key)<1 or char_length(p_key)>240 or p_limit<1 or p_limit>10000 or p_window<1 or p_window>86400 then raise exception 'invalid_rate_limit';end if;
 insert into public.loyalty_rate_limits as r(rate_key,window_started_at,hits,updated_at) values(p_key,v_now,1,v_now)
 on conflict(rate_key) do update set hits=case when v_now-r.window_started_at>=make_interval(secs=>p_window) then 1 else r.hits+1 end,window_started_at=case when v_now-r.window_started_at>=make_interval(secs=>p_window) then v_now else r.window_started_at end,updated_at=v_now returning hits into v_hits;
 return v_hits<=p_limit;
end$$;

create or replace function public.loyalty_session_valid(p_user uuid,p_session text) returns boolean
language sql stable security invoker set search_path=public,auth,pg_temp as $$select exists(select 1 from auth.sessions s where s.user_id=p_user and s.id::text=p_session and (s.not_after is null or s.not_after>now()))$$;
revoke all on function public.loyalty_rate(text,integer,integer) from public,anon,authenticated;
revoke all on function public.loyalty_session_valid(uuid,text) from public,anon,authenticated;
grant execute on function public.loyalty_rate(text,integer,integer) to service_role;
grant execute on function public.loyalty_session_valid(uuid,text) to service_role;

create or replace function private.nosbloc_stg_normalize_handle(p_value text,p_user uuid) returns text
language plpgsql immutable security definer set search_path=public,pg_temp as $$declare v_handle text;begin v_handle:=lower(regexp_replace(coalesce(p_value,''),'[^a-zA-Z0-9._-]+','','g'));if v_handle!~'^[a-z0-9][a-z0-9._-]{2,23}$' then v_handle:='m'||substr(replace(p_user::text,'-',''),1,12);end if;return left(v_handle,24);end$$;

create or replace function private.nosbloc_stg_handle_new_user() returns trigger
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_requested text;v_handle text;v_name text;v_country public.nosbloc_stg_country;
begin
 v_requested:=coalesce(new.raw_user_meta_data->>'handle',split_part(coalesce(new.email,''),'@',1));v_handle:=private.nosbloc_stg_normalize_handle(v_requested,new.id);
 if exists(select 1 from public.member_profiles where handle=v_handle) then v_handle:=left(v_handle,17)||'-'||substr(replace(new.id::text,'-',''),1,6);end if;
 v_name:=left(trim(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'name',v_handle)),80);if char_length(v_name)<2 then v_name:=v_handle;end if;
 begin v_country:=coalesce(nullif(new.raw_user_meta_data->>'country','')::public.nosbloc_stg_country,'France');exception when others then v_country:='France';end;
 insert into public.member_profiles(user_id,handle,name,country) values(new.id,v_handle,v_name,v_country) on conflict(user_id) do nothing;return new;
end$$;
revoke all on function private.nosbloc_stg_normalize_handle(text,uuid) from public,anon,authenticated;
revoke all on function private.nosbloc_stg_handle_new_user() from public,anon,authenticated;
drop trigger if exists nosbloc_stg_auth_profile on auth.users;
create trigger nosbloc_stg_auth_profile after insert on auth.users for each row execute function private.nosbloc_stg_handle_new_user();
