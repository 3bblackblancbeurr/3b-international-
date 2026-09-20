create table if not exists public.nexus_rarity_config (
  rarity text primary key,
  weight_per_billion bigint not null check (weight_per_billion > 0),
  supply_cap integer null check (supply_cap is null or supply_cap > 0)
);

insert into public.nexus_rarity_config(rarity,weight_per_billion,supply_cap) values
  ('common',700000000,null),
  ('rare',200000000,null),
  ('epic',70000000,null),
  ('special',20000000,null),
  ('ultra-rare',8000000,null),
  ('legendary',1900000,null),
  ('ultimate',99999,8),
  ('unique',1,1)
on conflict (rarity) do update set weight_per_billion=excluded.weight_per_billion,supply_cap=excluded.supply_cap;

create table if not exists public.nexus_collectible_catalog (
  item_id text primary key,
  name text not null,
  family text not null check (family in ('building','object','skin','weapon','companion','vehicle')),
  rarity text not null references public.nexus_rarity_config(rarity),
  country text null check (country is null or country in ('france','estonie','espagne','italie','maroc','algerie','tunisie','turquie','3b')),
  supply_cap integer null check (supply_cap is null or supply_cap > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.nexus_collectible_claims (
  claim_id uuid primary key default gen_random_uuid(),
  item_id text not null references public.nexus_collectible_catalog(item_id),
  user_id uuid not null references auth.users(id) on delete cascade,
  copy_no integer null check (copy_no is null or copy_no > 0),
  source_key text not null check (char_length(source_key) between 1 and 160),
  claimed_at timestamptz not null default now(),
  unique(user_id,source_key),
  unique(item_id,copy_no)
);

create index if not exists nexus_collectible_claims_user_idx on public.nexus_collectible_claims(user_id,claimed_at desc);
create index if not exists nexus_collectible_claims_item_idx on public.nexus_collectible_claims(item_id,claimed_at asc);

alter table public.nexus_rarity_config enable row level security;
alter table public.nexus_collectible_catalog enable row level security;
alter table public.nexus_collectible_claims enable row level security;
revoke all on table public.nexus_rarity_config from anon,authenticated;
revoke all on table public.nexus_collectible_catalog from anon,authenticated;
revoke all on table public.nexus_collectible_claims from anon,authenticated;

create or replace function public.nexus_enforce_collectible_supply()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  cap integer;
  next_copy integer;
begin
  select coalesce(c.supply_cap,r.supply_cap)
  into cap
  from public.nexus_collectible_catalog c
  join public.nexus_rarity_config r on r.rarity=c.rarity
  where c.item_id=new.item_id and c.active=true;
  if not found then raise exception 'collectible_unavailable'; end if;
  if cap is null then
    new.copy_no := null;
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.item_id));
  select coalesce(max(copy_no),0)+1 into next_copy from public.nexus_collectible_claims where item_id=new.item_id;
  if next_copy > cap then raise exception 'collectible_supply_exhausted'; end if;
  new.copy_no := next_copy;
  return new;
end;
$$;

drop trigger if exists nexus_collectible_supply_guard on public.nexus_collectible_claims;
create trigger nexus_collectible_supply_guard
before insert on public.nexus_collectible_claims
for each row execute function public.nexus_enforce_collectible_supply();

create or replace function public.nexus_rarity_from_ticket(p_ticket bigint)
returns text
language sql
immutable
strict
set search_path=''
as $$
  select case
    when p_ticket between 0 and 699999999 then 'common'
    when p_ticket between 700000000 and 899999999 then 'rare'
    when p_ticket between 900000000 and 969999999 then 'epic'
    when p_ticket between 970000000 and 989999999 then 'special'
    when p_ticket between 990000000 and 997999999 then 'ultra-rare'
    when p_ticket between 998000000 and 999899999 then 'legendary'
    when p_ticket between 999900000 and 999999998 then 'ultimate'
    when p_ticket = 999999999 then 'unique'
    else null
  end;
$$;

create or replace function public.nexus_claim_collectible(p_user_id uuid,p_item_id text,p_source_key text)
returns table(claim_id uuid,item_id text,user_id uuid,copy_no integer,claimed_at timestamptz)
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_user_id is null or p_item_id is null or p_source_key is null then raise exception 'invalid_claim'; end if;
  return query
  insert into public.nexus_collectible_claims(item_id,user_id,source_key)
  values(p_item_id,p_user_id,left(p_source_key,160))
  on conflict (user_id,source_key) do nothing
  returning nexus_collectible_claims.claim_id,nexus_collectible_claims.item_id,nexus_collectible_claims.user_id,nexus_collectible_claims.copy_no,nexus_collectible_claims.claimed_at;
  if not found then
    return query select c.claim_id,c.item_id,c.user_id,c.copy_no,c.claimed_at from public.nexus_collectible_claims c where c.user_id=p_user_id and c.source_key=left(p_source_key,160) limit 1;
  end if;
end;
$$;

revoke all on function public.nexus_enforce_collectible_supply() from public;
revoke all on function public.nexus_rarity_from_ticket(bigint) from public;
revoke all on function public.nexus_claim_collectible(uuid,text,text) from public;
grant execute on function public.nexus_rarity_from_ticket(bigint) to service_role;
grant execute on function public.nexus_claim_collectible(uuid,text,text) to service_role;

insert into public.nexus_collectible_catalog(item_id,name,family,rarity,country,supply_cap) values
 ('maison-3b','Maison 3B','building','common','3b',null),
 ('atelier-3b','Atelier 3B','building','common','3b',null),
 ('jardin-3b','Jardin d’union','building','common','3b',null),
 ('tour-matrix','Tour Matrix','building','rare','3b',null),
 ('gare-horizon','Gare Horizon','building','epic','3b',null),
 ('hall-heritage','Hall de l’Héritage','building','special','3b',null),
 ('citadelle-bleue','Citadelle bleue','building','ultra-rare','3b',null),
 ('spire-champagne','Spire champagne','building','legendary','3b',null),
 ('nexus-ultime','Nexus Ultime','building','ultimate','3b',8),
 ('monolithe-unique','Monolithe Unique 3B','building','unique','3b',1)
on conflict (item_id) do update set name=excluded.name,family=excluded.family,rarity=excluded.rarity,country=excluded.country,supply_cap=excluded.supply_cap,active=true;
