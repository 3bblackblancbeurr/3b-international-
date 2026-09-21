create table if not exists public.ai_council_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  owner_email text,
  require_owner_match boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ai_council_settings enable row level security;
revoke all on table public.ai_council_settings from anon, authenticated;
grant select, insert, update, delete on table public.ai_council_settings to service_role;

insert into public.ai_council_settings(singleton, enabled, owner_email, require_owner_match)
values (true, false, null, true)
on conflict (singleton) do nothing;

comment on table public.ai_council_settings is 'Service-only AI Council runtime settings. Owner identity data is configured in database data, not committed to public source.';
