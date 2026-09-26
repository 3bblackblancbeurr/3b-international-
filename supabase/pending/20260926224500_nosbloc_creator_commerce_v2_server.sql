begin;

create table if not exists public.nosbloc_product_recipients (
  product_id uuid not null references public.nosbloc_products(product_id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete restrict,
  share_bps integer not null check(share_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  primary key(product_id,creator_id)
);
create index if not exists nosbloc_product_recipients_creator_idx
  on public.nosbloc_product_recipients(creator_id,product_id);

alter table public.nosbloc_product_recipients enable row level security;
revoke all on public.nosbloc_product_recipients from public,anon,authenticated;
grant select,insert,update,delete on public.nosbloc_product_recipients to service_role;

create or replace function public.nosbloc_record_paid_order_server(
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_livemode boolean,
  p_order uuid,
  p_session text,
  p_intent text,
  p_gross_cents integer,
  p_currency text
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_order public.nosbloc_orders%rowtype;
  v_allocation record;
  v_inserted integer;
begin
  insert into public.nosbloc_stripe_events(
    event_id,event_type,livemode,object_id,payload_hash
  ) values(
    p_event_id,left(coalesce(p_event_type,''),120),p_livemode,p_session,p_payload_hash
  )
  on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;

  select * into v_order
  from public.nosbloc_orders
  where order_id=p_order
  for update;

  if not found
     or v_order.status<>'pending'
     or v_order.gross_cents<>p_gross_cents
     or v_order.currency<>p_currency
     or v_order.stripe_session_id is distinct from p_session
     or v_order.environment<>(case when p_livemode then 'live' else 'test' end)
  then
    raise exception 'nosbloc_paid_order_mismatch';
  end if;

  if p_session !~ '^cs_(test_|live_)?[A-Za-z0-9]+$'
     or p_intent !~ '^pi_[A-Za-z0-9]+$'
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_currency<>'eur'
  then
    raise exception 'nosbloc_paid_order_invalid';
  end if;

  if not exists(
    select 1 from public.nosbloc_order_allocations where order_id=p_order
  ) or (
    select coalesce(sum(gross_share_cents),0)
    from public.nosbloc_order_allocations
    where order_id=p_order
  )<>p_gross_cents then
    raise exception 'nosbloc_allocation_mismatch';
  end if;

  update public.nosbloc_orders
  set status='paid',
      payment_intent_id=p_intent,
      paid_at=coalesce(paid_at,now()),
      updated_at=now()
  where order_id=p_order;

  for v_allocation in
    select * from public.nosbloc_order_allocations
    where order_id=p_order
    order by creator_id
  loop
    insert into public.nosbloc_real_money_ledger(
      creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
      currency,idempotency_key,stripe_object_id,metadata
    ) values(
      v_allocation.creator_id,p_order,v_allocation.allocation_id,
      'sale_pending','pending',v_allocation.creator_net_cents,'eur',
      'paid:'||p_order::text||':'||v_allocation.allocation_id::text||':creator',
      p_intent,jsonb_build_object('share_bps',v_allocation.share_bps)
    ) on conflict(idempotency_key) do nothing;

    if v_allocation.platform_fee_cents>0 then
      insert into public.nosbloc_real_money_ledger(
        creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
        currency,idempotency_key,stripe_object_id,metadata
      ) values(
        null,p_order,v_allocation.allocation_id,
        'platform_fee','platform',v_allocation.platform_fee_cents,'eur',
        'paid:'||p_order::text||':'||v_allocation.allocation_id::text||':platform',
        p_intent,jsonb_build_object('creator_id',v_allocation.creator_id)
      ) on conflict(idempotency_key) do nothing;
    end if;
  end loop;

  return jsonb_build_object('ok',true,'duplicate',false,'orderId',p_order);
end
$$;

create or replace function public.nosbloc_record_refund_server(
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_livemode boolean,
  p_intent text,
  p_refunded_cents integer,
  p_currency text
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_order public.nosbloc_orders%rowtype;
  v_allocation record;
  v_previous integer;
  v_delta_creator integer;
  v_delta_platform integer;
  v_new_creator integer;
  v_old_creator integer;
  v_new_platform integer;
  v_old_platform integer;
  v_inserted integer;
begin
  insert into public.nosbloc_stripe_events(
    event_id,event_type,livemode,object_id,payload_hash
  ) values(
    p_event_id,left(coalesce(p_event_type,''),120),p_livemode,p_intent,p_payload_hash
  )
  on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;

  select * into v_order
  from public.nosbloc_orders
  where payment_intent_id=p_intent
  for update;

  if not found
     or v_order.environment<>(case when p_livemode then 'live' else 'test' end)
     or v_order.currency<>p_currency
     or p_currency<>'eur'
     or p_refunded_cents<0
     or p_refunded_cents>v_order.gross_cents
     or p_refunded_cents<v_order.refunded_cents
  then
    raise exception 'nosbloc_refund_mismatch';
  end if;

  v_previous:=v_order.refunded_cents;
  if p_refunded_cents=v_previous then
    return jsonb_build_object('ok',true,'duplicate',false,'unchanged',true);
  end if;

  update public.nosbloc_orders
  set refunded_cents=p_refunded_cents,
      status=case when p_refunded_cents=v_order.gross_cents then 'refunded' else 'partially_refunded' end,
      updated_at=now()
  where order_id=v_order.order_id;

  for v_allocation in
    select * from public.nosbloc_order_allocations
    where order_id=v_order.order_id
    order by creator_id
  loop
    v_new_creator:=least(
      v_allocation.creator_net_cents,
      ceil(v_allocation.creator_net_cents::numeric*p_refunded_cents/v_order.gross_cents)::integer
    );
    v_old_creator:=least(
      v_allocation.creator_net_cents,
      ceil(v_allocation.creator_net_cents::numeric*v_previous/v_order.gross_cents)::integer
    );
    v_delta_creator:=greatest(0,v_new_creator-v_old_creator);

    v_new_platform:=least(
      v_allocation.platform_fee_cents,
      ceil(v_allocation.platform_fee_cents::numeric*p_refunded_cents/v_order.gross_cents)::integer
    );
    v_old_platform:=least(
      v_allocation.platform_fee_cents,
      ceil(v_allocation.platform_fee_cents::numeric*v_previous/v_order.gross_cents)::integer
    );
    v_delta_platform:=greatest(0,v_new_platform-v_old_platform);

    if v_delta_creator>0 then
      insert into public.nosbloc_real_money_ledger(
        creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
        currency,idempotency_key,stripe_object_id,metadata
      ) values(
        v_allocation.creator_id,v_order.order_id,v_allocation.allocation_id,
        'refund','pending',-v_delta_creator,'eur',
        'refund:'||p_event_id||':'||v_allocation.allocation_id::text||':creator',
        p_intent,jsonb_build_object('total_refunded_cents',p_refunded_cents)
      ) on conflict(idempotency_key) do nothing;
    end if;

    if v_delta_platform>0 then
      insert into public.nosbloc_real_money_ledger(
        creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
        currency,idempotency_key,stripe_object_id,metadata
      ) values(
        null,v_order.order_id,v_allocation.allocation_id,
        'refund','platform',-v_delta_platform,'eur',
        'refund:'||p_event_id||':'||v_allocation.allocation_id::text||':platform',
        p_intent,jsonb_build_object('creator_id',v_allocation.creator_id,'total_refunded_cents',p_refunded_cents)
      ) on conflict(idempotency_key) do nothing;
    end if;

    update public.nosbloc_order_allocations
    set transfer_status=case
      when transfer_status in('transferred','reversed') then 'blocked'
      else transfer_status
    end
    where allocation_id=v_allocation.allocation_id;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'orderId',v_order.order_id,
    'refundedCents',p_refunded_cents
  );
end
$$;

create or replace function public.nosbloc_record_dispute_server(
  p_event_id text,
  p_event_type text,
  p_payload_hash text,
  p_livemode boolean,
  p_intent text,
  p_status text
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_order public.nosbloc_orders%rowtype;
  v_inserted integer;
begin
  insert into public.nosbloc_stripe_events(
    event_id,event_type,livemode,object_id,payload_hash
  ) values(
    p_event_id,left(coalesce(p_event_type,''),120),p_livemode,p_intent,p_payload_hash
  )
  on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;

  select * into v_order
  from public.nosbloc_orders
  where payment_intent_id=p_intent
  for update;

  if not found
     or v_order.environment<>(case when p_livemode then 'live' else 'test' end)
  then
    raise exception 'nosbloc_dispute_mismatch';
  end if;

  update public.nosbloc_orders
  set status='disputed',updated_at=now()
  where order_id=v_order.order_id;

  update public.nosbloc_order_allocations
  set transfer_status='blocked'
  where order_id=v_order.order_id
    and transfer_status<>'reversed';

  insert into public.nosbloc_real_money_ledger(
    creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
    currency,idempotency_key,stripe_object_id,metadata
  )
  select
    creator_id,v_order.order_id,allocation_id,'dispute','pending',-1,
    'eur','dispute:'||p_event_id||':'||allocation_id::text,p_intent,
    jsonb_build_object('marker',true,'status',left(coalesce(p_status,''),40))
  from public.nosbloc_order_allocations
  where order_id=v_order.order_id
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'orderId',v_order.order_id,'blocked',true);
end
$$;

create or replace function public.nosbloc_release_eligible_allocations_server(
  p_limit integer default 50
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_row record;
  v_pending bigint;
  v_count integer:=0;
begin
  if not exists(
    select 1 from public.nosbloc_commerce_config
    where singleton=true and commerce_enabled and connect_enabled and payouts_enabled
  ) then
    raise exception 'nosbloc_payouts_locked';
  end if;

  for v_row in
    select a.*
    from public.nosbloc_order_allocations a
    join public.nosbloc_orders o on o.order_id=a.order_id
    join public.nosbloc_connected_accounts c on c.user_id=a.creator_id
    where a.transfer_status='withheld'
      and o.status in('paid','partially_refunded')
      and o.paid_at<=now()-interval '14 days'
      and c.onboarding_status='verified'
      and c.transfers_enabled=true
    order by o.paid_at,a.allocation_id
    limit greatest(1,least(coalesce(p_limit,50),200))
    for update of a skip locked
  loop
    select coalesce(sum(amount_cents),0)
    into v_pending
    from public.nosbloc_real_money_ledger
    where allocation_id=v_row.allocation_id
      and creator_id=v_row.creator_id
      and bucket='pending';

    if v_pending>0 then
      insert into public.nosbloc_real_money_ledger(
        creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
        currency,idempotency_key,metadata
      ) values(
        v_row.creator_id,v_row.order_id,v_row.allocation_id,
        'sale_available','pending',-v_pending,'eur',
        'release:'||v_row.allocation_id::text||':pending',
        jsonb_build_object('hold_days',14)
      ) on conflict(idempotency_key) do nothing;

      insert into public.nosbloc_real_money_ledger(
        creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
        currency,idempotency_key,metadata
      ) values(
        v_row.creator_id,v_row.order_id,v_row.allocation_id,
        'sale_available','available',v_pending,'eur',
        'release:'||v_row.allocation_id::text||':available',
        jsonb_build_object('hold_days',14)
      ) on conflict(idempotency_key) do nothing;

      update public.nosbloc_order_allocations
      set transfer_status='ready'
      where allocation_id=v_row.allocation_id;

      v_count:=v_count+1;
    end if;
  end loop;

  return jsonb_build_object('ok',true,'released',v_count);
end
$$;

create or replace function public.nosbloc_record_transfer_server(
  p_allocation uuid,
  p_transfer text,
  p_amount_cents integer
) returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_row public.nosbloc_order_allocations%rowtype;
  v_available bigint;
begin
  if p_transfer !~ '^tr_[A-Za-z0-9]+$' or p_amount_cents<=0 then
    raise exception 'nosbloc_transfer_invalid';
  end if;

  select * into v_row
  from public.nosbloc_order_allocations
  where allocation_id=p_allocation
  for update;

  if not found then
    raise exception 'nosbloc_allocation_missing';
  end if;

  if v_row.transfer_status='transferred'
     and v_row.stripe_transfer_id=p_transfer
  then
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;

  if v_row.transfer_status<>'ready' then
    raise exception 'nosbloc_allocation_not_ready';
  end if;

  select coalesce(sum(amount_cents),0)
  into v_available
  from public.nosbloc_real_money_ledger
  where allocation_id=p_allocation
    and creator_id=v_row.creator_id
    and bucket='available';

  if v_available<>p_amount_cents then
    raise exception 'nosbloc_transfer_amount_mismatch';
  end if;

  insert into public.nosbloc_real_money_ledger(
    creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
    currency,idempotency_key,stripe_object_id
  ) values(
    v_row.creator_id,v_row.order_id,p_allocation,
    'sale_transfer','available',-p_amount_cents,'eur',
    'transfer:'||p_allocation::text||':available',p_transfer
  );

  insert into public.nosbloc_real_money_ledger(
    creator_id,order_id,allocation_id,entry_type,bucket,amount_cents,
    currency,idempotency_key,stripe_object_id
  ) values(
    v_row.creator_id,v_row.order_id,p_allocation,
    'sale_transfer','paid_out',p_amount_cents,'eur',
    'transfer:'||p_allocation::text||':paid_out',p_transfer
  );

  update public.nosbloc_order_allocations
  set transfer_status='transferred',
      stripe_transfer_id=p_transfer,
      transferred_at=now()
  where allocation_id=p_allocation;

  return jsonb_build_object('ok',true,'duplicate',false);
end
$$;

revoke all on function public.nosbloc_record_paid_order_server(text,text,text,boolean,uuid,text,text,integer,text)
from public,anon,authenticated;
revoke all on function public.nosbloc_record_refund_server(text,text,text,boolean,text,integer,text)
from public,anon,authenticated;
revoke all on function public.nosbloc_record_dispute_server(text,text,text,boolean,text,text)
from public,anon,authenticated;
revoke all on function public.nosbloc_release_eligible_allocations_server(integer)
from public,anon,authenticated;
revoke all on function public.nosbloc_record_transfer_server(uuid,text,integer)
from public,anon,authenticated;

grant execute on function public.nosbloc_record_paid_order_server(text,text,text,boolean,uuid,text,text,integer,text)
to service_role;
grant execute on function public.nosbloc_record_refund_server(text,text,text,boolean,text,integer,text)
to service_role;
grant execute on function public.nosbloc_record_dispute_server(text,text,text,boolean,text,text)
to service_role;
grant execute on function public.nosbloc_release_eligible_allocations_server(integer)
to service_role;
grant execute on function public.nosbloc_record_transfer_server(uuid,text,integer)
to service_role;

commit;
