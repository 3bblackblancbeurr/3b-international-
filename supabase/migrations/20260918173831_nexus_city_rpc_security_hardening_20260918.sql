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
