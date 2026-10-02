import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, join, relative} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const decimalMb = 1_000_000;
const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

function filesBelow(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [{path, bytes: stat.size}];
  return readdirSync(path, {withFileTypes: true}).flatMap(entry =>
    filesBelow(join(path, entry.name))
  );
}

function total(files) {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

export function verifyVercelBudget() {
  const publicFiles = filesBelow(join(root, 'public'));
  const distFiles = filesBelow(join(root, 'dist'));
  const apiFiles = filesBelow(join(root, 'api')).filter(file => file.path.endsWith('.js'));
  const largestPublic = [...publicFiles].sort((a, b) => b.bytes - a.bytes)[0] || null;

  const publicBudget = numberFromEnv('VERCEL_PUBLIC_BUDGET_BYTES', 230 * decimalMb);
  const distBudget = numberFromEnv('VERCEL_DIST_BUDGET_BYTES', 240 * decimalMb);
  const singleStaticBudget = numberFromEnv('VERCEL_SINGLE_STATIC_BUDGET_BYTES', 10 * decimalMb);
  const apiFunctionBudget = numberFromEnv('VERCEL_API_FUNCTION_BUDGET', 12);
  const hobbyCliSourceLimit = 100 * decimalMb;

  // This allowlist mirrors the deploy-relevant tree after .vercelignore. It is
  // an estimate for CLI source uploads; Git builds clone the repository instead.
  const cliSourceEntries = [
    'public', 'src', 'api', 'server', 'shared', 'config',
    'supabase/functions/ecosystem',
    'package.json', 'package-lock.json', 'index.html', 'vite.config.js',
    'vercel.json', 'capacitor.config.json', 'eslint.config.js'
  ];
  const cliSourceFiles = cliSourceEntries.flatMap(entry => filesBelow(join(root, entry)));

  const vercelConfig = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const functionConfig = vercelConfig.functions?.['api/*.js'] || {};
  const excludeFiles = String(functionConfig.excludeFiles || '');
  const ignore = readFileSync(join(root, '.vercelignore'), 'utf8');
  const failures = [];
  const warnings = [];

  const publicBytes = total(publicFiles);
  const distBytes = total(distFiles);
  const cliSourceBytes = total(cliSourceFiles);
  if (publicBytes > publicBudget) failures.push({error: 'public_budget_exceeded', bytes: publicBytes, budget: publicBudget});
  if (distFiles.length && distBytes > distBudget) failures.push({error: 'dist_budget_exceeded', bytes: distBytes, budget: distBudget});
  if (largestPublic?.bytes > singleStaticBudget) {
    failures.push({error: 'single_static_budget_exceeded', file: relative(root, largestPublic.path), bytes: largestPublic.bytes, budget: singleStaticBudget});
  }
  if (apiFiles.length > apiFunctionBudget) failures.push({error: 'api_function_budget_exceeded', count: apiFiles.length, budget: apiFunctionBudget});

  for (const required of ['public', 'docs', 'tests', 'unreal', 'android', 'ios', 'supabase']) {
    if (!excludeFiles.includes(required)) failures.push({error: 'function_exclusion_missing', path: required});
  }
  for (const required of ['dist/', 'android/', 'ios/', 'unreal/', 'tests/', 'docs/', 'supabase/migrations/']) {
    if (!ignore.includes(required)) failures.push({error: 'vercelignore_entry_missing', path: required});
  }

  if (cliSourceBytes > hobbyCliSourceLimit) {
    warnings.push({
      warning: 'hobby_cli_source_limit_exceeded',
      bytes: cliSourceBytes,
      limit: hobbyCliSourceLimit,
      action: 'Keep production on the Git integration; externalize optional static collections before using Hobby CLI deploy.'
    });
  }

  return {
    ok: failures.length === 0,
    public: {files: publicFiles.length, bytes: publicBytes, budget: publicBudget, headroom: publicBudget - publicBytes},
    dist: {files: distFiles.length, bytes: distBytes, budget: distBudget, headroom: distFiles.length ? distBudget - distBytes : null},
    apiFunctions: {count: apiFiles.length, budget: apiFunctionBudget, names: apiFiles.map(file => basename(file.path)).sort()},
    largestPublic: largestPublic ? {file: relative(root, largestPublic.path).replaceAll('\\', '/'), bytes: largestPublic.bytes} : null,
    cliSourceEstimate: {bytes: cliSourceBytes, hobbyLimit: hobbyCliSourceLimit},
    functionBundleStandardLimitBytes: 250 * decimalMb,
    failures,
    warnings
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = verifyVercelBudget();
  const output = JSON.stringify(result, null, 2);
  if (result.ok) console.log(output);
  else {
    console.error(output);
    process.exitCode = 1;
  }
}
