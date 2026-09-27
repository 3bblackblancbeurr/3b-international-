import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../supabase/migrations/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('APPLIED_MIGRATIONS_SHA256.json',root),'utf8'));
const pending=JSON.parse(readFileSync(new URL('PENDING_MIGRATIONS_SHA256.json',root),'utf8'));
const all=[...manifest.migrations,...pending.migrations];
const normalize=sql=>sql.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
const sha256=sql=>createHash('sha256').update(normalize(sql),'utf8').digest('hex');

test('applied and explicitly pending manifests cover every versioned SQL file',()=>{
 const files=readdirSync(fileURLToPath(root))
  .filter(name=>/^\d{14}_.+\.sql$/.test(name))
  .sort();
 assert.equal(manifest.generated_from,'supabase_migrations.schema_migrations');
 assert.equal(manifest.count,manifest.migrations.length);
 assert.equal(pending.status,'pending-not-deployed');
 assert.equal(pending.count,pending.migrations.length);
 assert.equal(files.length,manifest.count+pending.count);

 const expected=all.map(m=>`${m.version}_${m.name}.sql`).sort();
 assert.deepEqual(files,expected);
});

test('applied migration SQL hashes match the immutable database manifest',()=>{
 for(const migration of all){
  const name=`${migration.version}_${migration.name}.sql`;
  const sql=readFileSync(new URL(name,root),'utf8');
  assert.equal(sha256(sql),migration.sha256,name);
 }
});

test('migration versions are unique and strictly ordered in the manifest',()=>{
 const versions=all.map(m=>m.version);
 assert.equal(new Set(versions).size,versions.length);
 assert.deepEqual([...versions].sort(),versions);
});
