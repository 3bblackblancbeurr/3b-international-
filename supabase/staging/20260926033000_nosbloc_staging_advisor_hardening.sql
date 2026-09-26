-- Applied only to Supabase project zykdfgahzqqanlyxjtbe.
-- Fixes mutable search paths and makes the direct-table deny posture explicit.
alter function public.nosbloc_stg_block_mutation() set search_path=public,pg_temp;
alter function public.nosbloc_stg_guard() set search_path=public,pg_temp;
alter function public.nosbloc_stg_is_moderator(uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_sync_project_server(uuid,text,jsonb,uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_invite_server(uuid,uuid,text,text,text,integer,uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_decide_invitation_server(uuid,uuid,boolean,uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_create_version_server(uuid,uuid,text,jsonb,text,text,uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_moderate_server(uuid,uuid,text,text,uuid) set search_path=public,pg_temp;
alter function public.nosbloc_stg_snapshot_server(uuid) set search_path=public,pg_temp;

do $$
declare t text;
begin
 foreach t in array array[
  'member_profiles','loyalty_rate_limits','nosbloc_stg_runtime_config',
  'nosbloc_stg_creator_profiles','nosbloc_stg_projects','nosbloc_stg_project_members',
  'nosbloc_stg_invitations','nosbloc_stg_project_versions',
  'nosbloc_stg_moderation_queue','nosbloc_stg_audit_log'
 ] loop
  execute format('drop policy if exists nosbloc_explicit_deny_anon on public.%I',t);
  execute format('drop policy if exists nosbloc_explicit_deny_authenticated on public.%I',t);
  execute format('create policy nosbloc_explicit_deny_anon on public.%I as restrictive for all to anon using (false) with check (false)',t);
  execute format('create policy nosbloc_explicit_deny_authenticated on public.%I as restrictive for all to authenticated using (false) with check (false)',t);
 end loop;
end$$;

comment on policy nosbloc_explicit_deny_authenticated on public.nosbloc_stg_projects is
'All project access is mediated by authenticated RPC wrappers; direct table access is denied.';
