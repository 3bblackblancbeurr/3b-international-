create table if not exists public.arcade_saves (
 player_key text primary key check (player_key ~ '^[a-f0-9]{64}$'),
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 180000),
 updated_at timestamptz not null default now()
);
alter table public.arcade_saves enable row level security;
revoke all on public.arcade_saves from anon, authenticated;
grant select, insert, update on public.arcade_saves to anon, authenticated;
create policy "arcade_owner_read" on public.arcade_saves for select to anon, authenticated
using (player_key = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::json->>'x-game-token',''),'UTF8')),'hex') and (current_setting('request.headers', true)::json->>'x-game-token') ~ '^[a-f0-9]{64}$');
create policy "arcade_owner_insert" on public.arcade_saves for insert to anon, authenticated
with check (player_key = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::json->>'x-game-token',''),'UTF8')),'hex') and (current_setting('request.headers', true)::json->>'x-game-token') ~ '^[a-f0-9]{64}$');
create policy "arcade_owner_update" on public.arcade_saves for update to anon, authenticated
using (player_key = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::json->>'x-game-token',''),'UTF8')),'hex') and (current_setting('request.headers', true)::json->>'x-game-token') ~ '^[a-f0-9]{64}$')
with check (player_key = encode(sha256(convert_to(coalesce(current_setting('request.headers', true)::json->>'x-game-token',''),'UTF8')),'hex') and (current_setting('request.headers', true)::json->>'x-game-token') ~ '^[a-f0-9]{64}$');
