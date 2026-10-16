import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const native = readFileSync(new URL('../src/health/useNativeSteps.js', import.meta.url), 'utf8');
const insights = readFileSync(new URL('../src/health/HealthInsights.jsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/health/HealthPage.jsx', import.meta.url), 'utf8');

test('automatic pedometer periodically refreshes only the native-connected and visible app', () => {
  assert.match(native, /if\(!health\.data\.nativeEnabled \|\| !hasHealthBridge\(\)\)return;/);
  assert.match(native, /window\.setInterval/);
  assert.match(native, /!document\.hidden && enabled\.current && !locked\.current/);
  assert.match(native, /void refresh\(false\)/);
  assert.match(native, /},60000\)/);
  assert.match(native, /window\.clearInterval\(timer\)/);
  assert.match(native, /return onHealthResume/);
});

test('automatic pedometer makes no invented realtime or background health claims', () => {
  assert.match(insights, /environ chaque minute tant que Santé est affichée/);
  assert.match(insights, /délai de synchronisation/);
  assert.doesNotMatch(page, /Pas du jour · total manuel|Total de pas du jour · saisie manuelle/);
  assert.doesNotMatch(native, /setInterval\(\(\)=>\s*health\.updateDay\(/);
});
