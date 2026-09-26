-- Nosbloc public discovery privacy hardening.
-- Public discovery never exposes project payloads, scripts, team contacts or financial metadata.

drop policy if exists nosbloc_projects_read on public.nosbloc_projects;
create policy nosbloc_projects_read on public.nosbloc_projects
for select to authenticated using (
  owner_id=(select auth.uid())
  or nosbloc_private.can_access_project(project_id,(select auth.uid()))
);

drop policy if exists nosbloc_products_read on public.nosbloc_products;
create policy nosbloc_products_read on public.nosbloc_products
for select to authenticated using (creator_id=(select auth.uid()));

create or replace function nosbloc_private.discover(p_query text,p_type text)
returns jsonb
language plpgsql stable security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_query text:=left(lower(trim(coalesce(p_query,''))),120);
  v_type text:=lower(trim(coalesce(p_type,'all')));
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  if not exists(select 1 from public.nosbloc_runtime_config where id=true and discover_enabled=true) then
    return jsonb_build_object('ok',true,'enabled',false,'projects','[]'::jsonb,'products','[]'::jsonb);
  end if;

  return jsonb_build_object(
    'ok',true,'enabled',true,
    'projects',coalesce((
      select jsonb_agg(jsonb_build_object(
        'projectId',p.project_id,
        'clientProjectId',p.client_project_id,
        'title',p.title,
        'type',p.project_type,
        'template',p.template_key,
        'description',p.description,
        'audience',p.audience,
        'status',p.status,
        'visibility',p.visibility,
        'readinessScore',p.readiness_score,
        'trustScore',p.trust_score,
        'updatedAt',p.updated_at,
        'creator',coalesce((
          select m.display_name from public.nosbloc_project_members m
          where m.project_id=p.project_id and m.membership_status='owner'
          limit 1
        ),'Créateur 3B')
      ) order by p.updated_at desc)
      from (
        select * from public.nosbloc_projects
        where status='published' and visibility='public' and discover_locked=false
          and (v_type='all' or project_type=v_type)
          and (
            v_query='' or lower(title||' '||description||' '||template_key) like '%'||v_query||'%'
          )
        order by updated_at desc
        limit 100
      ) p
    ),'[]'::jsonb),
    'products',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.product_id,
        'projectId',x.project_id,
        'title',x.title,
        'category',x.product_type,
        'description',x.description,
        'priceCents',x.price_cents,
        'currency',x.currency,
        'status',x.status
      ) order by x.updated_at desc)
      from (
        select * from public.nosbloc_products
        where status='active' and rights_confirmed=true
          and (
            v_query='' or lower(title||' '||description||' '||product_type) like '%'||v_query||'%'
          )
        order by updated_at desc
        limit 100
      ) x
    ),'[]'::jsonb)
  );
end
$$;

create or replace function nosbloc_private.revoke_invitation(p_invitation uuid,p_idempotency uuid)
returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v public.nosbloc_invitations;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  select * into v from public.nosbloc_invitations
  where invitation_id=p_invitation and invited_by=v_uid and status='invited'
  for update;
  if not found then raise exception 'invitation_not_revocable'; end if;

  update public.nosbloc_invitations
    set status='revoked',decided_at=now()
    where invitation_id=p_invitation;
  update public.nosbloc_project_members
    set membership_status='draft',user_id=null,invited_at=null,accepted_at=null,updated_at=now()
    where project_id=v.project_id and member_key=v.member_key and membership_status='invited';

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key)
  values(v_uid,v.project_id,'invitation_revoked',p_invitation::text,p_idempotency)
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object('ok',true,'invitationId',p_invitation,'status','revoked');
end
$$;

create or replace function nosbloc_private.moderate_product(
  p_product uuid,p_approve boolean,p_reason text,p_idempotency uuid
) returns jsonb
language plpgsql volatile security definer
set search_path=pg_catalog,public,auth,nosbloc_private,pg_temp
as $$
declare
  v_uid uuid;
  v_product public.nosbloc_products;
begin
  perform nosbloc_private.guard();
  v_uid:=nosbloc_private.require_user();
  if not nosbloc_private.is_moderator(v_uid) then raise exception 'moderator_required'; end if;
  select * into v_product from public.nosbloc_products
  where product_id=p_product and status='review' for update;
  if not found then raise exception 'product_review_closed'; end if;
  if p_approve and not v_product.rights_confirmed then raise exception 'product_rights_missing'; end if;

  update public.nosbloc_products
    set status=case when p_approve then 'active' else 'paused' end,updated_at=now()
    where product_id=p_product;

  insert into public.nosbloc_audit_log(actor_id,project_id,event_type,event_id,idempotency_key,metadata)
  values(v_uid,v_product.project_id,
    case when p_approve then 'product_approved' else 'product_rejected' end,
    p_product::text,p_idempotency,jsonb_build_object('reason',left(coalesce(p_reason,''),300)))
  on conflict(idempotency_key) do nothing;

  return jsonb_build_object(
    'ok',true,'productId',p_product,
    'status',case when p_approve then 'active' else 'paused' end,
    'paymentsLocked',not exists(select 1 from public.nosbloc_runtime_config where id=true and payments_enabled=true)
  );
end
$$;

create or replace function public.nosbloc_discover_api(p_query text,p_type text)
returns jsonb language sql stable security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.discover(p_query,p_type) $$;

create or replace function public.nosbloc_revoke_invitation_api(p_invitation uuid,p_idempotency uuid)
returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.revoke_invitation(p_invitation,p_idempotency) $$;

create or replace function public.nosbloc_moderate_product_api(
  p_product uuid,p_approve boolean,p_reason text,p_idempotency uuid
) returns jsonb language sql volatile security invoker
set search_path=pg_catalog,public,nosbloc_private
as $$ select nosbloc_private.moderate_product(p_product,p_approve,p_reason,p_idempotency) $$;

revoke all on function nosbloc_private.discover(text,text) from public,anon,authenticated;
revoke all on function nosbloc_private.revoke_invitation(uuid,uuid) from public,anon,authenticated;
revoke all on function nosbloc_private.moderate_product(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function nosbloc_private.discover(text,text) to authenticated;
grant execute on function nosbloc_private.revoke_invitation(uuid,uuid) to authenticated;
grant execute on function nosbloc_private.moderate_product(uuid,boolean,text,uuid) to authenticated;

revoke all on function public.nosbloc_discover_api(text,text) from public,anon,authenticated;
revoke all on function public.nosbloc_revoke_invitation_api(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_moderate_product_api(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.nosbloc_discover_api(text,text) to authenticated;
grant execute on function public.nosbloc_revoke_invitation_api(uuid,uuid) to authenticated;
grant execute on function public.nosbloc_moderate_product_api(uuid,boolean,text,uuid) to authenticated;

comment on function public.nosbloc_discover_api(text,text) is
  'Sanitized discovery RPC. Never returns project payloads, scripts, team contacts or creator financial data.';
