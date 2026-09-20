-- Applied Supabase migration: 20260920165411
-- Future objects created by postgres in public are private-by-default.
-- Objects that must be client-readable/writable require explicit GRANT + RLS policy.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  grant all on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
