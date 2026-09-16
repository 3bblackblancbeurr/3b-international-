-- Applied to production on 2026-09-17.
-- Anonymous clients can only call the three narrow SECURITY DEFINER functions.
-- Raw session/install rows stay hidden by RLS and revoked table privileges.
create table if not exists public.app_installs (
  install_id uuid primary key,
  platform text not null default 'web' check (char_length(platform) between 1 and 32),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.app_presence (
  session_id uuid primary key,
  user_id uuid null,
  platform text not null default 'web' check (char_length(platform) between 1 and 32),
  page text not null default 'unknown' check (char_length(page) between 1 and 64),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists app_presence_last_seen_idx on public.app_presence(last_seen desc);
create index if not exists app_installs_last_seen_idx on public.app_installs(last_seen desc);
alter table public.app_installs enable row level security;
alter table public.app_presence enable row level security;
revoke all on table public.app_installs from anon, authenticated;
revoke all on table public.app_presence from anon, authenticated;

create or replace function public.app_presence_ping(p_session_id uuid, p_platform text default 'web', p_page text default 'unknown')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session_id is null then return; end if;
  insert into public.app_presence(session_id,user_id,platform,page,first_seen,last_seen)
  values (p_session_id,auth.uid(),left(coalesce(nullif(trim(p_platform),''),'web'),32),left(coalesce(nullif(trim(p_page),''),'unknown'),64),now(),now())
  on conflict (session_id) do update set user_id=coalesce(auth.uid(),public.app_presence.user_id),platform=excluded.platform,page=excluded.page,last_seen=now();
end;
$$;

create or replace function public.app_install_ping(p_install_id uuid, p_platform text default 'web')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_install_id is null then return; end if;
  insert into public.app_installs(install_id,platform,first_seen,last_seen)
  values (p_install_id,left(coalesce(nullif(trim(p_platform),''),'web'),32),now(),now())
  on conflict (install_id) do update set platform=excluded.platform,last_seen=now();
end;
$$;

create or replace function public.app_metrics_summary()
returns table(total_installs bigint, online_now bigint, active_15m bigint)
language sql security definer set search_path = '' stable as $$
  select
    (select count(*) from public.app_installs),
    (select count(*) from public.app_presence where last_seen >= now() - interval '2 minutes'),
    (select count(*) from public.app_presence where last_seen >= now() - interval '15 minutes');
$$;

revoke all on function public.app_presence_ping(uuid,text,text) from public;
revoke all on function public.app_install_ping(uuid,text) from public;
revoke all on function public.app_metrics_summary() from public;
grant execute on function public.app_presence_ping(uuid,text,text) to anon, authenticated;
grant execute on function public.app_install_ping(uuid,text) to anon, authenticated;
grant execute on function public.app_metrics_summary() to anon, authenticated;
