create table if not exists public.pwa_quickkit_entitlements (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null unique,
  stripe_subscription_id text not null unique,
  customer_email text not null,
  status text not null check (status in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  access_token_hash text not null unique check (access_token_hash ~ '^[a-f0-9]{64}$'),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pwa_quickkit_entitlements_email_idx
  on public.pwa_quickkit_entitlements (lower(customer_email));

alter table public.pwa_quickkit_entitlements enable row level security;
revoke all on table public.pwa_quickkit_entitlements from anon, authenticated;

create table if not exists public.pwa_quickkit_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  processed_at timestamptz not null default now()
);

alter table public.pwa_quickkit_webhook_events enable row level security;
revoke all on table public.pwa_quickkit_webhook_events from anon, authenticated;

comment on table public.pwa_quickkit_entitlements is
  'Server-only PWA QuickKit subscription entitlement state. Client access is mediated by API tokens.';
comment on table public.pwa_quickkit_webhook_events is
  'Server-only Stripe webhook idempotency log for PWA QuickKit.';
