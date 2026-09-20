begin;

create table if not exists public.sponsor_slots(
 code text primary key,
 placement text not null check(placement in ('world','games','event','tournament','community')),
 sponsor_name text,
 label text not null,
 destination_url text,
 starts_at timestamptz,
 ends_at timestamptz,
 active boolean not null default false,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object')
);
alter table public.sponsor_slots enable row level security;
revoke all on public.sponsor_slots from public,anon,authenticated;
grant select on public.sponsor_slots to authenticated;
grant all on public.sponsor_slots to service_role;
drop policy if exists sponsor_slots_read_active on public.sponsor_slots;
create policy sponsor_slots_read_active on public.sponsor_slots for select to authenticated using(active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));

insert into public.sponsor_slots(code,placement,label,active,metadata) values
 ('world_partner','world','Partenaire du Monde 3B',false,'{"placeholder":true}'::jsonb),
 ('games_partner','games','Partenaire des Jeux 3B',false,'{"placeholder":true}'::jsonb),
 ('tournament_partner','tournament','Partenaire Tournoi 3B',false,'{"placeholder":true}'::jsonb)
on conflict(code) do nothing;

create or replace view public.marketplace_active_catalog with(security_invoker=true) as
select l.id listing_id,l.item_instance_id,l.seller_id,l.price_coins,l.created_at,
 i.item_code,i.serial_no,i.metadata item_metadata,d.name,d.description,d.item_type,d.rarity,d.permanent,d.tradeable,d.marketable,d.max_supply,d.minted_count
from public.marketplace_listings l
join public.item_instances i on i.id=l.item_instance_id
join public.inventory_items d on d.code=i.item_code
where l.status='active' and l.seller_id is not null and i.state='listed' and i.owner_id=l.seller_id and d.active=true and d.marketable=true;
revoke all on public.marketplace_active_catalog from public,anon,authenticated;
grant select on public.marketplace_active_catalog to service_role;

create or replace view public.subscription_public_catalog with(security_invoker=true) as
select code,name,monthly_price_cents,currency,description,benefits,sort_order
from public.subscription_plans where active=true;
revoke all on public.subscription_public_catalog from public,anon;
grant select on public.subscription_public_catalog to authenticated,service_role;

create index if not exists sponsor_slots_active_window_idx on public.sponsor_slots(active,starts_at,ends_at);
create index if not exists paid_events_active_window_idx on public.paid_events(active,starts_at,ends_at);

commit;
