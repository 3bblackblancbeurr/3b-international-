import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('applied migration manifest contains current AI Council and Unreal server migrations',()=>{
  const manifest=JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
  assert.equal(manifest.count,manifest.migrations.length);
  const hashes=new Map(manifest.migrations.map(m=>[m.version,m.sha256]));
  assert.equal(hashes.get('20260921154102'),'b54048cc719cbac5c9c6d01a445598b28c161c41453d0efc9e48eaddca69511e');
  assert.equal(hashes.get('20260921162711'),'9e3be34354b800b95524b64b3b487598d78d634ca97e342dab1de7365d6ffc75');
  assert.equal(hashes.get('20260921163513'),'c15547b8d52c0508bfe1318da7fdec05e6734a437e6a9890eab09d63572a7706');
});

test('AI Council owner identity stays private and server-authoritative',()=>{
  const source=read('supabase/functions/ai-council-orchestrate/index.ts');
  const migration=read('supabase/migrations/20260921163513_ai_council_settings_v1.sql');
  assert.match(source,/ai_council_settings/);
  assert.match(source,/owner_email/);
  assert.match(source,/approval_required:\s*true/);
  assert.match(migration,/revoke all on table public\.ai_council_settings from anon, authenticated/);
  assert.doesNotMatch(source,/stetienne86pp/i);
  assert.doesNotMatch(migration,/stetienne86pp/i);
});

test('Unreal editor bridge is local-only and read-only v1',()=>{
  const bridge=read('scripts/threeb-unreal-bridge.mjs');
  assert.match(bridge,/127\.0\.0\.1/);
  assert.match(bridge,/localhost/);
  assert.match(bridge,/GetAllLevelActors/);
  assert.match(bridge,/read-only-v1/);
  assert.doesNotMatch(bridge,/OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|SERVICE_ROLE/i);
});

test('canonical Unreal project enables editor automation plugins',()=>{
  const project=JSON.parse(read('unreal/ThreeBWorld/ThreeBWorld.uproject'));
  const enabled=new Set(project.Plugins.filter(p=>p.Enabled).map(p=>p.Name));
  assert.ok(enabled.has('PythonScriptPlugin'));
  assert.ok(enabled.has('EditorScriptingUtilities'));
  assert.ok(enabled.has('RemoteControl'));
});
