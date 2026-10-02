import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const migrationsPath = fileURLToPath(migrationsUrl);

const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shopBoundaries = [
  ['shop_refund_amount_constraint', /shop_orders_amount_refunded_check[\s\S]+?amount_refunded\s*>=\s*0[\s\S]+?amount_refunded\s*<=\s*amount_total/i],
  ['shop_payment_intent_unique', /create\s+unique\s+index[\s\S]+?on\s+public\.shop_orders\s*\(\s*payment_intent_id\s*\)[\s\S]+?where\s+payment_intent_id\s+is\s+not\s+null/i],
  ['shop_staff_rls', /alter\s+table\s+public\.shop_staff\s+enable\s+row\s+level\s+security/i],
  ['shop_staff_private', /revoke\s+all\s+on\s+table\s+public\.shop_staff\s+from\s+public,\s*anon,\s*authenticated/i],
  ['shop_refund_row_lock', /create\s+or\s+replace\s+function\s+public\.shop_apply_refund[\s\S]+?for\s+update/i],
  ['shop_refund_monotonic', /p_amount_refunded\s*<=\s*v_order\.amount_refunded/i],
  ['shop_refund_service_only', /revoke\s+all\s+on\s+function\s+public\.shop_apply_refund[\s\S]+?from\s+public,\s*anon,\s*authenticated[\s\S]+?grant\s+execute[\s\S]+?to\s+service_role/i],
  ['shop_notification_retry_cap', /attempts\s*<\s*p_max_attempts/i],
  ['shop_notification_stale_recovery', /state\s*=\s*'pending'[\s\S]+?updated_at\s*<\s*now\s*\(\s*\)\s*-\s*interval\s*'5 minutes'/i],
  ['shop_notification_service_only', /revoke\s+all\s+on\s+function\s+public\.shop_claim_notification[\s\S]+?from\s+public,\s*anon,\s*authenticated[\s\S]+?grant\s+execute[\s\S]+?to\s+service_role/i]
];

export function auditSupabaseSecurity() {
  const files = readdirSync(migrationsPath)
    .filter(name => /^\d{14}_.+\.sql$/.test(name))
    .sort();
  const sources = files.map(file => ({file, sql: readFileSync(new URL(file, migrationsUrl), 'utf8')}));
  const combined = sources.map(({file, sql}) => `\n-- ${file}\n${sql}`).join('\n');
  const problems = [];

  const tables = new Set();
  for (const {file, sql} of sources) {
    for (const match of sql.matchAll(/create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-z0-9_]+)/gi)) {
      tables.add(match[1].toLowerCase());
    }

    for (const match of sql.matchAll(/create\s+policy\s+[^;]+;/gis)) {
      const policy = match[0];
      if (/\busing\s*\(\s*true\s*\)/i.test(policy) && !/\bfor\s+select\b/i.test(policy)) {
        problems.push({file, error: 'permissive_non_select_policy', policy: policy.slice(0, 180)});
      }
    }
  }

  for (const table of tables) {
    const rls = new RegExp(`alter\\s+table(?:\\s+if\\s+exists)?\\s+public\\.${escaped(table)}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    if (!rls.test(combined)) problems.push({table, error: 'rls_not_enabled'});
  }

  let securityDefiners = 0;
  const declarations = combined.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\([\s\S]*?\)\s*returns[\s\S]*?\bas\s+\$[a-z0-9_]*\$/gi
  );
  for (const match of declarations) {
    const header = match[0];
    if (!/\bsecurity\s+definer\b/i.test(header)) continue;
    const name = match[1].toLowerCase();
    securityDefiners += 1;
    if (!/\bset\s+search_path\s*(?:=|to)\s*/i.test(header)) {
      problems.push({function: name, error: 'security_definer_without_search_path'});
    }
    const revoke = new RegExp(`revoke\\s+(?:all|execute)[\\s\\S]{0,1200}?on\\s+function[\\s\\S]{0,1200}?(?:public\\.)?${escaped(name)}\\s*\\(`, 'i');
    if (!revoke.test(combined)) {
      problems.push({function: name, error: 'security_definer_without_explicit_revoke'});
    }
  }

  const shop = sources.find(({file}) => file === '20261002184542_shop_checkout_hardening_v1.sql')?.sql || '';
  for (const [boundary, pattern] of shopBoundaries) {
    if (!pattern.test(shop)) problems.push({error: 'missing_shop_boundary', boundary});
  }

  return {
    ok: problems.length === 0,
    migrationFiles: files.length,
    publicTables: tables.size,
    securityDefiners,
    shopBoundaries: shopBoundaries.length,
    problems
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = auditSupabaseSecurity();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}
