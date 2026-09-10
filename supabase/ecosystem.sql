-- Additive installation: existing accounts, XP, games and orders are untouched.
begin;
create table public.community_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check(length(handle) between 3 and 24),
 name text not null check(length(name) between 2 and 80),
 bio text not null default '' check(length(bio)<=500),
 kind text not null default 'member' check(kind in ('member','creator')),
 listed boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.community_posts(
 id uuid primary key default gen_random_uuid(),author_id uuid not null references public.community_profiles(user_id),
 title text not null check(length(title) between 3 and 120),body text not null check(length(body) between 1 and 3000),
 category text not null check(category in ('discussion','creation','challenge','collaboration')),
 design jsonb,asset_path text,
 status text not null default 'visible' check(status in ('visible','hidden','removed')),
 created_at timestamptz not null default now()
);
create table public.community_likes(post_id uuid references public.community_posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.community_follows(user_id uuid references auth.users(id) on delete cascade,target_id uuid references public.community_profiles(user_id) on delete cascade,primary key(user_id,target_id),check(user_id<>target_id));
create table public.community_blocks(user_id uuid references auth.users(id) on delete cascade,target_id uuid references public.community_profiles(user_id) on delete cascade,primary key(user_id,target_id),check(user_id<>target_id));
create table public.community_chat(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.community_profiles(user_id),room text not null check(room in ('general','atelier','sport')),body text not null check(length(body) between 1 and 1500),status text not null default 'visible' check(status in ('visible','hidden','removed')),created_at timestamptz not null default now());
create table public.community_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,target_id uuid not null,kind text not null check(kind in ('post','chat')),reason text not null check(length(reason) between 3 and 500),status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now(),unique(user_id,target_id,kind));
create table public.community_staff(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.studio_assets(path text primary key,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table public.sport_cache(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create index community_posts_feed on public.community_posts(status,created_at desc);
create index community_chat_feed on public.community_chat(room,status,created_at desc);
create index community_blocks_target on public.community_blocks(target_id,user_id);

-- A narrow private lookup is needed to enforce blocking in both directions.
create function member_private.community_visible(p_author uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and member_private.session_active() and not exists(
 select 1 from public.community_blocks b where (b.user_id=auth.uid() and b.target_id=p_author) or (b.target_id=auth.uid() and b.user_id=p_author));
$$;
revoke all on function member_private.community_visible(uuid) from public,anon;
grant execute on function member_private.community_visible(uuid) to authenticated;

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_follows enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_chat enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_staff enable row level security;
alter table public.studio_assets enable row level security;
alter table public.sport_cache enable row level security;
revoke all on public.community_profiles,public.community_posts,public.community_likes,public.community_follows,public.community_blocks,public.community_chat,public.community_reports,public.community_staff,public.studio_assets,public.sport_cache from public,anon,authenticated;
grant select on public.community_profiles,public.community_posts,public.community_likes,public.community_follows,public.community_blocks,public.community_chat to authenticated;
grant all on public.community_profiles,public.community_posts,public.community_likes,public.community_follows,public.community_blocks,public.community_chat,public.community_reports,public.community_staff,public.studio_assets,public.sport_cache to service_role;
create policy community_profile_read on public.community_profiles for select to authenticated using((listed or user_id=(select auth.uid())) and member_private.community_visible(user_id));
create policy community_post_read on public.community_posts for select to authenticated using(status='visible' and member_private.community_visible(author_id) and exists(select 1 from public.community_profiles p where p.user_id=author_id and p.listed));
create policy community_chat_read on public.community_chat for select to authenticated using(status='visible' and member_private.community_visible(author_id) and exists(select 1 from public.community_profiles p where p.user_id=author_id and p.listed));
create policy community_likes_read on public.community_likes for select to authenticated using((select member_private.session_active()) and exists(select 1 from public.community_posts p where p.id=post_id));
create policy community_follows_read on public.community_follows for select to authenticated using(user_id=(select auth.uid()) and (select member_private.session_active()));
create policy community_blocks_read on public.community_blocks for select to authenticated using(user_id=(select auth.uid()) and (select member_private.session_active()));
alter publication supabase_realtime add table public.community_chat,public.community_posts,public.community_likes;
create view public.community_ranked_posts with(security_invoker=true) as select p.*, (select count(*)::integer from public.community_likes l where l.post_id=p.id) as votes from public.community_posts p;
grant select on public.community_ranked_posts to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('studio-3b','studio-3b',false,12582912,array['image/png','image/webp','image/jpeg']);
commit;
