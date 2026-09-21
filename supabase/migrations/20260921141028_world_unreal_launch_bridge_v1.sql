create table if not exists public.world_unreal_launch_tickets (
  ticket_hash text primary key check (ticket_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  client text not null default 'app-3b',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_device text
);

create index if not exists world_unreal_launch_tickets_user_expiry_idx
  on public.world_unreal_launch_tickets (user_id, expires_at desc);
create index if not exists world_unreal_launch_tickets_expiry_idx
  on public.world_unreal_launch_tickets (expires_at);

alter table public.world_unreal_launch_tickets enable row level security;
revoke all on table public.world_unreal_launch_tickets from public, anon, authenticated;
grant select, insert, update, delete on table public.world_unreal_launch_tickets to service_role;

create table if not exists public.world_unreal_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  device text not null default '',
  client text not null default 'unreal',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists world_unreal_sessions_user_expiry_idx
  on public.world_unreal_sessions (user_id, expires_at desc);
create index if not exists world_unreal_sessions_expiry_idx
  on public.world_unreal_sessions (expires_at);

alter table public.world_unreal_sessions enable row level security;
revoke all on table public.world_unreal_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.world_unreal_sessions to service_role;

create or replace function public.world_unreal_redeem_ticket(
  p_ticket_hash text,
  p_device text,
  p_session_token_hash text,
  p_session_ttl_seconds integer default 1800
)
returns table(user_id uuid, auth_session_id uuid)
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid;
  v_auth_session uuid;
  v_ttl integer := least(greatest(coalesce(p_session_ttl_seconds, 1800), 60), 1800);
begin
  if p_ticket_hash !~ '^[0-9a-f]{64}$' or p_session_token_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  update public.world_unreal_launch_tickets as t
  set redeemed_at = now(),
      redeemed_device = left(coalesce(p_device, ''), 128)
  where t.ticket_hash = p_ticket_hash
    and t.redeemed_at is null
    and t.expires_at > now()
  returning t.user_id, t.auth_session_id into v_user, v_auth_session;

  if v_user is null then
    return;
  end if;

  if not exists (
    select 1
    from auth.sessions as s
    where s.id = v_auth_session
      and s.user_id = v_user
  ) then
    return;
  end if;

  insert into public.world_unreal_sessions (
    token_hash, user_id, auth_session_id, device, client, expires_at
  ) values (
    p_session_token_hash,
    v_user,
    v_auth_session,
    left(coalesce(p_device, ''), 128),
    'unreal',
    now() + make_interval(secs => v_ttl)
  )
  on conflict (token_hash) do nothing;

  if not found then
    return;
  end if;

  return query select v_user, v_auth_session;
end;
$$;

revoke all on function public.world_unreal_redeem_ticket(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.world_unreal_redeem_ticket(text, text, text, integer) to service_role;
