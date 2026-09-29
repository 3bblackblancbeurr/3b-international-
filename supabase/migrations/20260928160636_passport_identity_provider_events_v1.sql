create table if not exists public.passport_identity_provider_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider ~ '^[a-z0-9._:-]{2,64}$'),
  event_id text not null check (char_length(event_id) between 8 and 128),
  event_name text not null check (event_name ~ '^[a-z0-9._:-]{3,80}$'),
  event_version text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text check (processing_result is null or processing_result ~ '^[a-z0-9._:-]{2,80}$'),
  unique(provider,event_id)
);

create index if not exists passport_identity_provider_events_received_idx
  on public.passport_identity_provider_events(provider,received_at desc);

alter table public.passport_identity_provider_events enable row level security;
revoke all on public.passport_identity_provider_events from public,anon,authenticated;
grant select,insert,update,delete on public.passport_identity_provider_events to service_role;

drop policy if exists passport_identity_provider_events_deny_anon on public.passport_identity_provider_events;
create policy passport_identity_provider_events_deny_anon
on public.passport_identity_provider_events
as restrictive for all to anon
using(false) with check(false);

drop policy if exists passport_identity_provider_events_deny_authenticated on public.passport_identity_provider_events;
create policy passport_identity_provider_events_deny_authenticated
on public.passport_identity_provider_events
as restrictive for all to authenticated
using(false) with check(false);

comment on table public.passport_identity_provider_events is
  'Service-only idempotency ledger for signed identity-provider webhook events. Never store raw provider payloads or PII here.';
