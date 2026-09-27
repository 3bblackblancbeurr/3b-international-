import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const root=new URL('../supabase/migrations/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('../supabase/migrations/APPLIED_MIGRATIONS_SHA256.json',import.meta.url),'utf8'));
const pending=JSON.parse(readFileSync(new URL('../supabase/migrations/PENDING_MIGRATIONS_SHA256.json',import.meta.url),'utf8'));
if(pending.status!=='pending-not-deployed')throw new Error('Invalid pending migration status');
const normalize=value=>value.trim();
const sha256=value=>createHash('sha256').update(normalize(value),'utf8').digest('hex');

const expected=new Map(
  [...manifest.migrations,...pending.migrations].map(m=>[
    `${m.version}_${m.name}.sql`,
    m.sha256
  ])
);

const problems=[];
if(pending.count!==pending.migrations.length)problems.push({error:'pending_count_mismatch'});
if(expected.size!==manifest.migrations.length+pending.migrations.length)problems.push({error:'duplicate_migration'});

for(const [file,expectedHash] of expected){
  const url=new URL('../supabase/migrations/'+file,import.meta.url);
  if(!existsSync(url)){
    problems.push({file,error:'missing'});
    continue;
  }
  const actual=sha256(readFileSync(url,'utf8'));
  if(actual!==expectedHash){
    problems.push({file,error:'sha256_mismatch',expected:expectedHash,actual});
  }
}

const sqlFiles=readdirSync(root).filter(name=>name.endsWith('.sql'));
for(const file of sqlFiles){
  if(!expected.has(file))problems.push({file,error:'not_in_applied_manifest'});
}

if(manifest.count!==manifest.migrations.length){
  problems.push({error:'manifest_count_mismatch',declared:manifest.count,actual:manifest.migrations.length});
}

if(problems.length){
  console.error(JSON.stringify({ok:false,problems},null,2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok:true,
  appliedMigrations:manifest.count,
  pendingMigrations:pending.count,
  repositorySqlFiles:sqlFiles.length
},null,2));
