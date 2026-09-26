begin;

alter table public.nosbloc_stg_project_versions
  drop constraint if exists nosbloc_stg_project_versions_stage_check;
alter table public.nosbloc_stg_project_versions
  add constraint nosbloc_stg_project_versions_stage_check
  check(stage in ('checkpoint','private_test','review'));

create or replace function public.nosbloc_stg_create_version_server(
  p_user uuid,
  p_project uuid,
  p_stage text,
  p_snapshot jsonb,
  p_snapshot_hash text,
  p_note text,
  p_idempotency uuid
) returns jsonb
language plpgsql
security invoker
set search_path=public,private,auth,pg_temp
as $$
declare
  v_no integer;
  v_version uuid;
  v_case uuid;
  v_total integer;
begin
  perform public.nosbloc_stg_guard();
  if not exists(
    select 1 from public.nosbloc_stg_projects
    where project_id=p_project and owner_id=p_user and status in('draft','rejected')
  ) then raise exception 'owner_required'; end if;

  if p_stage not in('checkpoint','private_test','review')
     or p_snapshot_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'version_invalid'; end if;

  if p_stage='review' then
    select coalesce(sum(share_bps),0) into v_total
    from public.nosbloc_stg_project_members where project_id=p_project;

    if v_total<>10000 or exists(
      select 1 from public.nosbloc_stg_project_members
      where project_id=p_project and membership_status not in('owner','accepted')
    ) then raise exception 'team_not_accepted'; end if;

    if not exists(
      select 1 from public.nosbloc_stg_projects
      where project_id=p_project
        and rights_confirmed and audience_confirmed and moderation_confirmed
    ) then raise exception 'rights_not_confirmed'; end if;
  end if;

  perform 1 from public.nosbloc_stg_projects where project_id=p_project for update;
  select coalesce(max(version_no),0)+1 into v_no
  from public.nosbloc_stg_project_versions where project_id=p_project;

  insert into public.nosbloc_stg_project_versions(
    project_id,version_no,stage,snapshot,snapshot_hash,note,created_by,idempotency_key
  ) values(
    p_project,v_no,p_stage,p_snapshot,p_snapshot_hash,left(coalesce(p_note,''),160),p_user,p_idempotency
  ) returning version_id into v_version;

  if p_stage='review' then
    insert into public.nosbloc_stg_moderation_queue(project_id,version_id)
    values(p_project,v_version) returning case_id into v_case;

    update public.nosbloc_stg_projects
    set status='review',review_version_id=v_version,visibility='private',
        publication_locked=true,discover_locked=true,monetization_locked=true,updated_at=now()
    where project_id=p_project;
  end if;

  insert into public.nosbloc_stg_audit_log(
    actor_id,project_id,event_type,event_id,idempotency_key,metadata
  ) values(
    p_user,p_project,'version_'||p_stage,v_version::text,p_idempotency,jsonb_build_object('version',v_no)
  ) on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'ok',true,'versionId',v_version,'versionNo',v_no,'stage',p_stage,
    'caseId',v_case,'private',true
  );
end
$$;

revoke all on function public.nosbloc_stg_create_version_server(uuid,uuid,text,jsonb,text,text,uuid)
from public,anon,authenticated;
grant execute on function public.nosbloc_stg_create_version_server(uuid,uuid,text,jsonb,text,text,uuid)
to service_role;

commit;
