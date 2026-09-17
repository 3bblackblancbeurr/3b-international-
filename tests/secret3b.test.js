import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countdownTo,
  normalizePhoneDraft,
  phoneDigitCount,
  sortSlots,
} from '../src/secret/secretUtils.js';

test('normalizePhoneDraft keeps only a leading plus and digits', () => {
  assert.equal(normalizePhoneDraft('+33 (0)6 12-34-56-78'), '+330612345678');
  assert.equal(normalizePhoneDraft('06 12 34 56 78'), '0612345678');
  assert.equal(normalizePhoneDraft('abc +33'), '33');
});

test('normalizePhoneDraft limits accidental oversized values', () => {
  assert.equal(normalizePhoneDraft('+12345678901234567890'), '+123456789012345');
});

test('phoneDigitCount ignores presentation characters', () => {
  assert.equal(phoneDigitCount('+33 6 12 34 56 78'), 11);
  assert.equal(phoneDigitCount(''), 0);
});

test('countdownTo returns deterministic units', () => {
  const now = Date.parse('2026-09-17T12:00:00Z');
  const target = '2026-09-18T13:02:03Z';
  assert.deepEqual(countdownTo(target, now), {
    done: false,
    days: 1,
    hours: 1,
    minutes: 2,
    seconds: 3,
  });
  assert.equal(countdownTo('2026-09-17T11:59:59Z', now).done, true);
});

test('sortSlots prioritizes sequence number', () => {
  const slots = [
    { sequence_no: 3, publish_at: '2026-09-20T10:00:00Z' },
    { sequence_no: 1, publish_at: '2026-09-22T10:00:00Z' },
    { sequence_no: 2, publish_at: '2026-09-18T10:00:00Z' },
  ];
  assert.deepEqual(sortSlots(slots).map((slot) => slot.sequence_no), [1, 2, 3]);
});
