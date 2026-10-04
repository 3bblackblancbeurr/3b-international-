-- Explicit stock (or an owner-approved preorder quota), isolated by Stripe mode.
-- No inventory quantities are invented or seeded by this migration.
create table public.shop_inventory (
  price_id text not null check (price_id ~ '^price_[A-Za-z0-9]+$'),
  livemode boolean not null,
  available integer not null check (available >= 0),
  updated_at timestamptz not null default now(),
  primary key (price_id, livemode)
);
create table public.shop_inventory_reservations (
  token text not null check (token ~ '^[a-f0-9]{64}$'),
  livemode boolean not null,
  items jsonb not null,
  state text not null default 'reserved' check (state in ('reserved','committed','released')),
  session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (token, livemode)
);
alter table public.shop_inventory enable row level security;
alter table public.shop_inventory_reservations enable row level security;
revoke all on public.shop_inventory, public.shop_inventory_reservations from public, anon, authenticated;
grant all on public.shop_inventory, public.shop_inventory_reservations to service_role;

create function public.shop_reserve_inventory(p_token text,p_livemode boolean,p_items jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_items jsonb; v_existing public.shop_inventory_reservations; v_item jsonb; v_available integer;
begin
  if p_token is null or p_items is null or p_token !~ '^[a-f0-9]{64}$' or p_livemode is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 20 then return false; end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where
    coalesce(i->>'price','') !~ '^price_[A-Za-z0-9]+$' or coalesce(i->>'quantity','') !~ '^[1-5]$') then return false; end if;
  if (select count(distinct i->>'price') from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items)
    or (select sum((i->>'quantity')::int) from jsonb_array_elements(p_items) i) > 20 then return false; end if;
  select jsonb_agg(jsonb_build_object('price',i->>'price','quantity',(i->>'quantity')::int) order by i->>'price')
    into v_items from jsonb_array_elements(p_items) i;
  perform pg_advisory_xact_lock(hashtextextended(p_token || p_livemode::text,0));
  select * into v_existing from public.shop_inventory_reservations where token=p_token and livemode=p_livemode;
  if found then return v_existing.items=v_items and v_existing.state in ('reserved','committed'); end if;
  -- Sorted row locks prevent both overselling and opposite-order deadlocks.
  for v_item in select value from jsonb_array_elements(v_items) loop
    select available into v_available from public.shop_inventory where price_id=v_item->>'price' and livemode=p_livemode for update;
    if not found or v_available < (v_item->>'quantity')::int then return false; end if;
  end loop;
  for v_item in select value from jsonb_array_elements(v_items) loop
    update public.shop_inventory set available=available-(v_item->>'quantity')::int,updated_at=now()
      where price_id=v_item->>'price' and livemode=p_livemode;
  end loop;
  insert into public.shop_inventory_reservations(token,livemode,items) values(p_token,p_livemode,v_items);
  return true;
end $$;

create function public.shop_commit_inventory(p_token text,p_livemode boolean,p_session_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_row public.shop_inventory_reservations;
begin
  if p_session_id is null or p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' then return false; end if;
  select * into v_row from public.shop_inventory_reservations where token=p_token and livemode=p_livemode for update;
  if not found or v_row.state='released' then return false; end if;
  if v_row.state='committed' then return v_row.session_id=p_session_id; end if;
  update public.shop_inventory_reservations set state='committed',session_id=p_session_id,updated_at=now() where token=p_token and livemode=p_livemode;
  return true;
end $$;

create function public.shop_release_inventory(p_token text,p_livemode boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_row public.shop_inventory_reservations; v_item jsonb;
begin
  select * into v_row from public.shop_inventory_reservations where token=p_token and livemode=p_livemode for update;
  if not found then return false; end if;
  if v_row.state='released' then return true; end if;
  if v_row.state='committed' then return false; end if;
  for v_item in select value from jsonb_array_elements(v_row.items) loop
    update public.shop_inventory set available=available+(v_item->>'quantity')::int,updated_at=now()
      where price_id=v_item->>'price' and livemode=p_livemode;
  end loop;
  update public.shop_inventory_reservations set state='released',updated_at=now() where token=p_token and livemode=p_livemode;
  return true;
end $$;
revoke all on function public.shop_reserve_inventory(text,boolean,jsonb), public.shop_commit_inventory(text,boolean,text), public.shop_release_inventory(text,boolean) from public, anon, authenticated;
grant execute on function public.shop_reserve_inventory(text,boolean,jsonb), public.shop_commit_inventory(text,boolean,text), public.shop_release_inventory(text,boolean) to service_role;
