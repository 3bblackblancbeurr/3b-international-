create table if not exists public.ai_council_provider_registry (
  provider text primary key,
  display_name text not null,
  enabled boolean not null default false,
  role_hint text not null default 'analyst',
  model_env text not null,
  secret_env text not null,
  capabilities jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_council_tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  source text not null default 'chatgpt',
  objective text not null check (char_length(objective) between 1 and 20000),
  context jsonb not null default '{}'::jsonb,
  target text not null default 'general',
  risk_level text not null default 'normal'
    check (risk_level in ('normal','elevated','critical')),
  status text not null default 'queued'
    check (status in ('queued','running','review','approved','rejected','failed','cancelled')),
  required_providers text[] not null default array['openai','anthropic','gemini']::text[],
  provider_quorum smallint not null default 2 check (provider_quorum between 1 and 8),
  github_repo text,
  github_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_council_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ai_council_tasks(id) on delete cascade,
  provider text not null,
  model text not null,
  role text not null default 'analyst',
  attempt smallint not null default 1 check (attempt between 1 and 10),
  status text not null default 'running'
    check (status in ('running','succeeded','failed','skipped')),
  prompt_digest text,
  output_text text,
  output_json jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(task_id, provider, role, attempt)
);

create table if not exists public.ai_council_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.ai_council_tasks(id) on delete cascade,
  reviewed_run_id uuid references public.ai_council_runs(id) on delete set null,
  reviewer_provider text not null,
  verdict text not null check (verdict in ('support','challenge','abstain','error')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  critique text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_council_decisions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.ai_council_tasks(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','approved','rejected','superseded')),
  synthesis text,
  consensus jsonb not null default '{}'::jsonb,
  disagreements jsonb not null default '[]'::jsonb,
  approval_required boolean not null default true,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_council_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.ai_council_tasks(id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_council_tasks_status_created_idx
  on public.ai_council_tasks(status, created_at desc);
create index if not exists ai_council_runs_task_status_idx
  on public.ai_council_runs(task_id, status);
create index if not exists ai_council_reviews_task_idx
  on public.ai_council_reviews(task_id, created_at desc);
create index if not exists ai_council_events_task_idx
  on public.ai_council_events(task_id, created_at desc);

alter table public.ai_council_provider_registry enable row level security;
alter table public.ai_council_tasks enable row level security;
alter table public.ai_council_runs enable row level security;
alter table public.ai_council_reviews enable row level security;
alter table public.ai_council_decisions enable row level security;
alter table public.ai_council_events enable row level security;

revoke all on table public.ai_council_provider_registry from anon, authenticated;
revoke all on table public.ai_council_tasks from anon, authenticated;
revoke all on table public.ai_council_runs from anon, authenticated;
revoke all on table public.ai_council_reviews from anon, authenticated;
revoke all on table public.ai_council_decisions from anon, authenticated;
revoke all on table public.ai_council_events from anon, authenticated;

grant select, insert, update, delete on table public.ai_council_provider_registry to service_role;
grant select, insert, update, delete on table public.ai_council_tasks to service_role;
grant select, insert, update, delete on table public.ai_council_runs to service_role;
grant select, insert, update, delete on table public.ai_council_reviews to service_role;
grant select, insert, update, delete on table public.ai_council_decisions to service_role;
grant select, insert, update, delete on table public.ai_council_events to service_role;

insert into public.ai_council_provider_registry
  (provider, display_name, enabled, role_hint, model_env, secret_env, capabilities)
values
  ('openai','OpenAI',false,'coordinator','AI_COUNCIL_OPENAI_MODEL','OPENAI_API_KEY','{"reasoning":true,"code":true,"synthesis":true}'::jsonb),
  ('anthropic','Anthropic Claude',false,'reviewer','AI_COUNCIL_ANTHROPIC_MODEL','ANTHROPIC_API_KEY','{"long_context":true,"review":true,"code":true}'::jsonb),
  ('gemini','Google Gemini',false,'alternative','AI_COUNCIL_GEMINI_MODEL','GEMINI_API_KEY','{"multimodal":true,"alternative_analysis":true}'::jsonb)
on conflict (provider) do update set
  display_name = excluded.display_name,
  role_hint = excluded.role_hint,
  model_env = excluded.model_env,
  secret_env = excluded.secret_env,
  capabilities = excluded.capabilities,
  updated_at = now();

comment on table public.ai_council_tasks is '3B AI Council internal task queue. Service-only; no client policies.';
comment on table public.ai_council_runs is 'Per-provider AI Council outputs. API keys are never stored here.';
comment on table public.ai_council_decisions is 'Consolidated AI Council synthesis requiring explicit approval before external mutations.';
