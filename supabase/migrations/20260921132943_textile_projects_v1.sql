begin;
create table public.textile_projects(
 id uuid primary key,
 user_id uuid not null references public.member_profiles(user_id) on delete cascade,
 title text not null check(length(title) between 3 and 100),
 design jsonb not null check(jsonb_typeof(design)='object' and octet_length(design::text)<=24000),
 idea text not null default '' check(length(idea)<=2000),
 asset_path text references public.studio_assets(path) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index textile_projects_user_updated_idx on public.textile_projects(user_id,updated_at desc);
create index textile_projects_asset_idx on public.textile_projects(asset_path) where asset_path is not null;
alter table public.textile_projects enable row level security;
revoke all on public.textile_projects from public,anon,authenticated;
grant select,insert,update,delete on public.textile_projects to service_role;
commit;