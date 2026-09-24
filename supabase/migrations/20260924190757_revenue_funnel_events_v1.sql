create table if not exists public.revenue_funnel_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_name text not null,
  page text not null,
  channel text not null default 'direct',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint revenue_funnel_event_name_chk check (event_name = any (array[
    'quickkit_page_view'::text,
    'quickkit_audit_started'::text,
    'quickkit_audit_completed'::text,
    'quickkit_pro_click'::text,
    'tools_page_view'::text,
    'outbound_descript'::text,
    'outbound_lovable'::text,
    'manifest_generator_view'::text,
    'manifest_generated'::text,
    'headers_generator_view'::text,
    'headers_generated'::text
  ])),
  constraint revenue_funnel_page_len_chk check (char_length(page) between 1 and 120),
  constraint revenue_funnel_channel_len_chk check (char_length(channel) between 1 and 64),
  constraint revenue_funnel_metadata_chk check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2048)
);

create index if not exists revenue_funnel_events_created_idx
  on public.revenue_funnel_events (created_at desc);

create index if not exists revenue_funnel_events_name_created_idx
  on public.revenue_funnel_events (event_name, created_at desc);

alter table public.revenue_funnel_events enable row level security;
revoke all on table public.revenue_funnel_events from anon, authenticated;

comment on table public.revenue_funnel_events is
  'Server-only privacy-minimized first-party conversion events; raw IP and email are not stored.';
