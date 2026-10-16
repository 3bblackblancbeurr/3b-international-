import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  HEALTH_STORAGE_KEY, blankHealth, boundedNumber, createStepDetector,
  normalizeHealth, readHealth, searchText, shoppingList, sleepDuration,
} from '../src/health/model.js';
import { FOODS, GUIDES, RECIPES, SOURCES } from '../src/health/content.js';

test('health inputs distinguish an absent or invalid measure from a genuine zero', () => {
  for (const input of ['', null, undefined, NaN, Infinity, -1, 100001, 'pas renseigné']) {
    assert.equal(boundedNumber(input, 0, 100000), null, `invalid ${String(input)}`);
  }
  assert.equal(boundedNumber(0, 0, 100000), 0);
  assert.equal(boundedNumber('1250', 0, 100000), 1250);
  assert.equal(boundedNumber('7.25', 0, 24, 2), 7.25);
});

test('stored booleans, arrays, objects and blank text never become health measurements', () => {
  for (const input of [true, false, [], [1500], {}, '   ', '\n']) {
    assert.equal(boundedNumber(input, 0, 100000), null, `reject ${JSON.stringify(input)}`);
  }
});

test('journal retains exactly the last 90 local calendar days and rejects future records', () => {
  const now = new Date(2026, 9, 15, 12);
  const days = {};
  for (let offset = -2; offset < 100; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    days[key] = { steps: 1000, estimatedSteps: 37, sleepHours: 7.5 };
  }
  const result = normalizeHealth({ ...blankHealth(), days }, now);
  assert.equal(Object.keys(result.days).length, 90);
  assert.deepEqual(Object.keys(result.days).sort().slice(0, 1), ['2026-07-18']);
  assert.ok(result.days['2026-10-15']);
  assert.equal(result.days['2026-10-16'], undefined);
  assert.equal(result.days['2026-07-17'], undefined);
  assert.equal(result.days['2026-10-15'].steps, null, 'legacy manual step totals are retired');
  assert.equal(result.days['2026-10-15'].estimatedSteps, null, 'legacy web step estimates are retired');
});

test('unreadable storage and malformed JSON leave the temporary journal usable', () => {
  const missing = readHealth({ getItem(key) { assert.equal(key, HEALTH_STORAGE_KEY); return null; } });
  assert.deepEqual(missing, { data: blankHealth(), saved: false, error: false });
  for (const storage of [
    { getItem() { throw new Error('storage disabled'); } },
    { getItem() { return '{bad JSON'; } },
  ]) {
    assert.deepEqual(readHealth(storage), { data: blankHealth(), saved: false, error: true });
  }
  assert.deepEqual(normalizeHealth(null), blankHealth());
  assert.deepEqual(normalizeHealth({ version: 400 }), blankHealth());
});

test('no steps are invented by elapsed time, invalid events or stationary acceleration', () => {
  const detect = createStepDetector();
  assert.equal(detect(null, null, null, 0), false);
  assert.equal(detect(0, 0, 9.81, 60_000), false, 'elapsed time is not a step count');
  for (let sample = 1; sample <= 1000; sample++) {
    assert.equal(detect(0, 0, 9.81, 60_000 + sample * 40), false);
  }
  assert.equal(detect(NaN, 0, 9.81, 120_000), false);
  assert.equal(detect(0, 0, 9.81, Infinity), false);
});

test('a movement peak cannot count twice inside the step debounce interval', () => {
  const detect = createStepDetector();
  const samples = [[0, 9.81], [400, 12], [440, 9.81], [500, 12], [550, 9.81], [800, 12]];
  assert.deepEqual(samples.map(([time, z]) => detect(0, 0, z, time)), [false, true, false, false, false, true]);
});

test('shopping totals combine repeated meals and scale to the chosen number of people', () => {
  const plan = { '2026-10-15': 'couscous-vegetal', '2026-10-16': 'couscous-vegetal', '2026-10-17': 'salade-pois-chiches', '2026-10-18': 'no-such-recipe' };
  const list = shoppingList(plan, RECIPES, 4);
  assert.equal(list.find(item => item.name === 'Pois chiches cuits égouttés').quantity, 1560);
  assert.equal(list.find(item => item.name === 'Huile d’olive').quantity, 6);
  assert.equal(list.find(item => item.name === 'Semoule complète de blé').quantity, 480);
  assert.equal(new Set(list.map(item => item.key)).size, list.length);
  assert.deepEqual(shoppingList({}, RECIPES, 4), []);
});

test('the same fresh vegetable across meals is one shopping item, even when recipes need different counts', () => {
  const plan = { '2026-10-15': 'couscous-vegetal', '2026-10-16': 'lentilles-betterave' };
  const carrots = shoppingList(plan, RECIPES, 2).filter(item => /^carottes?$/.test(searchText(item.name)));
  assert.equal(carrots.length, 1, 'one carrot line for the whole shopping trip');
  assert.equal(carrots[0].quantity, 3);
});

test('sleep supports overnight and daytime rest while refusing reversed or excessive intervals', () => {
  assert.equal(sleepDuration('2026-10-14T23:00', '2026-10-15T07:30'), 8.5);
  assert.equal(sleepDuration('2026-10-15T08:00', '2026-10-15T15:00'), 7);
  assert.equal(sleepDuration('', '2026-10-15T15:00'), null);
  assert.equal(sleepDuration('invalid', '2026-10-15T15:00'), null);
  assert.equal(sleepDuration('2026-10-15T15:00', '2026-10-15T08:00'), null);
  assert.equal(sleepDuration('2026-10-14T07:00', '2026-10-15T08:00'), null);
});

test('Paris clock changes count elapsed sleep hours and retain consecutive calendar dates', () => {
  const moduleUrl = new URL('../src/health/model.js', import.meta.url).href;
  const script = `import { sleepDuration, previousDays, localDay } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(JSON.stringify({
      spring: sleepDuration('2026-03-29T00:00', '2026-03-29T08:00'),
      autumn: sleepDuration('2026-10-25T00:00', '2026-10-25T08:00'),
      days: previousDays(4, new Date('2026-10-26T00:30:00')),
      local: localDay(new Date('2026-10-14T22:30:00Z'))
    }));`;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: 'Europe/Paris' }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), {
    spring: 7, autumn: 9,
    days: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'],
    local: '2026-10-15',
  });
});

test('every published food, recipe and body guide can disclose a real source link', () => {
  const entries = [...FOODS, ...RECIPES, ...GUIDES];
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length, 'favorites require unique IDs');
  for (const item of entries) {
    assert.ok(item.sourceIds.length > 0, `${item.id} needs a reference`);
    for (const sourceId of item.sourceIds) {
      assert.ok(SOURCES[sourceId], `${item.id}: unresolved source ${sourceId}`);
      assert.equal(new URL(SOURCES[sourceId].url).protocol, 'https:');
    }
  }
});
