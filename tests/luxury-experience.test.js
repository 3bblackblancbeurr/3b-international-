import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { experiencePolicy, INTRO_SEEN_KEY, markIntroSeen, MOTION, readIntroSeen, REALM_PREVIEWS, surfaceTilt } from '../src/design-system/experience-policy.js';
import { DEFAULT_OPTIONS, normalizeOptions } from '../src/lib/member.js';

test('accessibility and saved animation preferences take precedence over cinematic quality', () => {
  for (const [options, device] of [[{}, { reduced: true }], [{ reducedMotion: true }, {}], [{ animations: false }, {}]]) {
    const policy = experiencePolicy(options, device);
    assert.equal(policy.animate, false);
    assert.equal(policy.preview3D, false);
    assert.equal(policy.introDuration, 0);
    assert.equal(policy.haptics, false);
  }
});
test('data saver and small-memory devices get artwork while preserving interface motion', () => {
  for (const device of [{ saveData: true }, { memory: 2 }, { memory: 4 }]) {
    const policy = experiencePolicy({}, device);
    assert.equal(policy.preview3D, false);
    assert.equal(policy.animate, true);
  }
  assert.equal(experiencePolicy({}, { memory: 8 }).preview3D, true);
  assert.equal(experiencePolicy({}, { hidden: true }).animate, false);
});
test('existing options migrate to silent feedback and sensor opt-in', () => {
  const options = normalizeOptions({ matrix: true, animations: true });
  assert.equal(options.interfaceSound, false);
  assert.equal(options.sensorReflections, false);
  assert.equal(options.matrix, true);
  assert.equal(experiencePolicy(options).sound, false);
  assert.equal(experiencePolicy({ interfaceSound: true }).sound, true);
  assert.equal(experiencePolicy({ haptics: false }).haptics, false);
  assert.equal(DEFAULT_OPTIONS.cinematicIntros, true);
});
test('first entry is brief, return entry is fast, and unavailable storage is harmless', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(readIntroSeen(storage), false);
  markIntroSeen(storage);
  assert.equal(values.get(INTRO_SEEN_KEY), 'seen');
  assert.equal(readIntroSeen(storage), true);
  assert.equal(experiencePolicy({}, { seen: true }).introDuration, MOTION.return);
  assert.ok(MOTION.intro <= 2500 && MOTION.return <= 200);
  const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.equal(readIntroSeen(blocked), false);
  assert.doesNotThrow(() => markIntroSeen(blocked));
  assert.equal(experiencePolicy({ cinematicIntros: false }).introDuration, 0);
});
test('extreme or invalid sensor values cannot spin the Passport or produce NaN', () => {
  for (const [x, y] of [[-100, 99], [Infinity, NaN], [.5, .5], [0, 0], [1, 1]]) {
    const pose = surfaceTilt(x, y);
    assert.ok(Math.abs(pose.x) <= 4 && Math.abs(pose.y) <= 4);
    assert.ok(pose.lightX >= 0 && pose.lightX <= 100);
    assert.ok(pose.lightY >= 0 && pose.lightY <= 100);
  }
});
test('preview keeps the eight established values and does not grant progress', () => {
  assert.equal(new Set(REALM_PREVIEWS.map(realm => realm.code)).size, 8);
  assert.deepEqual(REALM_PREVIEWS.map(realm => realm.value), ['Justice', 'Loyauté', 'Noblesse', 'Courage', 'Passion', 'Espoir', 'Foi', 'Sagesse']);
  const preview = readFileSync('src/design-system/UniversePreview.jsx', 'utf8');
  assert.doesNotMatch(preview, /recordWorldAction|memberRequest|fetch\(|localStorage/);
});
test('owner decision: one Matrix Passport with no buttons, links or city trigger inside it', () => {
  const card = readFileSync('src/components/PassportVisual.jsx', 'utf8');
  assert.doesNotMatch(card, /<button\b|<Button\b|<a\b|role="button"|passport-portal-trigger|PassportNexus/);
  for (const className of ['passport-matrix-rain', 'passport-matrix-stream', 'passport-circuits', 'passport-blue-sweep']) assert.ok(card.includes(className));
  assert.equal((card.match(/className="passport-card-stage/g) || []).length, 1);
  assert.match(readFileSync('src/components/HomePage.jsx', 'utf8'), /title="Créer ma ville"/);
});

// The entrance sequence must never run inside an access-denied screen.
test('an unauthenticated route retains its Passport gate without an intro scope leak', () => {
  const app = readFileSync('src/App.jsx', 'utf8');
  const gate = app.slice(app.indexOf('function PassportAccessGate'), app.indexOf('function PassportPage'));
  assert.doesNotMatch(gate, /LuxuryBoot|introReplay/);
  assert.match(gate, /Passeport 3B requis/);
});
