-- 3B Fortress local hardening after concurrent economy/city migrations.

revoke all privileges on table public.threeb_level_curve from anon, authenticated;
grant select on table public.threeb_level_curve to authenticated;

alter function public.nexus_purchase_and_place_building(text, integer, integer, smallint, uuid)
  set search_path = '';
