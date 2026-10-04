-- Make the intended access model explicit for internal/service-only tables.
--
-- These tables already had RLS enabled and no direct grants for the anon or
-- authenticated roles. The absence of any policy correctly denied every
-- client-side operation, but Supabase's security advisor reported each table
-- as "RLS enabled, no policy". This migration adds an explicit deny policy
-- without changing the supported access path: trusted SECURITY DEFINER
-- functions and service_role continue to work, while direct Data API access
-- remains denied.
--
-- The policy is PERMISSIVE and false on purpose. A future, carefully reviewed
-- permissive allow policy can grant a narrow operation without being
-- permanently blocked by this documentation policy.

do $migration$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and c.relrowsecurity
      and n.nspname = 'public'
      and not exists (
        select 1 from pg_policy p where p.polrelid = c.oid
      )
      and not has_table_privilege('anon', c.oid, 'SELECT')
      and not has_table_privilege('anon', c.oid, 'INSERT')
      and not has_table_privilege('anon', c.oid, 'UPDATE')
      and not has_table_privilege('anon', c.oid, 'DELETE')
      and not has_table_privilege('authenticated', c.oid, 'SELECT')
      and not has_table_privilege('authenticated', c.oid, 'INSERT')
      and not has_table_privilege('authenticated', c.oid, 'UPDATE')
      and not has_table_privilege('authenticated', c.oid, 'DELETE')
  loop
    execute format(
      'create policy service_only_deny_all on %I.%I as permissive for all to anon, authenticated using (false) with check (false)',
      r.schema_name,
      r.table_name
    );

    execute format(
      'comment on policy service_only_deny_all on %I.%I is %L',
      r.schema_name,
      r.table_name,
      'Service-only table. Direct Data API access is intentionally denied; trusted server functions and service_role remain the supported access path.'
    );
  end loop;
end
$migration$;
