-- Applied only to Supabase project zykdfgahzqqanlyxjtbe.
-- Authenticated clients call public wrappers; authorization remains in private SECURITY DEFINER functions.
create or replace function private.nosbloc_stg_current_user()
returns uuid
language plpgsql
volatile
security definer
set search_path=public,private,auth,pg_temp
as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if not exists(select 1 from public.member_profiles where user_id=v_uid) then raise exception 'passport_required';end if;
 if not public.loyalty_rate(v_uid::text||':nosbloc-staging',90,60) then raise exception 'rate_limited';end if;
 return v_uid;
end$$;

create or replace function private.nosbloc_stg_snapshot_api() returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_snapshot_server(v_uid);end$$;
create or replace function private.nosbloc_stg_sync_project_api(p_client_project text,p_payload jsonb,p_idempotency uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_sync_project_server(v_uid,p_client_project,p_payload,p_idempotency);end$$;
create or replace function private.nosbloc_stg_invite_api(p_project uuid,p_member_key text,p_handle text,p_role text,p_share_bps integer,p_idempotency uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_invite_server(v_uid,p_project,p_member_key,p_handle,p_role,p_share_bps,p_idempotency);end$$;
create or replace function private.nosbloc_stg_decide_invitation_api(p_invitation uuid,p_accept boolean,p_idempotency uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_decide_invitation_server(v_uid,p_invitation,p_accept,p_idempotency);end$$;
create or replace function private.nosbloc_stg_create_version_api(p_project uuid,p_stage text,p_snapshot jsonb,p_snapshot_hash text,p_note text,p_idempotency uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_create_version_server(v_uid,p_project,p_stage,p_snapshot,p_snapshot_hash,p_note,p_idempotency);end$$;
create or replace function private.nosbloc_stg_moderate_api(p_case uuid,p_decision text,p_reason text,p_idempotency uuid) returns jsonb
language plpgsql volatile security definer set search_path=public,private,auth,pg_temp
as $$declare v_uid uuid;begin v_uid:=private.nosbloc_stg_current_user();return public.nosbloc_stg_moderate_server(v_uid,p_case,p_decision,p_reason,p_idempotency);end$$;

create or replace function public.nosbloc_stg_snapshot_api() returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_snapshot_api()$$;
create or replace function public.nosbloc_stg_sync_project_api(p_client_project text,p_payload jsonb,p_idempotency uuid) returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_sync_project_api(p_client_project,p_payload,p_idempotency)$$;
create or replace function public.nosbloc_stg_invite_api(p_project uuid,p_member_key text,p_handle text,p_role text,p_share_bps integer,p_idempotency uuid) returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_invite_api(p_project,p_member_key,p_handle,p_role,p_share_bps,p_idempotency)$$;
create or replace function public.nosbloc_stg_decide_invitation_api(p_invitation uuid,p_accept boolean,p_idempotency uuid) returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_decide_invitation_api(p_invitation,p_accept,p_idempotency)$$;
create or replace function public.nosbloc_stg_create_version_api(p_project uuid,p_stage text,p_snapshot jsonb,p_snapshot_hash text,p_note text,p_idempotency uuid) returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_create_version_api(p_project,p_stage,p_snapshot,p_snapshot_hash,p_note,p_idempotency)$$;
create or replace function public.nosbloc_stg_moderate_api(p_case uuid,p_decision text,p_reason text,p_idempotency uuid) returns jsonb
language sql volatile security invoker set search_path=public,private,pg_temp
as $$select private.nosbloc_stg_moderate_api(p_case,p_decision,p_reason,p_idempotency)$$;

revoke all on function private.nosbloc_stg_current_user() from public,anon,authenticated;
revoke all on function private.nosbloc_stg_snapshot_api() from public,anon,authenticated;
revoke all on function private.nosbloc_stg_sync_project_api(text,jsonb,uuid) from public,anon,authenticated;
revoke all on function private.nosbloc_stg_invite_api(uuid,text,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function private.nosbloc_stg_decide_invitation_api(uuid,boolean,uuid) from public,anon,authenticated;
revoke all on function private.nosbloc_stg_create_version_api(uuid,text,jsonb,text,text,uuid) from public,anon,authenticated;
revoke all on function private.nosbloc_stg_moderate_api(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_stg_snapshot_api() from public,anon,authenticated;
revoke all on function public.nosbloc_stg_sync_project_api(text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_stg_invite_api(uuid,text,text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_stg_decide_invitation_api(uuid,boolean,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_stg_create_version_api(uuid,text,jsonb,text,text,uuid) from public,anon,authenticated;
revoke all on function public.nosbloc_stg_moderate_api(uuid,text,text,uuid) from public,anon,authenticated;

grant usage on schema private to authenticated;
grant execute on function private.nosbloc_stg_snapshot_api() to authenticated;
grant execute on function private.nosbloc_stg_sync_project_api(text,jsonb,uuid) to authenticated;
grant execute on function private.nosbloc_stg_invite_api(uuid,text,text,text,integer,uuid) to authenticated;
grant execute on function private.nosbloc_stg_decide_invitation_api(uuid,boolean,uuid) to authenticated;
grant execute on function private.nosbloc_stg_create_version_api(uuid,text,jsonb,text,text,uuid) to authenticated;
grant execute on function private.nosbloc_stg_moderate_api(uuid,text,text,uuid) to authenticated;
grant execute on function public.nosbloc_stg_snapshot_api() to authenticated;
grant execute on function public.nosbloc_stg_sync_project_api(text,jsonb,uuid) to authenticated;
grant execute on function public.nosbloc_stg_invite_api(uuid,text,text,text,integer,uuid) to authenticated;
grant execute on function public.nosbloc_stg_decide_invitation_api(uuid,boolean,uuid) to authenticated;
grant execute on function public.nosbloc_stg_create_version_api(uuid,text,jsonb,text,text,uuid) to authenticated;
grant execute on function public.nosbloc_stg_moderate_api(uuid,text,text,uuid) to authenticated;
