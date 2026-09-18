-- City 3B SECURITY DEFINER hardening — applied to Supabase on 2026-09-18.
-- Keep the functions available to signed-in members and service jobs, while
-- preventing anonymous execution and search_path hijacking.

alter function public.nexus_remove_building(uuid, bigint, uuid)
  set search_path = '';
revoke all on function public.nexus_remove_building(uuid, bigint, uuid) from public;
revoke execute on function public.nexus_remove_building(uuid, bigint, uuid) from anon;
grant execute on function public.nexus_remove_building(uuid, bigint, uuid) to authenticated, service_role;

alter function public.nexus_upgrade_building(uuid, bigint, uuid)
  set search_path = '';
revoke all on function public.nexus_upgrade_building(uuid, bigint, uuid) from public;
revoke execute on function public.nexus_upgrade_building(uuid, bigint, uuid) from anon;
grant execute on function public.nexus_upgrade_building(uuid, bigint, uuid) to authenticated, service_role;
