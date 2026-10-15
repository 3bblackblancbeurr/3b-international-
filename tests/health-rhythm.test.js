import test from 'node:test';
import assert from 'node:assert/strict';
import { blankHealth, normalizeHealth, normalizeStepTarget } from '../src/health/model.js';
import { healthRhythm, STEP_TARGET_CHOICES } from '../src/health/rhythm.js';

const date = '2026-10-15', now = new Date('2026-10-15T12:00:00Z');

test('personal step target is strictly optional and validated on import and update', () => {
  assert.equal(blankHealth().stepTarget, null);
  assert.equal(normalizeHealth({...blankHealth(), stepTarget: 7500}, now).stepTarget, 7500);
  assert.deepEqual(STEP_TARGET_CHOICES, [2500, 5000, 7500, 10000]);
  for (const invalid of ['5000', 999, 1001, 30001, NaN, false, -500, 3.5]) {
    assert.equal(normalizeStepTarget(invalid), null);
    assert.equal(normalizeHealth({...blankHealth(), stepTarget: invalid}, now).stepTarget, null);
  }
  assert.equal(normalizeHealth({...blankHealth(), days:{[date]:{steps: 42}}}, now).days[date].steps, 42);
});

test('radial progress only uses actual recorded totals, not unknown or invented steps', () => {
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

test('source priority prevents combining native, manual and experimental web estimates', () => {
  const data = { ...blankHealth(), stepTarget: 5000, days: {
    [date]: { nativeSteps: { steps: 4000, source: 'health-connect', syncedAt: now.toISOString() }, steps: 3000, estimatedSteps: 250 },
    '2026-10-14': { steps: 5000 },
    '2026-10-13': { estimatedSteps: 1500 },
    '2026-10-12': { steps: 0 },
  } };
  const result = healthRhythm(data, date);
  assert.equal(result.today.value, 4000);
  assert.equal(result.today.source, 'health-connect');
  assert.equal(result.percent, 80);
  assert.equal(result.known, 4);
  assert.equal(result.average, 2625);
  assert.equal(result.week.find(day => day.date === '2026-10-13').estimated, true);
  assert.equal(result.week.find(day => day.date === '2026-10-12').value, 0);
  assert.equal(result.week.find(day => day.date === '2026-10-11').value, null);
});

test('radial target saturates only graphically and does not overwrite real step totals', () => {
  const result = healthRhythm({...blankHealth(), stepTarget: 2500, days:{[date]:{steps:12000}}},date);
  assert.equal(result.percent,100);
  assert.equal(result.today.value,12000);
  assert.equal(result.max,12000);
});
