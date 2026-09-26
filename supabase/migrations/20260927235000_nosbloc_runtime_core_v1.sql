-- Nosbloc 3B V2 — production core
-- Server-authoritative projects, versions, invitations, moderation and publication.
-- Payments and payouts are deliberately out of this migration and remain disabled.

create schema if not exists nosbloc_private;
revoke all on schema nosbloc_private from public, anon;
grant usage on schema nosbloc_private to authenticated;

create table if not exists public.nosbloc_runtime_config (
  id boolean primary key default true check (id),
  server_enabled boolean not null default true,
  discover_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  environment text not null default 'production' check (environment = 'production'),
  updated_at timestamptz not null default now()
);
insert into public.nosbloc_runtime_config(id) values (true) on conflict (id) do nothing;

create table if not exists public.nosbloc_creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  studio_name text not null default 'Mon Studio 3B' check (char_length(studio_name) between 2 and 60),
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
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_project_id text not null check (char_length(client_project_id) between 3 and 100),
  title text not null check (char_length(title) between 3 and 80),
  project_type text not null check (project_type in ('world','game','story','fashion','music','shop')),
  template_key text not null check (char_length(template_key) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  audience text not null default 'Tout public' check (char_length(audience) <= 60),
  status text not null default 'draft'
    check (status in ('draft','private_test','review','approved','published','rejected','suspended','archived')),
  visibility text not null default 'private'
    check (visibility in ('private','team','unlisted','public')),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 1048576),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  trust_score integer not null default 100 check (trust_score between 0 and 100),
  rights_confirmed boolean not null default false,
  audience_confirmed boolean not null default false,
  moderation_confirmed boolean not null default false,
  revision bigint not null default 1 check (revision > 0),
  review_version_id uuid,
  publication_locked boolean not null default true,
  discover_locked boolean not null default true,
  monetization_locked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, client_project_id)
);
create index if not exists nosbloc_projects_owner_status_idx
  on public.nosbloc_projects(owner_id,status,updated_at desc);

create table if not exists public.nosbloc_project_members (
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  member_key text not null check (char_length(member_key) between 1 and 80),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 50),
  role_name text not null check (char_length(role_name) between 1 and 50),
  share_bps integer not null default 0 check (share_bps between 0 and 10000),
  membership_status text not null default 'draft'
    check (membership_status in ('owner','draft','invited','accepted','declined','removed')),
  invited_at timestamptz,
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(project_id,member_key)
);
create index if not exists nosbloc_members_user_idx
  on public.nosbloc_project_members(user_id,membership_status)
  where user_id is not null;

create table if not exists public.nosbloc_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  member_key text not null,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role_name text not null check (char_length(role_name) between 1 and 50),
  share_bps integer not null check (share_bps between 0 and 10000),
  status text not null default 'invited'
    check (status in ('invited','accepted','declined','revoked','expired')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  decided_at timestamptz,
  check (expires_at > created_at)
);
create index if not exists nosbloc_invitations_recipient_idx
  on public.nosbloc_invitations(invited_user_id,status,created_at desc);

create table if not exists public.nosbloc_project_versions (
  version_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  version_no integer not null check (version_no > 0),
  stage text not null check (stage in ('checkpoint','private_test','review')),
  snapshot jsonb not null
    check (jsonb_typeof(snapshot) = 'object' and pg_column_size(snapshot) <= 1048576),
  snapshot_hash char(64) not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  note text not null default '' check (char_length(note) <= 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  unique(project_id,version_no)
);
create index if not exists nosbloc_versions_project_idx
  on public.nosbloc_project_versions(project_id,version_no desc);

alter table public.nosbloc_projects
  drop constraint if exists nosbloc_projects_review_version_fk;
alter table public.nosbloc_projects
  add constraint nosbloc_projects_review_version_fk
  foreign key(review_version_id) references public.nosbloc_project_versions(version_id) on delete set null;

create table if not exists public.nosbloc_moderation_queue (
  case_id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.nosbloc_projects(project_id) on delete cascade,
  version_id uuid not null references public.nosbloc_project_versions(version_id) on delete cascade,
  status text not null default 'open'
    check (status in ('open','review','approved','rejected')),
  assigned_to uuid references auth.users(id) on delete set null,
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(version_id)
);
create index if not exists nosbloc_moderation_status_idx
  on public.nosbloc_moderation_queue(status,created_at);

create table if not exists public.nosbloc_audit_log (
  audit_id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.nosbloc_projects(project_id) on delete cascade,
  event_type text not null check (char_length(event_type) between 2 and 80),
  event_id text,
  idempotency_key uuid unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists nosbloc_audit_actor_idx on public.nosbloc_audit_log(actor_id,created_at desc);
create index if not exists nosbloc_audit_project_idx on public.nosbloc_audit_log(project_id,created_at desc);

create or replace function nosbloc_private.block_mutation()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'nosbloc_immutable_record';
end
$$;

drop trigger if exists nosbloc_versions_immutable on public.nosbloc_project_versions;
create trigger nosbloc_versions_immutable
before update or delete on public.nosbloc_project_versions
for each row execute function nosbloc_private.block_mutation();

drop trigger if exists nosbloc_audit_immutable on public.nosbloc_audit_log;
create trigger nosbloc_audit_immutable
before update or delete on public.nosbloc_audit_log
for each row execute function nosbloc_private.block_mutation();

create or replace function nosbloc_private.require_user()
returns uuid language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not exists (
    select 1 from public.member_profiles
    where user_id = v_uid and passport_state = 'active'
  ) then
    raise exception 'passport_required';
  end if;
  return v_uid;
end
$$;

create or replace function nosbloc_private.guard()
returns void language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.nosbloc_runtime_config
    where id = true and server_enabled = true and environment = 'production'
  ) then
    raise exception 'nosbloc_server_disabled';
  end if;
end
$$;

create or replace function nosbloc_private.is_moderator(p_user uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists(
    select 1 from public.member_profiles
    where user_id = p_user
      and public_verified = true
      and public_badge_key = 'director_founder'
      and passport_state = 'active'
  )
$$;

create or replace function nosbloc_private.can_access_project(p_project uuid,p_user uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists(
    select 1
    from public.nosbloc_projects p
    where p.project_id = p_project
      and (
        p.owner_id = p_user
        or exists (
          select 1 from public.nosbloc_project_members m
          where m.project_id = p.project_id
            and m.user_id = p_user
            and m.membership_status in ('owner','accepted')
        )
      )
  )
$$;

alter table public.nosbloc_runtime_config enable row level security;
alter table public.nosbloc_creator_profiles enable row level security;
alter table public.nosbloc_projects enable row level security;
alter table public.nosbloc_project_members enable row level security;
alter table public.nosbloc_invitations enable row level security;
alter table public.nosbloc_project_versions enable row level security;
alter table public.nosbloc_moderation_queue enable row level security;
alter table public.nosbloc_audit_log enable row level security;

revoke all on public.nosbloc_runtime_config from public,anon,authenticated;
revoke all on public.nosbloc_creator_profiles from public,anon,authenticated;
revoke all on public.nosbloc_projects from public,anon,authenticated;
revoke all on public.nosbloc_project_members from public,anon,authenticated;
revoke all on public.nosbloc_invitations from public,anon,authenticated;
revoke all on public.nosbloc_project_versions from public,anon,authenticated;
revoke all on public.nosbloc_moderation_queue from public,anon,authenticated;
revoke all on public.nosbloc_audit_log from public,anon,authenticated;

grant select on public.nosbloc_runtime_config to authenticated;
grant select on public.nosbloc_creator_profiles to authenticated;
grant select on public.nosbloc_projects to authenticated;
grant select on public.nosbloc_project_members to authenticated;
grant select on public.nosbloc_invitations to authenticated;
grant select on public.nosbloc_project_versions to authenticated;
grant select on public.nosbloc_moderation_queue to authenticated;
grant select on public.nosbloc_audit_log to authenticated;

drop policy if exists nosbloc_runtime_read on public.nosbloc_runtime_config;
create policy nosbloc_runtime_read on public.nosbloc_runtime_config
for select to authenticated using (true);

drop policy if exists nosbloc_profile_self_read on public.nosbloc_creator_profiles;
create policy nosbloc_profile_self_read on public.nosbloc_creator_profiles
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists nosbloc_projects_read on public.nosbloc_projects;
create policy nosbloc_projects_read on public.nosbloc_projects
for select to authenticated using (
  owner_id = (select auth.uid())
  or nosbloc_private.can_access_project(project_id,(select auth.uid()))
  or (
    status = 'published' and visibility = 'public' and discover_locked = false
    and exists(select 1 from public.nosbloc_runtime_config where id=true and discover_enabled=true)
  )
);

drop policy if exists nosbloc_members_read on public.nosbloc_project_members;
create policy nosbloc_members_read on public.nosbloc_project_members
for select to authenticated using (
  user_id = (select auth.uid())
  or nosbloc_private.can_access_project(project_id,(select auth.uid()))
);

drop policy if exists nosbloc_invitations_read on public.nosbloc_invitations;
create policy nosbloc_invitations_read on public.nosbloc_invitations
for select to authenticated using (
  invited_user_id = (select auth.uid())
  or nosbloc_private.can_access_project(project_id,(select auth.uid()))
);

drop policy if exists nosbloc_versions_read on public.nosbloc_project_versions;
create policy nosbloc_versions_read on public.nosbloc_project_versions
for select to authenticated using (
  nosbloc_private.can_access_project(project_id,(select auth.uid()))
);

drop policy if exists nosbloc_moderation_read on public.nosbloc_moderation_queue;
create policy nosbloc_moderation_read on public.nosbloc_moderation_queue
for select to authenticated using (
  nosbloc_private.can_access_project(project_id,(select auth.uid()))
  or nosbloc_private.is_moderator((select auth.uid()))
);

drop policy if exists nosbloc_audit_read on public.nosbloc_audit_log;
create policy nosbloc_audit_read on public.nosbloc_audit_log
for select to authenticated using (
  actor_id = (select auth.uid())
  or (project_id is not null and nosbloc_private.can_access_project(project_id,(select auth.uid())))
);

create or replace function nosbloc_private.sync_project(
  p_client_project text,
  p_payload jsonb,
  p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v_project public.nosbloc_projects;
  v_member jsonb;
  v_member_key text;
  v_name text;
  v_country text;
  v_ready integer := 0;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();

  if p_client_project !~ '^[A-Za-z0-9._:-]{3,100}$'
     or jsonb_typeof(p_payload) <> 'object'
     or pg_column_size(p_payload) > 1048576 then
    raise exception 'invalid_project';
  end if;
  if coalesce(p_payload->>'title','') = '' or char_length(p_payload->>'title') < 3 then
    raise exception 'invalid_project_title';
  end if;
  if coalesce(p_payload->>'type','') not in ('world','game','story','fashion','music','shop') then
    raise exception 'invalid_project_type';
  end if;
  if jsonb_typeof(coalesce(p_payload->'splits','[]'::jsonb)) <> 'array' then
    raise exception 'invalid_team';
  end if;

  select name,country into v_name,v_country
  from public.member_profiles where user_id=v_uid;

  insert into public.nosbloc_creator_profiles(user_id,studio_name,country_code)
  values(v_uid,left('Studio de '||coalesce(v_name,'Créateur 3B'),60),left(v_country,8))
  on conflict(user_id) do update
    set country_code=excluded.country_code,updated_at=now();

  v_ready := greatest(0,least(100,coalesce((p_payload#>>'{server,readiness}')::integer,0)));

  insert into public.nosbloc_projects(
    owner_id,client_project_id,title,project_type,template_key,description,audience,
    payload,readiness_score,rights_confirmed,audience_confirmed,moderation_confirmed
  ) values(
    v_uid,p_client_project,left(p_payload->>'title',80),p_payload->>'type',
    left(coalesce(p_payload->>'template','Projet Nosbloc'),120),
    left(coalesce(p_payload->>'description',''),2000),
    left(coalesce(p_payload->>'audience','Tout public'),60),
    p_payload,v_ready,
    coalesce((p_payload#>>'{rights,coreOwned}')::boolean,false)
      and coalesce((p_payload#>>'{rights,thirdPartyLicensed}')::boolean,false),
    coalesce((p_payload#>>'{rights,ageRatingReviewed}')::boolean,false),
    coalesce((p_payload#>>'{safety,moderation}')::boolean,false)
  )
  on conflict(owner_id,client_project_id) do update set
    title=excluded.title,
    project_type=excluded.project_type,
    template_key=excluded.template_key,
    description=excluded.description,
    audience=excluded.audience,
    payload=excluded.payload,
    readiness_score=excluded.readiness_score,
    rights_confirmed=excluded.rights_confirmed,
    audience_confirmed=excluded.audience_confirmed,
    moderation_confirmed=excluded.moderation_confirmed,
    revision=public.nosbloc_projects.revision+1,
    updated_at=now()
  where public.nosbloc_projects.status in ('draft','private_test','rejected')
  returning * into v_project;

  if v_project.project_id is null then raise exception 'project_locked'; end if;

  for v_member in select value from jsonb_array_elements(coalesce(p_payload->'splits','[]'::jsonb))
  loop
    v_member_key := left(coalesce(v_member->>'id',''),80);
    if v_member_key <> '' then
      insert into public.nosbloc_project_members(
        project_id,member_key,user_id,display_name,role_name,share_bps,membership_status,accepted_at
      ) values(
        v_project.project_id,
        v_member_key,
        case when v_member->>'status'='owner' then v_uid else null end,
        left(coalesce(nullif(v_member->>'name',''),v_name,'Membre 3B'),50),
        left(coalesce(nullif(v_member->>'role',''),'Création'),50),
        greatest(0,least(10000,coalesce((v_member->>'shareBps')::integer,0))),
        case when v_member->>'status'='owner' then 'owner' else 'draft' end,
        case when v_member->>'status'='owner' then now() else null end
      )
      on conflict(project_id,member_key) do update set
        display_name=excluded.display_name,
        role_name=excluded.role_name,
        share_bps=excluded.share_bps,
        updated_at=now();
    end if;
  end loop;

  if not exists (
    select 1 from public.nosbloc_project_members
    where project_id=v_project.project_id and membership_status='owner'
  ) then
    insert into public.nosbloc_project_members(
      project_id,member_key,user_id,display_name,role_name,share_bps,membership_status,accepted_at
    ) values(v_project.project_id,'owner',v_uid,left(coalesce(v_name,'Créateur 3B'),50),'Direction',10000,'owner',now())
    on conflict(project_id,member_key) do nothing;
  end if;

  delete from public.nosbloc_project_members m
  where m.project_id=v_project.project_id
    and m.membership_status='draft'
    and not exists(
      select 1 from jsonb_array_elements(coalesce(p_payload->'splits','[]'::jsonb)) x
      where left(coalesce(x->>'id',''),80)=m.member_key
    );

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key,metadata)
  values(v_uid,v_project.project_id,'project_sync',v_project.revision::text,p_idempotency,
    jsonb_build_object('clientProjectId',p_client_project))
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'ok',true,'projectId',v_project.project_id,'clientProjectId',v_project.client_project_id,
    'revision',v_project.revision,'status',v_project.status,'visibility',v_project.visibility,
    'locks',jsonb_build_object(
      'publication',v_project.publication_locked,
      'discover',v_project.discover_locked,
      'monetization',v_project.monetization_locked
    )
  );
end
$$;

create or replace function nosbloc_private.invite_member(
  p_project uuid,p_member_key text,p_handle text,p_role text,p_share_bps integer,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v_recipient uuid;
  v_invite uuid;
  v_handle text := regexp_replace(lower(trim(coalesce(p_handle,''))), '^@', '');
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not exists(
    select 1 from public.nosbloc_projects
    where project_id=p_project and owner_id=v_uid and status in('draft','private_test','rejected')
  ) then raise exception 'owner_required'; end if;
  select user_id into v_recipient from public.member_profiles
  where lower(handle)=v_handle and passport_state='active';
  if v_recipient is null or v_recipient=v_uid then raise exception 'member_invalid'; end if;

  insert into public.nosbloc_invitations(
    project_id,member_key,invited_user_id,invited_by,role_name,share_bps,idempotency_key
  ) values(
    p_project,left(p_member_key,80),v_recipient,v_uid,left(p_role,50),
    greatest(0,least(10000,p_share_bps)),p_idempotency
  ) returning invitation_id into v_invite;

  insert into public.nosbloc_project_members(
    project_id,member_key,user_id,display_name,role_name,share_bps,membership_status,invited_at
  )
  select p_project,left(p_member_key,80),v_recipient,name,left(p_role,50),
    greatest(0,least(10000,p_share_bps)),'invited',now()
  from public.member_profiles where user_id=v_recipient
  on conflict(project_id,member_key) do update set
    user_id=excluded.user_id,display_name=excluded.display_name,role_name=excluded.role_name,
    share_bps=excluded.share_bps,membership_status='invited',invited_at=now(),accepted_at=null,updated_at=now();

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,p_project,'invitation_created',v_invite::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'invitationId',v_invite);
end
$$;

create or replace function nosbloc_private.decide_invitation(
  p_invitation uuid,p_accept boolean,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v public.nosbloc_invitations;
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  select * into v from public.nosbloc_invitations
  where invitation_id=p_invitation and invited_user_id=v_uid
    and status='invited' and expires_at>now()
  for update;
  if not found then raise exception 'invitation_invalid'; end if;

  update public.nosbloc_invitations
    set status=v_status,decided_at=now()
    where invitation_id=p_invitation;
  update public.nosbloc_project_members
    set membership_status=v_status,
        accepted_at=case when p_accept then now() else null end,
        updated_at=now()
    where project_id=v.project_id and member_key=v.member_key and user_id=v_uid;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,v.project_id,'invitation_'||v_status,p_invitation::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'status',v_status);
end
$$;

create or replace function nosbloc_private.create_version(
  p_project uuid,p_stage text,p_snapshot jsonb,p_note text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, extensions, pg_temp
as $$
declare
  v_uid uuid;
  v_no integer;
  v_version uuid;
  v_case uuid;
  v_total integer;
  v_hash text;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if p_stage not in('checkpoint','private_test','review')
     or jsonb_typeof(p_snapshot)<>'object'
     or pg_column_size(p_snapshot)>1048576 then
    raise exception 'version_invalid';
  end if;
  if not exists(
    select 1 from public.nosbloc_projects
    where project_id=p_project and owner_id=v_uid and status in('draft','private_test','rejected')
  ) then raise exception 'owner_required'; end if;

  if p_stage='review' then
    select coalesce(sum(share_bps),0) into v_total
    from public.nosbloc_project_members where project_id=p_project;
    if v_total<>10000 or exists(
      select 1 from public.nosbloc_project_members
      where project_id=p_project and membership_status not in('owner','accepted')
    ) then raise exception 'team_not_accepted'; end if;
    if not exists(
      select 1 from public.nosbloc_projects
      where project_id=p_project and rights_confirmed and audience_confirmed and moderation_confirmed
    ) then raise exception 'publication_requirements_missing'; end if;
  end if;

  perform 1 from public.nosbloc_projects where project_id=p_project for update;
  select coalesce(max(version_no),0)+1 into v_no
  from public.nosbloc_project_versions where project_id=p_project;
  v_hash := encode(digest(convert_to(p_snapshot::text,'UTF8'),'sha256'),'hex');

  insert into public.nosbloc_project_versions(
    project_id,version_no,stage,snapshot,snapshot_hash,note,created_by,idempotency_key
  ) values(
    p_project,v_no,p_stage,p_snapshot,v_hash,left(coalesce(p_note,''),160),v_uid,p_idempotency
  ) returning version_id into v_version;

  if p_stage='private_test' then
    update public.nosbloc_projects
      set status='private_test',visibility='private',updated_at=now()
      where project_id=p_project;
  elsif p_stage='review' then
    insert into public.nosbloc_moderation_queue(project_id,version_id)
    values(p_project,v_version) returning case_id into v_case;
    update public.nosbloc_projects
      set status='review',review_version_id=v_version,visibility='private',
          publication_locked=true,discover_locked=true,monetization_locked=true,updated_at=now()
      where project_id=p_project;
  end if;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key,metadata)
  values(v_uid,p_project,'version_'||p_stage,v_version::text,p_idempotency,jsonb_build_object('version',v_no))
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'ok',true,'versionId',v_version,'versionNo',v_no,'stage',p_stage,
    'caseId',v_case,'snapshotHash',v_hash,'private',true
  );
end
$$;

create or replace function nosbloc_private.restore_version(
  p_project uuid,p_version uuid,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v_snapshot jsonb;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not exists(
    select 1 from public.nosbloc_projects
    where project_id=p_project and owner_id=v_uid and status not in('published','suspended')
  ) then raise exception 'restore_locked'; end if;
  select snapshot into v_snapshot from public.nosbloc_project_versions
  where version_id=p_version and project_id=p_project;
  if v_snapshot is null then raise exception 'version_not_found'; end if;

  update public.nosbloc_projects set
    title=left(v_snapshot->>'title',80),
    project_type=v_snapshot->>'type',
    template_key=left(coalesce(v_snapshot->>'template','Projet Nosbloc'),120),
    description=left(coalesce(v_snapshot->>'description',''),2000),
    audience=left(coalesce(v_snapshot->>'audience','Tout public'),60),
    payload=v_snapshot,status='draft',visibility='private',review_version_id=null,
    publication_locked=true,discover_locked=true,monetization_locked=true,
    revision=revision+1,updated_at=now()
  where project_id=p_project;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,p_project,'version_restored',p_version::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'projectId',p_project,'restoredFromVersionId',p_version,'status','draft');
end
$$;

create or replace function nosbloc_private.moderate(
  p_case uuid,p_decision text,p_reason text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v public.nosbloc_moderation_queue;
  v_discover boolean;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not nosbloc_private.is_moderator(v_uid) then raise exception 'moderator_required'; end if;
  if p_decision not in('approved','rejected') then raise exception 'decision_invalid'; end if;

  select * into v from public.nosbloc_moderation_queue
  where case_id=p_case and status in('open','review') for update;
  if not found then raise exception 'case_closed'; end if;
  select discover_enabled into v_discover from public.nosbloc_runtime_config where id=true;

  update public.nosbloc_moderation_queue
    set status=p_decision,assigned_to=v_uid,decision_reason=left(coalesce(p_reason,''),300),decided_at=now()
    where case_id=p_case;
  update public.nosbloc_projects set
    status=p_decision,visibility='private',
    publication_locked=case when p_decision='approved' then false else true end,
    discover_locked=case when p_decision='approved' then not coalesce(v_discover,false) else true end,
    monetization_locked=true,updated_at=now()
    where project_id=v.project_id;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,v.project_id,'moderation_'||p_decision,p_case::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'ok',true,'decision',p_decision,'projectId',v.project_id,
    'publicationReady',p_decision='approved','paymentsLocked',true
  );
end
$$;

create or replace function nosbloc_private.publish_project(
  p_project uuid,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not exists(select 1 from public.nosbloc_runtime_config where id=true and discover_enabled=true) then
    raise exception 'discover_disabled';
  end if;
  if not exists(
    select 1 from public.nosbloc_projects
    where project_id=p_project and owner_id=v_uid and status='approved' and publication_locked=false
  ) then raise exception 'project_not_publishable'; end if;

  update public.nosbloc_projects
    set status='published',visibility='public',discover_locked=false,updated_at=now()
    where project_id=p_project;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,p_project,'project_published',p_project::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'projectId',p_project,'status','published','visibility','public');
end
$$;

create or replace function nosbloc_private.archive_project(
  p_project uuid,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare v_uid uuid;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not exists(select 1 from public.nosbloc_projects where project_id=p_project and owner_id=v_uid) then
    raise exception 'owner_required';
  end if;
  update public.nosbloc_projects set
    status='archived',visibility='private',publication_locked=true,discover_locked=true,
    monetization_locked=true,updated_at=now()
  where project_id=p_project;
  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,p_project,'project_archived',p_project::text,p_idempotency)
  on conflict(idempotency_key) do nothing;
  return jsonb_build_object('ok',true,'projectId',p_project,'status','archived');
end
$$;

create or replace function nosbloc_private.snapshot()
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare
  v_uid uuid;
  v_mod boolean;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  v_mod := nosbloc_private.is_moderator(v_uid);
  return jsonb_build_object(
    'ok',true,
    'runtime',(select to_jsonb(c) from public.nosbloc_runtime_config c where id=true),
    'creator',(select to_jsonb(c) from public.nosbloc_creator_profiles c where user_id=v_uid),
    'isModerator',v_mod,
    'projects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'projectId',p.project_id,
        'clientProjectId',p.client_project_id,
        'status',p.status,
        'visibility',p.visibility,
        'revision',p.revision,
        'reviewVersionId',p.review_version_id,
        'publicationLocked',p.publication_locked,
        'discoverLocked',p.discover_locked,
        'monetizationLocked',p.monetization_locked,
        'payload',p.payload,
        'updatedAt',p.updated_at
      ) order by p.updated_at desc)
      from public.nosbloc_projects p
      where p.owner_id=v_uid or nosbloc_private.can_access_project(p.project_id,v_uid)
    ),'[]'::jsonb),
    'incomingInvitations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'invitationId',i.invitation_id,'projectId',i.project_id,'projectTitle',p.title,
        'memberKey',i.member_key,'role',i.role_name,'shareBps',i.share_bps,
        'createdAt',i.created_at,'expiresAt',i.expires_at
      ) order by i.created_at desc)
      from public.nosbloc_invitations i join public.nosbloc_projects p using(project_id)
      where i.invited_user_id=v_uid and i.status='invited' and i.expires_at>now()
    ),'[]'::jsonb),
    'activity',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.audit_id,'type',a.event_type,'projectId',a.project_id,
        'detail',a.event_id,'createdAt',a.created_at,'metadata',a.metadata
      ) order by a.created_at desc)
      from (
        select * from public.nosbloc_audit_log
        where actor_id=v_uid
           or (project_id is not null and nosbloc_private.can_access_project(project_id,v_uid))
        order by created_at desc limit 100
      ) a
    ),'[]'::jsonb),
    'moderationQueue',case when v_mod then coalesce((
      select jsonb_agg(jsonb_build_object(
        'caseId',q.case_id,'projectId',q.project_id,'versionId',q.version_id,
        'projectTitle',p.title,'status',q.status,'createdAt',q.created_at
      ) order by q.created_at)
      from public.nosbloc_moderation_queue q join public.nosbloc_projects p using(project_id)
      where q.status in('open','review')
    ),'[]'::jsonb) else '[]'::jsonb end
  );
end
$$;

create or replace function nosbloc_private.project_versions(p_project uuid)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, nosbloc_private, pg_temp
as $$
declare v_uid uuid;
begin
  perform nosbloc_private.guard();
  v_uid := nosbloc_private.require_user();
  if not nosbloc_private.can_access_project(p_project,v_uid) then raise exception 'project_access_denied'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',v.version_id,'versionNo',v.version_no,'stage',v.stage,'note',v.note,
      'createdAt',v.created_at,'fingerprint',v.snapshot_hash,'snapshot',v.snapshot
    ) order by v.version_no desc)
    from public.nosbloc_project_versions v where v.project_id=p_project
  ),'[]'::jsonb);
end
$$;

create or replace function public.nosbloc_snapshot_api()
returns jsonb language sql stable security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.snapshot() $$;

create or replace function public.nosbloc_sync_project_api(p_client_project text,p_payload jsonb,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.sync_project(p_client_project,p_payload,p_idempotency) $$;

create or replace function public.nosbloc_invite_api(p_project uuid,p_member_key text,p_handle text,p_role text,p_share_bps integer,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.invite_member(p_project,p_member_key,p_handle,p_role,p_share_bps,p_idempotency) $$;

create or replace function public.nosbloc_decide_invitation_api(p_invitation uuid,p_accept boolean,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.decide_invitation(p_invitation,p_accept,p_idempotency) $$;

create or replace function public.nosbloc_create_version_api(p_project uuid,p_stage text,p_snapshot jsonb,p_note text,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.create_version(p_project,p_stage,p_snapshot,p_note,p_idempotency) $$;

create or replace function public.nosbloc_restore_version_api(p_project uuid,p_version uuid,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.restore_version(p_project,p_version,p_idempotency) $$;

create or replace function public.nosbloc_moderate_api(p_case uuid,p_decision text,p_reason text,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.moderate(p_case,p_decision,p_reason,p_idempotency) $$;

create or replace function public.nosbloc_publish_api(p_project uuid,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.publish_project(p_project,p_idempotency) $$;

create or replace function public.nosbloc_archive_api(p_project uuid,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.archive_project(p_project,p_idempotency) $$;

create or replace function public.nosbloc_project_versions_api(p_project uuid)
returns jsonb language sql stable security invoker
set search_path = pg_catalog, public, nosbloc_private
as $$ select nosbloc_private.project_versions(p_project) $$;

revoke all on function nosbloc_private.block_mutation() from public,anon,authenticated;
revoke all on function nosbloc_private.require_user() from public,anon,authenticated;
revoke all on function nosbloc_private.guard() from public,anon,authenticated;
revoke all on function nosbloc_private.is_moderator(uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.can_access_project(uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.sync_project(text,jsonb,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.invite_member(uuid,text,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.decide_invitation(uuid,boolean,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.create_version(uuid,text,jsonb,text,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.restore_version(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.moderate(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.publish_project(uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.archive_project(uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.snapshot() from public,anon,authenticated;
revoke all on function nosbloc_private.project_versions(uuid) from public,anon,authenticated;

grant execute on function nosbloc_private.require_user() to authenticated;
grant execute on function nosbloc_private.guard() to authenticated;
grant execute on function nosbloc_private.is_moderator(uuid) to authenticated;
grant execute on function nosbloc_private.can_access_project(uuid,uuid) to authenticated;
grant execute on function nosbloc_private.sync_project(text,jsonb,uuid) to authenticated;
grant execute on function nosbloc_private.invite_member(uuid,text,text,text,integer,uuid) to authenticated;
grant execute on function nosbloc_private.decide_invitation(uuid,boolean,uuid) to authenticated;
grant execute on function nosbloc_private.create_version(uuid,text,jsonb,text,uuid) to authenticated;
grant execute on function nosbloc_private.restore_version(uuid,uuid,uuid) to authenticated;
grant execute on function nosbloc_private.moderate(uuid,text,text,uuid) to authenticated;
grant execute on function nosbloc_private.publish_project(uuid,uuid) to authenticated;
grant execute on function nosbloc_private.archive_project(uuid,uuid) to authenticated;
grant execute on function nosbloc_private.snapshot() to authenticated;
grant execute on function nosbloc_private.project_versions(uuid) to authenticated;

revoke all on function public.nosbloc_snapshot_api() from public,anon,authenticated;
revoke all on function public.nosbloc_sync_project_api(text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_invite_api(uuid,text,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_decide_invitation_api(uuid,boolean,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_create_version_api(uuid,text,jsonb,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_restore_version_api(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_moderate_api(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_publish_api(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_archive_api(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_project_versions_api(uuid) from public,anon,authenticated;

grant execute on function public.nosbloc_snapshot_api() to authenticated;
grant execute on function public.nosbloc_sync_project_api(text,jsonb,uuid) to authenticated;
grant execute on function public.nosbloc_invite_api(uuid,text,text,text,integer,uuid) to authenticated;
grant execute on function public.nosbloc_decide_invitation_api(uuid,boolean,uuid) to authenticated;
grant execute on function public.nosbloc_create_version_api(uuid,text,jsonb,text,uuid) to authenticated;
grant execute on function public.nosbloc_restore_version_api(uuid,uuid,uuid) to authenticated;
grant execute on function public.nosbloc_moderate_api(uuid,text,text,uuid) to authenticated;
grant execute on function public.nosbloc_publish_api(uuid,uuid) to authenticated;
grant execute on function public.nosbloc_archive_api(uuid,uuid) to authenticated;
grant execute on function public.nosbloc_project_versions_api(uuid) to authenticated;

comment on table public.nosbloc_runtime_config is 'Nosbloc production kill switches. Payments and payouts stay disabled until Stripe/KYC release gates are passed.';
comment on table public.nosbloc_project_versions is 'Immutable server versions for private tests, checkpoints and moderation review.';
comment on table public.nosbloc_audit_log is 'Immutable Nosbloc security and lifecycle audit trail.';
