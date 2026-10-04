import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COMPANION_PREFS } from '../src/companion/companion-model.js';
import { COMPANION_PREFS_KEY, createCompanionPreferencesStore } from '../src/companion/companion-preferences.js';

function storageHarness(initial) {
  const values = new Map(initial === undefined ? [] : [[COMPANION_PREFS_KEY, initial]]);
  let writes = 0;
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { ++writes; values.set(key, value); },
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
  return { storage, values, get writes() { return writes; } };
}

function events() {
  const listeners = new Set();
  return {
    addEventListener(type, listener) { if (type === 'storage') listeners.add(listener); },
    removeEventListener(type, listener) { if (type === 'storage') listeners.delete(listener); },
    send(event) { for (const listener of [...listeners]) listener(event); },
    get size() { return listeners.size; },
  };
}

test('a damaged or foreign preference payload cannot add fields or enable native services', () => {
  for (const input of ['{broken', 'null', '[]', '7', '"enabled"']) {
    const { storage } = storageHarness(input);
    const prefs = createCompanionPreferencesStore({ getStorage: () => storage });
    assert.deepEqual(prefs.getSnapshot(), DEFAULT_COMPANION_PREFS);
  }
  const { storage } = storageHarness(JSON.stringify({ enabled: false, androidOverlayEnabled: 'true', microphone: true, voiceId: 'other' }));
  const prefs = createCompanionPreferencesStore({ getStorage: () => storage });
  assert.equal(prefs.getSnapshot().enabled, false);
  assert.equal(prefs.getSnapshot().androidOverlayEnabled, false);
  assert.deepEqual(Object.keys(prefs.getSnapshot()), Object.keys(DEFAULT_COMPANION_PREFS));
  assert.ok(Object.isFrozen(prefs.getSnapshot()));
});

test('the companion and both settings surfaces receive one same-tab change without an event broadcast', () => {
  const fixture = storageHarness();
  const target = events();
  const prefs = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: target });
  const seen = [[], [], []];
  const off = seen.map(log => prefs.subscribe(() => log.push(prefs.getSnapshot().enabled)));
  prefs.update({ enabled: false });
  assert.deepEqual(seen, [[false], [false], [false]]);
  assert.equal(fixture.writes, 1);
  const previous = prefs.getSnapshot();
  prefs.update({ enabled: false, extra: 'ignored' });
  assert.equal(prefs.getSnapshot(), previous, 'unchanged snapshots keep React subscriptions stable');
  assert.equal(fixture.writes, 1);
  assert.deepEqual(seen, [[false], [false], [false]]);
  assert.equal(target.size, 1);
  off.forEach(unsubscribe => unsubscribe());
  assert.equal(target.size, 0);
});

test('cross-tab updates converge to the latest persisted choice without write-back loops', () => {
  const fixture = storageHarness();
  const tabA = events(), tabB = events();
  const a = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: tabA });
  const b = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: tabB });
  const changes = [];
  const offA = a.subscribe(() => {}), offB = b.subscribe(() => changes.push(b.getSnapshot()));
  a.update({ enabled: false, reducedPresence: true });
  tabB.send({ key: COMPANION_PREFS_KEY, newValue: JSON.stringify({ enabled: true }), storageArea: fixture.storage });
  assert.deepEqual(b.getSnapshot(), a.getSnapshot(), 'a queued older event must read the latest disk value');
  assert.equal(changes.length, 1);
  assert.equal(fixture.writes, 1, 'receiving a change must not write it again');
  b.update({ enabled: true });
  tabA.send({ key: COMPANION_PREFS_KEY, storageArea: fixture.storage });
  assert.equal(a.getSnapshot().enabled, true);
  assert.equal(a.getSnapshot().reducedPresence, true);
  assert.equal(fixture.writes, 2);
  offA(); offB();
});

test('unrelated and session-storage events cannot change the companion', () => {
  const fixture = storageHarness();
  const target = events();
  const prefs = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: target });
  const off = prefs.subscribe(() => {});
  prefs.update({ enabled: false });
  fixture.storage.clear();
  target.send({ key: 'another-setting', storageArea: fixture.storage });
  target.send({ key: COMPANION_PREFS_KEY, storageArea: {} });
  assert.equal(prefs.getSnapshot().enabled, false);
  target.send({ key: null, newValue: null, storageArea: fixture.storage });
  assert.deepEqual(prefs.getSnapshot(), DEFAULT_COMPANION_PREFS);
  off();
});

test('an unrelated edit in another tab cannot undo disable before its storage event arrives', () => {
  const fixture = storageHarness();
  const a = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: events() });
  const b = createCompanionPreferencesStore({ getStorage: () => fixture.storage, eventTarget: events() });
  b.getSnapshot();
  a.update({ enabled: false });
  b.update({ batterySaver: false });
  assert.equal(b.getSnapshot().enabled, false);
  assert.equal(b.getSnapshot().batterySaver, false);
  assert.equal(JSON.parse(fixture.storage.getItem(COMPANION_PREFS_KEY)).enabled, false);
  assert.equal(fixture.writes, 2);
});

test('denied storage getters and writes preserve session choices across settings mounts', () => {
  for (const getStorage of [
    () => { throw new Error('blocked'); },
    () => ({ getItem: () => null, setItem() { throw new Error('quota'); } }),
  ]) {
    const prefs = createCompanionPreferencesStore({ getStorage, eventTarget: events() });
    const off = prefs.subscribe(() => {});
    prefs.update({ enabled: false, batterySaver: false, reducedPresence: true });
    off();
    const offAgain = prefs.subscribe(() => {});
    assert.equal(prefs.getSnapshot().enabled, false);
    assert.equal(prefs.getSnapshot().batterySaver, false);
    assert.equal(prefs.getSnapshot().reducedPresence, true);
    prefs.update({ enabled: true });
    assert.equal(prefs.getSnapshot().enabled, true);
    offAgain();
  }
});

test('disable and re-enable preserve independent personality, voice and constellation records', () => {
  const fixture = storageHarness(JSON.stringify({ enabled: true, batterySaver: false, reducedPresence: true }));
  const personality = JSON.stringify({ personality: 'taquin', voiceEnabled: true, voiceStyle: 'grave', voiceId: 'fr-native' });
  const bond = JSON.stringify([0, 2, 5]);
  fixture.storage.setItem('threeb_companion_living_v1', personality);
  fixture.storage.setItem('threeb_companion_constellation_v1', bond);
  const prefs = createCompanionPreferencesStore({ getStorage: () => fixture.storage });
  prefs.update({ enabled: false });
  const reloaded = createCompanionPreferencesStore({ getStorage: () => fixture.storage });
  assert.equal(reloaded.getSnapshot().enabled, false);
  reloaded.update({ enabled: true });
  assert.equal(reloaded.getSnapshot().batterySaver, false);
  assert.equal(reloaded.getSnapshot().reducedPresence, true);
  assert.equal(fixture.storage.getItem('threeb_companion_living_v1'), personality);
  assert.equal(fixture.storage.getItem('threeb_companion_constellation_v1'), bond);
});
