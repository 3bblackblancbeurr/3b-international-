import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('AI Council migrations are mirrored in the integrity manifest', () => {
  const manifest = JSON.parse(read('supabase/migrations/APPLIED_MIGRATIONS_SHA256.json'));
  assert.equal(manifest.count, manifest.migrations.length);
  const byVersion = new Map(manifest.migrations.map((item) => [item.version, item]));
  assert.equal(
    byVersion.get('20260921154102')?.sha256,
    'b54048cc719cbac5c9c6d01a445598b28c161c41453d0efc9e48eaddca69511e',
  );
  assert.equal(
    byVersion.get('20260921154300')?.sha256,
    'bd30c93f2082d9e2efabd4550ffa3f019c4315bc3ae81ad1c751ed00eb9c0d18',
  );
});

test('AI Council orchestrator is fail-closed and requires explicit approval', () => {
  const source = read('supabase/functions/ai-council-orchestrate/index.ts');
  assert.match(source, /AI_COUNCIL_ENABLED/);
  assert.match(source, /AI_COUNCIL_OWNER_USER_ID/);
  assert.match(source, /approval_required:\s*true/);
  assert.match(source, /api\.openai\.com\/v1\/responses/);
  assert.match(source, /api\.anthropic\.com\/v1\/messages/);
  assert.match(source, /generativelanguage\.googleapis\.com/);
  assert.doesNotMatch(source, /VITE_(OPENAI|ANTHROPIC|GEMINI)/);
});

test('Unreal editor bridge stays local and read-only in v1', () => {
  const bridge = read('scripts/threeb-unreal-bridge.mjs');
  assert.match(bridge, /127\.0\.0\.1/);
  assert.match(bridge, /localhost/);
  assert.match(bridge, /GetAllLevelActors/);
  assert.match(bridge, /read-only-v1/);
  assert.match(bridge, /health/);
  assert.match(bridge, /actors/);
  assert.match(bridge, /snapshot/);
  assert.doesNotMatch(bridge, /service_role/i);
  assert.doesNotMatch(bridge, /OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/);
});

test('Unreal project enables editor automation plugins', () => {
  const project = JSON.parse(read('unreal/ThreeBWorld/ThreeBWorld.uproject'));
  const enabled = new Set(project.Plugins.filter((plugin) => plugin.Enabled).map((plugin) => plugin.Name));
  assert.ok(enabled.has('PythonScriptPlugin'));
  assert.ok(enabled.has('EditorScriptingUtilities'));
  assert.ok(enabled.has('RemoteControl'));
});
