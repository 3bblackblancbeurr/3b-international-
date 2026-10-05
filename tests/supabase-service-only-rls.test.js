import test from 'node:test';
import assert from 'node:assert/strict';
import {expandServerOnlyRls,permissiveClientWritePolicy} from '../scripts/lib/sql-server-only-rls.mjs';
const sql=`do $$ declare t text; begin
 foreach t in array array['one','two'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated',t);
  execute format('grant select, insert, update, delete on public.%I to service_role',t);
  execute format('create policy %I on public.%I for all to service_role using (true) with check (true)',t||'_server_only',t);
 end loop;
end $$;`;
test('closed server-only loop expands every literal table for static RLS audit',()=>{const result=expandServerOnlyRls(sql);for(const t of ['one','two'])assert.ok(result.includes(`alter table public.${t} enable row level security;`));assert.ok(!result.includes('foreach'));});
test('changed or incomplete dynamic SQL is never credited as safe RLS',()=>{for(const changed of [sql.replace('enable','disable'),sql.replace('to service_role','to authenticated'),sql.replace('from public, anon, authenticated','from anon'),sql.replace("array['one','two']","array[other_variable]"),sql.replace('end loop;',"execute 'grant all on public.one to anon'; end loop;")])assert.equal(expandServerOnlyRls(changed),changed);});
test('unconditional client write policies remain rejected',()=>{for(const roles of ['', 'to authenticated ', 'to anon ', 'to public ', 'to service_role, authenticated '])assert.equal(permissiveClientWritePolicy(`create policy p on public.t for all ${roles}using (true) with check (true);`),true);assert.equal(permissiveClientWritePolicy('create policy p on public.t for all to service_role using (true) with check (true);'),false);});
