
create table if not exists public.app_games_catalog (
  slug text primary key,
  title text not null,
  subtitle text not null default '',
  description text not null default '',
  route text not null unique,
  badge text,
  category text not null default 'JEU 3B',
  status text not null default 'playable',
  module_type text not null default 'internal',
  module_url text,
  api_slug text,
  requires_auth boolean not null default true,
  enabled boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_games_catalog_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  constraint app_games_catalog_route_check check (route ~ '^/'),
  constraint app_games_catalog_status_check check (status in ('playable','beta','coming_soon','disabled')),
  constraint app_games_catalog_module_type_check check (module_type in ('internal','remote-module'))
);

alter table public.app_games_catalog enable row level security;
revoke all on public.app_games_catalog from anon, authenticated;

insert into public.app_games_catalog(
  slug,title,subtitle,description,route,badge,category,status,
  module_type,module_url,api_slug,requires_auth,enabled,sort_order,metadata,updated_at
)
values(
  'penalty-rush',
  'PENALTY RUSH',
  'Le duel de football 3B',
  '1 VS 1 · Flow · Duel d’Or',
  '/jeux/penalty-rush',
  'NOUVEAU',
  'FOOTBALL',
  'playable',
  'remote-module',
  'https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/penalty-rush-client',
  'penalty-rush',
  true,
  true,
  20,
  jsonb_build_object(
    'theme','black-gold-matrix',
    'realtime',true,
    'ranked',true,
    'privateRooms',true,
    'globalWallet',true
  ),
  now()
)
on conflict(slug) do update set
  title=excluded.title,
  subtitle=excluded.subtitle,
  description=excluded.description,
  route=excluded.route,
  badge=excluded.badge,
  category=excluded.category,
  status=excluded.status,
  module_type=excluded.module_type,
  module_url=excluded.module_url,
  api_slug=excluded.api_slug,
  requires_auth=excluded.requires_auth,
  enabled=excluded.enabled,
  sort_order=excluded.sort_order,
  metadata=excluded.metadata,
  updated_at=now();

create index if not exists app_games_catalog_enabled_order_idx
on public.app_games_catalog(enabled,sort_order);
