-- Nosbloc team state and moderation snapshot hardening.

create or replace function nosbloc_private.remove_member(
  p_project uuid,p_member_key text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_member public.nosbloc_project_members;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  if not exists(
    select 1 from public.nosbloc_projects
    where project_id=p_project and owner_id=v_uid and status in('draft','private_test','rejected')
  ) then raise exception 'owner_required'; end if;

  select * into v_member from public.nosbloc_project_members
  where project_id=p_project and member_key=p_member_key and membership_status<>'owner'
  for update;
  if not found then raise exception 'member_not_found'; end if;

  update public.nosbloc_invitations
    set status='revoked',decided_at=now()
    where project_id=p_project and member_key=p_member_key and status='invited';
  delete from public.nosbloc_project_members
    where project_id=p_project and member_key=p_member_key and membership_status<>'owner';

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key,metadata)
  values(v_uid,p_project,'member_removed',p_member_key,p_idempotency,
    jsonb_build_object('removedUserId',v_member.user_id,'previousStatus',v_member.membership_status))
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'projectId',p_project,'memberKey',p_member_key,'status','removed');
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
        'isOwner',p.owner_id=v_uid,
        'status',p.status,
        'visibility',p.visibility,
        'revision',p.revision,
        'reviewVersionId',p.review_version_id,
        'publicationLocked',p.publication_locked,
        'discoverLocked',p.discover_locked,
        'monetizationLocked',p.monetization_locked,
        'payload',p.payload,
        'members',coalesce((
          select jsonb_agg(jsonb_build_object(
            'memberKey',m.member_key,
            'userId',m.user_id,
            'name',m.display_name,
            'role',m.role_name,
            'shareBps',m.share_bps,
            'status',m.membership_status,
            'invitedAt',m.invited_at,
            'acceptedAt',m.accepted_at,
            'invitationId',(
              select i.invitation_id
              from public.nosbloc_invitations i
              where i.project_id=m.project_id and i.member_key=m.member_key
              order by i.created_at desc limit 1
            )
          ) order by case when m.membership_status='owner' then 0 else 1 end,m.display_name)
          from public.nosbloc_project_members m where m.project_id=p.project_id
        ),'[]'::jsonb),
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
    ),'[]'::jsonb) else '[]'::jsonb end,
    'productModeration',case when v_mod then coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId',x.product_id,'projectId',x.project_id,'title',x.title,
        'type',x.product_type,'priceCents',x.price_cents,'currency',x.currency,
        'rightsConfirmed',x.rights_confirmed,'createdAt',x.created_at
      ) order by x.created_at)
      from public.nosbloc_products x where x.status='review'
    ),'[]'::jsonb) else '[]'::jsonb end
  );
end
$$;

create or replace function public.nosbloc_remove_member_api(
  p_project uuid,p_member_key text,p_idempotency uuid
) returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.remove_member(p_project,p_member_key,p_idempotency) $$;

revoke all on function nosbloc_private.remove_member(uuid,text,uuid) from public,anon,authenticated;
grant execute on function nosbloc_private.remove_member(uuid,text,uuid) to authenticated;
revoke all on function public.nosbloc_remove_member_api(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.nosbloc_remove_member_api(uuid,text,uuid) to authenticated;
