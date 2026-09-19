import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHubRuntimeItems, hubDistrictPosition, selectNpcBudget } from '../src/world/hub/runtime.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'src', 'world', 'hub', 'data');
const read = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));
const plan = read('hub-master-plan-v2.json');
const npcs = read('npcs-v1.json');
const missions = read('missions-v1.json');
const events = read('events-v1.json');
const secrets = read('secrets-v1.json');

test('Hub runtime exposes every canonical district and mission', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'desktop' });
  assert.equal(runtime.meta.districts, 10);
  assert.equal(runtime.meta.missions, 20);
  assert.equal(runtime.meta.trainStops, 10);
  assert.equal(runtime.meta.boatStops, 5);
  assert.equal(runtime.meta.events, 10);
  assert.equal(runtime.meta.secrets, 16);
  assert.equal(new Set(runtime.items.map((item) => item.id)).size, runtime.items.length);
});

test('Hub runtime applies mobile NPC budgets without losing canonical total', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'mobileMedium' });
  assert.equal(runtime.meta.npcsTotal, 24);
  assert.equal(runtime.meta.npcsActive, selectNpcBudget(plan, 'mobileMedium'));
  assert.ok(runtime.meta.npcsActive <= runtime.meta.npcsTotal);
});

test('Every runtime item has finite coordinates in the hub', () => {
  const runtime = buildHubRuntimeItems({ plan, npcs, missions, events, secrets, profile: 'desktop' });
  for (const item of runtime.items) {
    assert.ok(Number.isFinite(item.x), item.id);
    assert.ok(Number.isFinite(item.z), item.id);
    assert.ok(Math.hypot(item.x, item.z) < 120, item.id);
  }
});

test('Canonical first playable slice districts resolve to positions', () => {
  for (const district of plan.firstPlayableSlice.districts) {
    assert.ok(hubDistrictPosition(plan, district), district);
  }
});
