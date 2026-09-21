import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../supabase/migrations/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('APPLIED_MIGRATIONS_SHA256.json',root),'utf8'));
const normalize=sql=>sql.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g,'');
const sha256=sql=>createHash('sha256').update(normalize(sql),'utf8').digest('hex');

test('applied migration manifest is one-to-one with versioned SQL files',()=>{
 const files=readdirSync(fileURLToPath(root))
  .filter(name=>/^\d{14}_.+\.sql$/.test(name))
  .sort();
 assert.equal(manifest.generated_from,'supabase_migrations.schema_migrations');
 assert.equal(manifest.count,manifest.migrations.length);
 assert.equal(files.length,manifest.count);

 const expected=manifest.migrations.map(m=>`${m.version}_${m.name}.sql`).sort();
 assert.deepEqual(files,expected);
});

test('applied migration SQL hashes match the immutable database manifest',()=>{
 for(const migration of manifest.migrations){
  const name=`${migration.version}_${migration.name}.sql`;
  const sql=readFileSync(new URL(name,root),'utf8');
  assert.equal(sha256(sql),migration.sha256,name);
 }
});

test('migration versions are unique and strictly ordered in the manifest',()=>{
 const versions=manifest.migrations.map(m=>m.version);
 assert.equal(new Set(versions).size,versions.length);
 assert.deepEqual([...versions].sort(),versions);
});
