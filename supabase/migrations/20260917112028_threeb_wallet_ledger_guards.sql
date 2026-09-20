create table if not exists public.threeb_wallet_ledger (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 event_key text not null,
 event_id text not null,
 xp_delta integer not null default 0,
 coins_delta integer not null default 0,
 created_at timestamptz not null default now(),
 constraint threeb_wallet_delta_bounds check (xp_delta between -1000000 and 1000000 and coins_delta between -1000000 and 1000000),
 unique(user_id,event_key,event_id)
);
alter table public.threeb_wallet_ledger enable row level security;
drop policy if exists "wallet_ledger_read_own" on public.threeb_wallet_ledger;
create policy "wallet_ledger_read_own" on public.threeb_wallet_ledger for select to authenticated using (auth.uid()=user_id);
revoke insert,update,delete on public.threeb_wallet_ledger from authenticated;
create index if not exists threeb_wallet_ledger_user_created_idx on public.threeb_wallet_ledger(user_id,created_at desc);
create table if not exists public.threeb_economy_flags (
 singleton boolean primary key default true check(singleton),
 token_enabled boolean not null default false,
 token_blockchain_enabled boolean not null default false,
 token_trading_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.threeb_economy_flags(singleton,token_enabled,token_blockchain_enabled,token_trading_enabled) values(true,false,false,false) on conflict(singleton) do update set token_enabled=false,token_blockchain_enabled=false,token_trading_enabled=false,updated_at=now();
alter table public.threeb_economy_flags enable row level security;
drop policy if exists "economy_flags_read" on public.threeb_economy_flags;
create policy "economy_flags_read" on public.threeb_economy_flags for select to authenticated using(true);
revoke insert,update,delete on public.threeb_economy_flags from authenticated;
