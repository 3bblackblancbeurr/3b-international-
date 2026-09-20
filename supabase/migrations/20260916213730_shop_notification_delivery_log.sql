create table if not exists public.shop_notification_log (
  stripe_session_id text not null references public.shop_orders(stripe_session_id) on delete cascade,
  event text not null check (event in ('payment_confirmed','seller_accepted','shipped')),
  channel text not null check (channel in ('email','sms')),
  state text not null default 'pending' check (state in ('pending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_id text,
  last_error text,
  updated_at timestamptz not null default now(),
  primary key (stripe_session_id, event, channel)
);
alter table public.shop_notification_log enable row level security;
revoke all on table public.shop_notification_log from anon, authenticated;
grant all on table public.shop_notification_log to service_role;
