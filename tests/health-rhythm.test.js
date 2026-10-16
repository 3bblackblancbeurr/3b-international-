import test from 'node:test';
import assert from 'node:assert/strict';
import { blankHealth, normalizeHealth, normalizeStepTarget } from '../src/health/model.js';
import { healthRhythm, STEP_TARGET_CHOICES } from '../src/health/rhythm.js';

const date = '2026-10-15', now = new Date('2026-10-15T12:00:00Z');
const native = steps => ({ nativeSteps: { steps, source: 'health-connect', syncedAt: now.toISOString() } });

test('personal step target is strictly optional and validated on import and update', () => {
  assert.equal(blankHealth().stepTarget, null);
  assert.equal(normalizeHealth({...blankHealth(), stepTarget: 7500}, now).stepTarget, 7500);
  assert.deepEqual(STEP_TARGET_CHOICES, [2500, 5000, 7500, 10000]);
  for (const invalid of ['5000', 999, 1001, 30001, NaN, false, -500, 3.5]) {
    assert.equal(normalizeStepTarget(invalid), null);
    assert.equal(normalizeHealth({...blankHealth(), stepTarget: invalid}, now).stepTarget, null);
  }
});

test('legacy manual and experimental step values are retired from the normalized journal', () => {
  const day = normalizeHealth({...blankHealth(), days:{[date]:{steps: 4200, estimatedSteps: 300}}}, now).days[date];
  assert.equal(day.steps, null);
  assert.equal(day.estimatedSteps, null);
  assert.equal(healthRhythm({...blankHealth(), days:{[date]:day}}, date).today.value, null);
});

test('radial progress only uses native phone totals, never unknown or invented steps', () => {
  const empty = healthRhythm(blankHealth(), date);
  assert.equal(empty.today.value, null);
  assert.equal(empty.percent, null);
  assert.equal(empty.known, 0);
  assert.equal(empty.average, null);
  assert.equal(empty.week.length, 7);
  assert.ok(empty.week.every(day => day.value === null));
  const unrecorded = healthRhythm({...blankHealth(), stepTarget: 5000}, date);
  assert.equal(unrecorded.percent, null);
});

test('native-only source policy prevents manual or web estimates entering totals', () => {
  const data = { ...blankHealth(), stepTarget: 5000, days: {
    [date]: { ...native(4000), steps: 3000, estimatedSteps: 250 },
    '2026-10-14': native(5000),
    '2026-10-13': { estimatedSteps: 1500 },
    '2026-10-12': { steps: 1000 },
  } };
  const result = healthRhythm(data, date);
  assert.equal(result.today.value, 4000);
  assert.equal(result.today.source, 'health-connect');
  assert.equal(result.percent, 80);
  assert.equal(result.known, 2);
  assert.equal(result.average, 4500);
  assert.equal(result.week.find(day => day.date === '2026-10-13').value, null);
  assert.equal(result.week.find(day => day.date === '2026-10-12').value, null);
});

test('radial target saturates only graphically and does not overwrite real native totals', () => {
  const result = healthRhythm({...blankHealth(), stepTarget: 2500, days:{[date]:native(12000)}},date);
  assert.equal(result.percent,100);
  assert.equal(result.today.value,12000);
  assert.equal(result.max,12000);
});
