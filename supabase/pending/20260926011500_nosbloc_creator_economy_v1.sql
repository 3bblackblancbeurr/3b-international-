-- NOSBLOC DU 3B — CREATOR ECONOMY V1
-- PENDING REVIEW: this file is intentionally outside supabase/migrations.
-- It must not be applied to production until legal, tax, KYC, payout-provider,
-- moderation and fraud reviews have been signed off.
-- 3B Credits are closed-loop platform credits, not crypto-assets or tokens.

begin;

create table if not exists public.nosbloc_creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  studio_name text not null check (char_length(studio_name) between 2 and 60),
  creator_level text not null default 'starter'
    check (creator_level in ('starter','verified','pro','studio','partner')),
  verification_status text not null default 'not_requested'
    check (verification_status in ('not_requested','pending','verified','rejected','suspended')),
  payout_status text not null default 'locked'
    check (payout_status in ('locked','pending_kyc','ready','paused','suspended')),
  trust_score integer not null default 100 check (trust_score between 0 and 100),
  country_code text,
  tax_profile_complete boolean not null default false,
  accepted_creator_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nosbloc_projects (
  project_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.nosbloc_creator_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  project_type text not null
    check (project_type in ('world','game','story','fashion','music','shop')),
  template_key text not null,
  description text not null default '' check (char_length(description) <= 2000),
  audience text not null default 'Tout public',
  status text not null default 'draft'
    check (status in ('draft','review','approved','published','paused','rejected','archived')),
  visibility text not null default 'private'
    check (visibility in ('private','team','unlisted','public')),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  trust_score integer not null default 100 check (trust_score between 0 and 100),
  publication_locked boolean not null default true,
  monetization_locked boolean not null default true,
  active_version integer not null default 1 check (active_version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nosbloc_projects_owner_status_idx
  on public.nosbloc_projects(owner_id,status,updated_at desc);

create table if not exists public.nosbloc_project_members (
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role_name text not null check (char_length(role_name) between 2 and 50),
  share_bps integer not null default 0 check (share_bps between 0 and 10000),
  membership_status text not null default 'invited'
    check (membership_status in ('owner','invited','accepted','declined','removed')),
  accepted_at timestamptz,
  split_version integer not null default 1 check (split_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id,user_id)
);

create index if not exists nosbloc_project_members_user_idx
  on public.nosbloc_project_members(user_id,membership_status);

create table if not exists public.nosbloc_project_split_locks (
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  split_version integer not null,
  total_bps integer not null check (total_bps = 10000),
  locked_by uuid not null references auth.users(id) on delete restrict,
  locked_at timestamptz not null default now(),
  members_snapshot jsonb not null,
  primary key (project_id,split_version)
);

create table if not exists public.nosbloc_assets (
  asset_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.nosbloc_creator_profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 3 and 100),
  category text not null
    check (category in ('architecture','gameplay','animation','audio','interface','fashion','vehicle','character','vfx','other')),
  review_status text not null default 'draft'
    check (review_status in ('draft','review','approved','rejected','suspended')),
  listing_status text not null default 'private'
    check (listing_status in ('private','unlisted','public','delisted')),
  price_cents integer not null default 0 check (price_cents >= 0),
  royalty_bps integer not null default 0 check (royalty_bps between 0 and 3000),
  license_type text not null default 'commercial_project'
    check (license_type in ('commercial_project','revenue_share','editorial','free_platform')),
  rights_attested boolean not null default false,
  source_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (license_type = 'revenue_share' and royalty_bps > 0)
    or (license_type <> 'revenue_share' and royalty_bps = 0)
  )
);

create table if not exists public.nosbloc_asset_licenses (
  license_id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.nosbloc_assets(asset_id) on delete restrict,
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  licensee_id uuid not null references auth.users(id) on delete restrict,
  price_cents integer not null check (price_cents >= 0),
  royalty_bps integer not null check (royalty_bps between 0 and 3000),
  license_terms_version text not null,
  status text not null default 'pending'
    check (status in ('pending','active','refunded','revoked','disputed')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  unique (asset_id,project_id)
);

create table if not exists public.nosbloc_ledger_entries (
  entry_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  account_user_id uuid references auth.users(id) on delete restrict,
  project_id uuid references public.nosbloc_projects(project_id) on delete restrict,
  asset_id uuid references public.nosbloc_assets(asset_id) on delete restrict,
  entry_type text not null
    check (entry_type in (
      'sale_gross','tax','store_fee','refund','chargeback','creator_direct',
      'engagement_reward','asset_royalty','platform_operations',
      'creator_pool','protection_growth','payout_hold','payout_release','payout'
    )),
  direction text not null check (direction in ('debit','credit')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending','held','available','reversed','paid')),
  available_at timestamptz,
  source_event_id text,
  idempotency_key uuid not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nosbloc_ledger_user_created_idx
  on public.nosbloc_ledger_entries(account_user_id,created_at desc);
create index if not exists nosbloc_ledger_project_created_idx
  on public.nosbloc_ledger_entries(project_id,created_at desc);
create index if not exists nosbloc_ledger_transaction_idx
  on public.nosbloc_ledger_entries(transaction_id);

create table if not exists public.nosbloc_engagement_daily (
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  metric_date date not null,
  qualified_players integer not null default 0 check (qualified_players >= 0),
  active_minutes bigint not null default 0 check (active_minutes >= 0),
  retention_d1 numeric(6,3) not null default 0 check (retention_d1 between 0 and 100),
  retention_d7 numeric(6,3) not null default 0 check (retention_d7 between 0 and 100),
  acquired_players integer not null default 0 check (acquired_players >= 0),
  reactivated_players integer not null default 0 check (reactivated_players >= 0),
  social_sessions integer not null default 0 check (social_sessions >= 0),
  fraud_adjustment numeric(8,5) not null default 1 check (fraud_adjustment between 0 and 1),
  reward_cents bigint not null default 0 check (reward_cents >= 0),
  calculated_at timestamptz,
  primary key (project_id,metric_date)
);

create table if not exists public.nosbloc_payout_accounts (
  user_id uuid primary key references public.nosbloc_creator_profiles(user_id) on delete cascade,
  provider text,
  provider_account_ref text,
  kyc_status text not null default 'not_started'
    check (kyc_status in ('not_started','pending','verified','rejected','expired')),
  tax_status text not null default 'incomplete'
    check (tax_status in ('incomplete','pending','complete','rejected')),
  payouts_enabled boolean not null default false,
  minimum_payout_cents integer not null default 10000 check (minimum_payout_cents >= 1000),
  updated_at timestamptz not null default now(),
  check (payouts_enabled = false or (kyc_status = 'verified' and tax_status = 'complete'))
);

create table if not exists public.nosbloc_payout_requests (
  payout_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nosbloc_creator_profiles(user_id) on delete restrict,
  amount_cents bigint not null check (amount_cents >= 1000),
  currency char(3) not null default 'EUR',
  status text not null default 'blocked'
    check (status in ('blocked','requested','review','approved','processing','paid','failed','cancelled')),
  risk_review_required boolean not null default true,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  provider_reference text,
  idempotency_key uuid not null unique,
  failure_reason text
);

create index if not exists nosbloc_payout_requests_user_idx
  on public.nosbloc_payout_requests(user_id,requested_at desc);

create table if not exists public.nosbloc_moderation_cases (
  case_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.nosbloc_projects(project_id) on delete cascade,
  asset_id uuid references public.nosbloc_assets(asset_id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  status text not null default 'open'
    check (status in ('open','review','actioned','dismissed','appealed')),
  severity integer not null default 1 check (severity between 1 and 5),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.nosbloc_fraud_signals (
  signal_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.nosbloc_projects(project_id) on delete cascade,
  signal_type text not null,
  risk_score integer not null check (risk_score between 0 and 100),
  status text not null default 'open'
    check (status in ('open','review','confirmed','dismissed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create or replace function public.nosbloc_prevent_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Nosbloc ledger entries are immutable';
end;
$$;

drop trigger if exists nosbloc_ledger_immutable on public.nosbloc_ledger_entries;
create trigger nosbloc_ledger_immutable
before update or delete on public.nosbloc_ledger_entries
for each row execute function public.nosbloc_prevent_ledger_mutation();

create or replace function public.nosbloc_lock_project_splits(p_project uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_total integer;
  v_version integer;
  v_snapshot jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select owner_id into v_owner
  from public.nosbloc_projects
  where project_id = p_project
  for update;

  if v_owner is distinct from v_user then raise exception 'Owner required'; end if;

  select coalesce(sum(share_bps),0),
         coalesce(max(split_version),1),
         jsonb_agg(
           jsonb_build_object(
             'user_id',user_id,
             'role_name',role_name,
             'share_bps',share_bps,
             'status',membership_status
           )
           order by user_id
         )
    into v_total,v_version,v_snapshot
  from public.nosbloc_project_members
  where project_id = p_project
    and membership_status in ('owner','accepted');

  if v_total <> 10000 then
    raise exception 'Revenue split must equal exactly 10000 basis points';
  end if;

  if exists (
    select 1 from public.nosbloc_project_members
    where project_id = p_project
      and membership_status = 'invited'
      and share_bps > 0
  ) then
    raise exception 'Every paid member must accept before split lock';
  end if;

  insert into public.nosbloc_project_split_locks(
    project_id,split_version,total_bps,locked_by,members_snapshot
  ) values (
    p_project,v_version,v_total,v_user,coalesce(v_snapshot,'[]'::jsonb)
  )
  on conflict (project_id,split_version) do nothing;

  return v_version;
end;
$$;

alter table public.nosbloc_creator_profiles enable row level security;
alter table public.nosbloc_projects enable row level security;
alter table public.nosbloc_project_members enable row level security;
alter table public.nosbloc_project_split_locks enable row level security;
alter table public.nosbloc_assets enable row level security;
alter table public.nosbloc_asset_licenses enable row level security;
alter table public.nosbloc_ledger_entries enable row level security;
alter table public.nosbloc_engagement_daily enable row level security;
alter table public.nosbloc_payout_accounts enable row level security;
alter table public.nosbloc_payout_requests enable row level security;
alter table public.nosbloc_moderation_cases enable row level security;
alter table public.nosbloc_fraud_signals enable row level security;

create policy nosbloc_profile_self_select on public.nosbloc_creator_profiles
  for select to authenticated using (user_id = auth.uid());
create policy nosbloc_profile_self_insert on public.nosbloc_creator_profiles
  for insert to authenticated with check (user_id = auth.uid() and payout_status = 'locked');
create policy nosbloc_profile_self_update on public.nosbloc_creator_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and payout_status in ('locked','pending_kyc'));

create policy nosbloc_project_member_select on public.nosbloc_projects
  for select to authenticated using (
    owner_id = auth.uid()
    or visibility = 'public'
    or exists (
      select 1 from public.nosbloc_project_members m
      where m.project_id = nosbloc_projects.project_id
        and m.user_id = auth.uid()
        and m.membership_status in ('owner','accepted')
    )
  );
create policy nosbloc_project_owner_insert on public.nosbloc_projects
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and publication_locked = true
    and monetization_locked = true
    and status = 'draft'
  );
create policy nosbloc_project_owner_update on public.nosbloc_projects
  for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and publication_locked = true
    and monetization_locked = true
    and status in ('draft','review','paused','archived')
  );

create policy nosbloc_members_team_select on public.nosbloc_project_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.nosbloc_projects p
      where p.project_id = nosbloc_project_members.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy nosbloc_assets_visible_select on public.nosbloc_assets
  for select to authenticated using (
    creator_id = auth.uid()
    or (listing_status = 'public' and review_status = 'approved' and rights_attested = true)
  );
create policy nosbloc_assets_owner_insert on public.nosbloc_assets
  for insert to authenticated with check (
    creator_id = auth.uid()
    and review_status = 'draft'
    and listing_status = 'private'
  );
create policy nosbloc_assets_owner_update on public.nosbloc_assets
  for update to authenticated
  using (creator_id = auth.uid())
  with check (
    creator_id = auth.uid()
    and review_status in ('draft','review')
    and listing_status in ('private','unlisted')
  );

create policy nosbloc_license_party_select on public.nosbloc_asset_licenses
  for select to authenticated using (
    licensee_id = auth.uid()
    or exists (
      select 1 from public.nosbloc_assets a
      where a.asset_id = nosbloc_asset_licenses.asset_id
        and a.creator_id = auth.uid()
    )
  );

create policy nosbloc_ledger_self_select on public.nosbloc_ledger_entries
  for select to authenticated using (account_user_id = auth.uid());

create policy nosbloc_metrics_project_party_select on public.nosbloc_engagement_daily
  for select to authenticated using (
    exists (
      select 1 from public.nosbloc_projects p
      where p.project_id = nosbloc_engagement_daily.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.nosbloc_project_members m
            where m.project_id = p.project_id
              and m.user_id = auth.uid()
              and m.membership_status in ('owner','accepted')
          )
        )
    )
  );

create policy nosbloc_payout_account_self_select on public.nosbloc_payout_accounts
  for select to authenticated using (user_id = auth.uid());
create policy nosbloc_payout_request_self_select on public.nosbloc_payout_requests
  for select to authenticated using (user_id = auth.uid());

revoke all on public.nosbloc_project_split_locks from anon,authenticated;
revoke all on public.nosbloc_ledger_entries from anon,authenticated;
revoke all on public.nosbloc_engagement_daily from anon,authenticated;
revoke all on public.nosbloc_payout_accounts from anon,authenticated;
revoke all on public.nosbloc_payout_requests from anon,authenticated;
revoke all on public.nosbloc_moderation_cases from anon,authenticated;
revoke all on public.nosbloc_fraud_signals from anon,authenticated;

grant select on public.nosbloc_ledger_entries to authenticated;
grant select on public.nosbloc_engagement_daily to authenticated;
grant select on public.nosbloc_payout_accounts to authenticated;
grant select on public.nosbloc_payout_requests to authenticated;
grant execute on function public.nosbloc_lock_project_splits(uuid) to authenticated;

comment on table public.nosbloc_ledger_entries is
  'Immutable double-entry-ready creator economy journal. Writes are service-only.';
comment on table public.nosbloc_payout_accounts is
  'Payouts default to disabled and require verified KYC plus complete tax status.';
comment on table public.nosbloc_payout_requests is
  'Payout requests default to blocked; creation and transitions are service-only.';
comment on table public.nosbloc_assets is
  'Creator assets require rights attestation and human/platform review before public listing.';

rollback;
-- Replace ROLLBACK with COMMIT only after formal approval and a staging rehearsal.
