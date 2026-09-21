create table if not exists public.member_auth_settings (
  singleton boolean primary key default true check (singleton),
  allow_legacy_flows boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.member_auth_settings enable row level security;
revoke all on public.member_auth_settings from public,anon,authenticated;
grant select,update on public.member_auth_settings to service_role;

insert into public.member_auth_settings(singleton,allow_legacy_flows)
values(true,true)
on conflict(singleton) do nothing;

comment on table public.member_auth_settings is
  'Service-only rollout gate for member authentication. Legacy registration/recovery can be disabled after the v2 frontend is confirmed live.';
