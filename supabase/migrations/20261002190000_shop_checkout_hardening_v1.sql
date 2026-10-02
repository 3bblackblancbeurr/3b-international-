-- Private commerce hardening. Deploy before the application code that calls these RPCs.

alter table public.shop_orders
  add column if not exists amount_refunded bigint not null default 0,
  add column if not exists refund_status text not null default 'none',
  add column if not exists refunded_at timestamptz;

alter table public.shop_orders drop constraint if exists shop_orders_amount_refunded_check;
alter table public.shop_orders add constraint shop_orders_amount_refunded_check
  check (amount_refunded >= 0 and amount_refunded <= amount_total);

alter table public.shop_orders drop constraint if exists shop_orders_refund_status_check;
alter table public.shop_orders add constraint shop_orders_refund_status_check
  check (
    (refund_status = 'none' and amount_refunded = 0)
    or (refund_status = 'partial' and amount_refunded > 0 and amount_refunded < amount_total)
    or (refund_status = 'full' and amount_refunded = amount_total and amount_total > 0)
  );

create unique index if not exists shop_orders_payment_intent_unique_idx
  on public.shop_orders(payment_intent_id)
  where payment_intent_id is not null;

create table if not exists public.shop_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'seller' check (role in ('seller','manager')),
  created_at timestamptz not null default now()
);

alter table public.shop_staff enable row level security;
revoke all on table public.shop_staff from public, anon, authenticated;
grant select, insert, update, delete on table public.shop_staff to service_role;

create or replace function public.shop_apply_refund(
  p_payment_intent text,
  p_livemode boolean,
  p_amount_total bigint,
  p_amount_refunded bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.shop_orders%rowtype;
  v_status text;
begin
  if p_payment_intent !~ '^pi_[A-Za-z0-9]+$'
     or p_amount_total <= 0
     or p_amount_refunded <= 0
     or p_amount_refunded > p_amount_total then
    raise exception 'invalid_refund' using errcode = '22023';
  end if;

  select * into v_order
  from public.shop_orders
  where payment_intent_id = p_payment_intent
    and livemode = p_livemode
    and payment_status = 'paid'
  for update;

  if not found then
    return jsonb_build_object('found', false, 'applied', false);
  end if;
  if v_order.amount_total <> p_amount_total then
    raise exception 'refund_amount_mismatch' using errcode = '22023';
  end if;
  if p_amount_refunded <= v_order.amount_refunded then
    return jsonb_build_object(
      'found', true,
      'applied', false,
      'duplicate', true,
      'refundStatus', v_order.refund_status,
      'amountRefunded', v_order.amount_refunded
    );
  end if;

  v_status := case when p_amount_refunded = p_amount_total then 'full' else 'partial' end;
  update public.shop_orders
  set amount_refunded = p_amount_refunded,
      refund_status = v_status,
      refunded_at = now(),
      fulfillment_status = 'refunded',
      updated_at = now()
  where stripe_session_id = v_order.stripe_session_id;

  return jsonb_build_object(
    'found', true,
    'applied', true,
    'duplicate', false,
    'refundStatus', v_status,
    'amountRefunded', p_amount_refunded
  );
end
$$;

revoke all on function public.shop_apply_refund(text,boolean,bigint,bigint) from public, anon, authenticated;
grant execute on function public.shop_apply_refund(text,boolean,bigint,bigint) to service_role;

create or replace function public.shop_claim_notification(
  p_session_id text,
  p_event text,
  p_channel text,
  p_max_attempts integer default 5
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt integer;
begin
  if p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
     or p_event not in ('payment_confirmed','seller_accepted','shipped')
     or p_channel not in ('email','sms')
     or p_max_attempts < 1
     or p_max_attempts > 10 then
    raise exception 'invalid_notification_claim' using errcode = '22023';
  end if;

  insert into public.shop_notification_log(
    stripe_session_id, event, channel, state, attempts, provider_id, last_error, updated_at
  ) values (
    p_session_id, p_event, p_channel, 'pending', 1, null, null, now()
  )
  on conflict (stripe_session_id, event, channel) do nothing
  returning attempts into v_attempt;

  if v_attempt is not null then return v_attempt; end if;

  update public.shop_notification_log
  set state = 'pending',
      attempts = attempts + 1,
      provider_id = null,
      last_error = null,
      updated_at = now()
  where stripe_session_id = p_session_id
    and event = p_event
    and channel = p_channel
    and attempts < p_max_attempts
    and (
      state = 'failed'
      or (state = 'pending' and updated_at < now() - interval '5 minutes')
    )
  returning attempts into v_attempt;

  return coalesce(v_attempt, 0);
end
$$;

revoke all on function public.shop_claim_notification(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.shop_claim_notification(text,text,text,integer) to service_role;
