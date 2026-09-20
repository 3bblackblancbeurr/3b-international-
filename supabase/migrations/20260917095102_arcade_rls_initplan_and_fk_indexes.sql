begin;

drop policy if exists arcade_owner_read on public.arcade_saves;
create policy arcade_owner_read on public.arcade_saves for select to anon, authenticated
using (
  player_key = encode(sha256(convert_to(coalesce((select current_setting('request.headers', true))::json ->> 'x-game-token',''),'UTF8')), 'hex')
  and ((select current_setting('request.headers', true))::json ->> 'x-game-token') ~ '^[a-f0-9]{64}$'
);

drop policy if exists arcade_owner_insert on public.arcade_saves;
create policy arcade_owner_insert on public.arcade_saves for insert to anon, authenticated
with check (
  player_key = encode(sha256(convert_to(coalesce((select current_setting('request.headers', true))::json ->> 'x-game-token',''),'UTF8')), 'hex')
  and ((select current_setting('request.headers', true))::json ->> 'x-game-token') ~ '^[a-f0-9]{64}$'
);

drop policy if exists arcade_owner_update on public.arcade_saves;
create policy arcade_owner_update on public.arcade_saves for update to anon, authenticated
using (
  player_key = encode(sha256(convert_to(coalesce((select current_setting('request.headers', true))::json ->> 'x-game-token',''),'UTF8')), 'hex')
  and ((select current_setting('request.headers', true))::json ->> 'x-game-token') ~ '^[a-f0-9]{64}$'
)
with check (
  player_key = encode(sha256(convert_to(coalesce((select current_setting('request.headers', true))::json ->> 'x-game-token',''),'UTF8')), 'hex')
  and ((select current_setting('request.headers', true))::json ->> 'x-game-token') ~ '^[a-f0-9]{64}$'
);

create index if not exists community_chat_author_id_idx on public.community_chat(author_id);
create index if not exists community_follows_target_id_idx on public.community_follows(target_id);
create index if not exists community_likes_user_id_idx on public.community_likes(user_id);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists studio_assets_user_id_idx on public.studio_assets(user_id);

commit;
