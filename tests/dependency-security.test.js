import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));

test('the transitive brace parser is pinned past the published recursion fixes', () => {
  assert.equal(manifest.overrides?.['brace-expansion'], '5.0.12');
  assert.equal(lock.packages?.['node_modules/brace-expansion']?.version, '5.0.12');
});
