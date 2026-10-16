-- 16_18 ESPORT (association indépendante) : données minimales et modération.
-- Migration additive ; ne modifie aucune table métier 3B existante.
-- NE PAS stocker les pièces officielles ou des comptes de jeu dans ces tables.
create table if not exists public.esports_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('owner','manager','moderator')),
  created_at timestamptz not null default now()
);
alter table public.esports_staff enable row level security;
revoke all on public.esports_staff from anon,authenticated;
grant select on public.esports_staff to authenticated;
create policy "esports staff may read own role"
  on public.esports_staff for select to authenticated using (user_id=(select auth.uid()));

create table if not exists public.esports_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 pseudo text not null check(char_length(pseudo) between 2 and 36),
 game_id text not null check(char_length(game_id) between 2 and 40),
 role text not null check(char_length(role) between 2 and 60),
 platform text not null check(char_length(platform) between 2 and 32),
 availability text not null check(char_length(availability) between 2 and 60),
 note text not null default '' check(char_length(note)<=600),
 status text not null default 'pending' check(status in ('pending','trial','accepted','rejected')),
 created_at timestamptz not null default now(),
 unique(user_id,game_id)
);
create index if not exists esports_applications_status_created_idx on public.esports_applications(status,created_at desc);
alter table public.esports_applications enable row level security;
revoke all on public.esports_applications from anon,authenticated;
grant select,insert on public.esports_applications to authenticated;
grant update(status) on public.esports_applications to authenticated;
create policy "esports candidates and staff see appropriate applications"
 on public.esports_applications for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid())));
create policy "esports candidates can only submit pending applications"
 on public.esports_applications for insert to authenticated
 with check(user_id=(select auth.uid()) and status='pending' and
 coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy "only esports staff review applications"
 on public.esports_applications for update to authenticated
 using(exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid())))
 with check(exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid())));

create table if not exists public.esports_media (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 110),
 game_id text not null check(char_length(game_id) between 2 and 40),
 media_url text check(media_url is null or
  (char_length(media_url)<=500 and media_url ~* '^https://(www\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv|tiktok\.com)/')),
 storage_path text check(storage_path is null or char_length(storage_path)<=255),
 status text not null default 'pending' check(status in ('pending','published','rejected')),
 created_at timestamptz not null default now(),
 check((media_url is null) <> (storage_path is null))
);
create index if not exists esports_media_status_created_idx on public.esports_media(status,created_at desc);
alter table public.esports_media enable row level security;
revoke all on public.esports_media from anon,authenticated;
grant select on public.esports_media to anon,authenticated;
grant insert,update(status) on public.esports_media to authenticated;
create policy "public sees published media, owner own uploads, staff queue"
 on public.esports_media for select to anon,authenticated
 using(status='published' or user_id=(select auth.uid()) or exists(
 select 1 from public.esports_staff s where s.user_id=(select auth.uid())));
create policy "users submit media for review only"
 on public.esports_media for insert to authenticated
 with check(user_id=(select auth.uid()) and status='pending'
 and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
 and (storage_path is null or split_part(storage_path,'/',1)=(select auth.uid())::text));
create policy "only esports staff publish or refuse media"
 on public.esports_media for update to authenticated
 using(exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid())))
 with check(exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('esports-videos','esports-videos',false,31457280,array['video/mp4','video/webm'])
on conflict (id) do nothing;
create policy "esports user uploads into own folder"
 on storage.objects for insert to authenticated
 with check(bucket_id='esports-videos' and split_part(name,'/',1)=(select auth.uid())::text
 and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
create policy "esports own, public approved, or staff can view media"
 on storage.objects for select to anon,authenticated
 using(bucket_id='esports-videos' and
  (split_part(name,'/',1)=(select auth.uid())::text or
   exists(select 1 from public.esports_media m where m.storage_path=name and m.status='published') or
   exists(select 1 from public.esports_staff s where s.user_id=(select auth.uid()))));
create policy "esports authors can remove own pending media"
 on storage.objects for delete to authenticated
 using(bucket_id='esports-videos' and
 split_part(name,'/',1)=(select auth.uid())::text and
 not exists(select 1 from public.esports_media m where m.storage_path=name and m.status='published'));
-- Initial staff membership MUST be granted only after confirming the correct 3B auth.users ID.
-- No automatic owner role based on client values, email, display name, or metadata.
