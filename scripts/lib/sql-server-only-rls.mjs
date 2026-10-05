// Static audit support for one closed, constant-list RLS template. No SQL executes here.
const body = `execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from public, anon, authenticated',t);
execute format('grant select, insert, update, delete on public.%I to service_role',t);
execute format('create policy %I on public.%I for all to service_role using (true) with check (true)',t||'_server_only',t);`;
const normalize=s=>s.replace(/\s+/g,' ').trim();
export function expandServerOnlyRls(sql) {
  return sql.replace(/do\s+\$\$\s+declare\s+t\s+text;\s+begin\s+foreach\s+t\s+in\s+array\s+array\[([^\]]+)\]\s+loop([\s\S]*?)end\s+loop;\s+end\s+\$\$;/gi,(whole,list,commands)=>{
    if(!/^'[a-z][a-z0-9_]*'(?:\s*,\s*'[a-z][a-z0-9_]*')*$/.test(list.trim()) || normalize(commands)!==normalize(body))return whole;
    return [...list.matchAll(/'([a-z][a-z0-9_]*)'/g)].map(([,t])=>`alter table public.${t} enable row level security;
revoke all on public.${t} from public, anon, authenticated;
grant select, insert, update, delete on public.${t} to service_role;
create policy ${t}_server_only on public.${t} for all to service_role using (true) with check (true);`).join('\n');
  });
}
export function permissiveClientWritePolicy(policy) {
  return /\busing\s*\(\s*true\s*\)/i.test(policy) && !/\bfor\s+select\b/i.test(policy) && !/\bfor\s+(?:all|insert|update|delete)\s+to\s+service_role\s+using\s*\(/i.test(policy);
}
