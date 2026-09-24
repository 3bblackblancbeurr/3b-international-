alter table public.pwa_quickkit_entitlements
  drop constraint if exists pwa_quickkit_entitlements_stripe_customer_id_key;

create index if not exists pwa_quickkit_entitlements_customer_idx
  on public.pwa_quickkit_entitlements (stripe_customer_id);

create table if not exists public.pwa_quickkit_rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  hits integer not null default 1 check (hits >= 0),
  updated_at timestamptz not null default now()
);

alter table public.pwa_quickkit_rate_limits enable row level security;
revoke all on table public.pwa_quickkit_rate_limits from anon, authenticated;

create or replace function public.pwa_quickkit_consume_rate_limit(
  p_key text,
  p_limit integer default 30,
  p_window_minutes integer default 1440
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
begin
  if p_key !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid key';
  end if;
  if p_limit < 1 or p_limit > 1000 or p_window_minutes < 1 or p_window_minutes > 10080 then
    raise exception 'invalid rate limit';
  end if;

  insert into public.pwa_quickkit_rate_limits as r (key_hash, window_started_at, hits, updated_at)
  values (p_key, now(), 1, now())
  on conflict (key_hash) do update
    set hits = case
      when r.window_started_at <= now() - make_interval(mins => p_window_minutes) then 1
      else r.hits + 1
    end,
    window_started_at = case
      when r.window_started_at <= now() - make_interval(mins => p_window_minutes) then now()
      else r.window_started_at
    end,
    updated_at = now()
  returning hits <= p_limit into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.pwa_quickkit_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.pwa_quickkit_consume_rate_limit(text, integer, integer) to service_role;

comment on table public.pwa_quickkit_rate_limits is
  'Server-only hashed client rate limits for PWA QuickKit. No raw IP address is stored.';
