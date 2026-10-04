import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionPreferencesStore } from '../src/companion/companion-preferences.js';
import { createCompanionNativePresence } from '../src/companion/companion-native-presence.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function setup(platform = 'android', initial = {}, overrides = {}) {
  const preferences = createCompanionPreferencesStore({ getStorage: () => null, eventTarget: null });
  preferences.update(initial);
  const calls = [];
  let active = initial.androidOverlayEnabled === true || initial.iosLiveActivityEnabled === true;
  const native = {
    companionPlatform: () => platform,
    getCompanionCapabilities: async () => ({ platform, available: true, overlayActive: platform === 'android' && active, liveActivityActive: platform === 'ios' && active }),
    requestOverlayPermission: async () => { calls.push('permission'); return { granted: true }; },
    startCompanionOverlay: async () => { calls.push('startOverlay'); active = true; return { started: true }; },
    stopCompanionOverlay: async () => { calls.push('stopOverlay'); active = false; return { stopped: true }; },
    startCompanionLiveActivity: async () => { calls.push('startLive'); active = true; return { started: true }; },
    endCompanionLiveActivity: async () => { calls.push('endLive'); active = false; return { ended: true }; },
    syncCompanionWidget: async options => { calls.push({ widget: options }); return { updated: true }; },
    openCompanionWallpaperPicker: async () => ({ opened: true }),
    ...overrides,
  };
  const controller = createCompanionNativePresence({ preferences, native });
  return { preferences, controller, calls, native, setActive(value) { active = value; } };
}

test('local disable takes effect synchronously and never starts a web/native service by itself', async () => {
  const f = setup('web');
  f.preferences.update({ enabled: false });
  assert.equal(f.preferences.getSnapshot().enabled, false);
  assert.equal(f.controller.getSnapshot().busy, false);
  assert.deepEqual(f.calls, []);
  f.preferences.update({ enabled: true });
  await Promise.resolve();
  assert.deepEqual(f.calls, []);
  f.controller.dispose();
});

test('disable during Android permission cancels the pending start and keeps shutdown observable', async () => {
  const permission = deferred();
  const f = setup('android', {}, { requestOverlayPermission: () => permission.promise });
  const start = f.controller.enableOverlay({ mode: 'idle' });
  await Promise.resolve();
  assert.equal(f.controller.getSnapshot().busy, true);
  f.preferences.update({ enabled: false });
  assert.equal(f.preferences.getSnapshot().enabled, false, 'hiding never waits for Android permission');
  assert.equal(f.controller.getSnapshot().stopPending, true);
  const stop = f.controller.requestStop();
  permission.resolve({ granted: true });
  await Promise.all([start, stop]);
  assert.deepEqual(f.calls, ['stopOverlay']);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, false);
  assert.equal(f.controller.getSnapshot().busy, false);
  assert.equal(f.controller.getSnapshot().stopFailed, false);
  f.controller.dispose();
});

test('a start already in flight is followed by a stop instead of leaving an invisible external companion', async () => {
  const nativeStart = deferred(), nativeStop = deferred(), enteredStart = deferred(), enteredStop = deferred();
  const f = setup('android', {}, {
    startCompanionOverlay: async () => { f.calls.push('startOverlay'); enteredStart.resolve(); return nativeStart.promise; },
    stopCompanionOverlay: async () => { f.calls.push('stopOverlay'); enteredStop.resolve(); return nativeStop.promise; },
  });
  const start = f.controller.enableOverlay({ mode: 'idle' });
  await enteredStart.promise;
  f.preferences.update({ enabled: false });
  const stop = f.controller.requestStop();
  assert.equal(f.preferences.getSnapshot().enabled, false);
  nativeStart.resolve({ started: true });
  await enteredStop.promise;
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, true, 'do not claim a native stop before acknowledgement');
  assert.equal(f.controller.getSnapshot().stopPending, true);
  nativeStop.resolve({ stopped: true });
  await Promise.all([start, stop]);
  assert.deepEqual(f.calls, ['permission', 'startOverlay', 'stopOverlay']);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, false);
  assert.equal(f.preferences.getSnapshot().enabled, false);
  f.controller.dispose();
});

test('failed native shutdown remains truthful in settings and can be retried while locally disabled', async () => {
  const f = setup('android', { androidOverlayEnabled: true }, { stopCompanionOverlay: async () => ({ stopped: false }) });
  f.preferences.update({ enabled: false });
  assert.equal(await f.controller.requestStop(), false);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, true);
  assert.equal(f.preferences.getSnapshot().enabled, false);
  assert.equal(f.controller.getSnapshot().stopFailed, true);
  assert.match(f.controller.getSnapshot().status, /n’est pas confirmé/);
  f.native.stopCompanionOverlay = async () => { f.setActive(false); return { stopped: true }; };
  assert.equal(await f.controller.requestStop(), true);
  assert.equal(f.preferences.getSnapshot().enabled, false);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, false);
  assert.equal(f.controller.getSnapshot().stopFailed, false);
  assert.equal(f.controller.getSnapshot().status, '');
  f.controller.dispose();
});

test('unavailable native capabilities do not erase a last known active presence', async () => {
  const f = setup('android', { androidOverlayEnabled: true }, {
    stopCompanionOverlay: async () => { throw new Error('plugin unavailable'); },
    getCompanionCapabilities: async () => ({ platform: 'android', available: false }),
  });
  f.preferences.update({ enabled: false });
  await f.controller.requestStop();
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, true);
  assert.equal(f.controller.getSnapshot().capabilities.available, false);
  assert.equal(f.controller.getSnapshot().stopFailed, true);
  f.controller.dispose();
});

test('an active capability after a successful stop acknowledgement is reported as not stopped', async () => {
  const f = setup('android', { androidOverlayEnabled: true }, { stopCompanionOverlay: async () => ({ stopped: true }) });
  f.preferences.update({ enabled: false });
  assert.equal(await f.controller.requestStop(), false);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, true);
  assert.equal(f.controller.getSnapshot().stopFailed, true);
  f.controller.dispose();
});

test('rapid local disable/re-enable cannot revive a permission request from before disable', async () => {
  const permission = deferred();
  const f = setup('android', {}, { requestOverlayPermission: () => permission.promise });
  const start = f.controller.enableOverlay({ mode: 'idle' });
  await Promise.resolve();
  f.preferences.update({ enabled: false });
  const stop = f.controller.requestStop();
  f.preferences.update({ enabled: true });
  permission.resolve({ granted: true });
  await Promise.all([start, stop]);
  assert.equal(f.preferences.getSnapshot().enabled, true);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, false);
  assert.deepEqual(f.calls, ['stopOverlay']);
  f.controller.dispose();
});

test('a locally disabled iPhone ends its Live Activity and sends a disabled widget snapshot', async () => {
  const f = setup('ios', { iosLiveActivityEnabled: true });
  f.preferences.update({ enabled: false });
  assert.equal(await f.controller.requestStop(), true);
  assert.equal(f.preferences.getSnapshot().iosLiveActivityEnabled, false);
  assert.equal(f.preferences.getSnapshot().enabled, false);
  assert.equal(f.calls[0], 'endLive');
  assert.equal(f.calls[1].widget.enabled, false);
  assert.equal(f.calls.some(call => call === 'startLive'), false);
  f.controller.dispose();
});

test('a native presence found on a visit with saved local disable is stopped automatically', async () => {
  const f = setup('android', { enabled: false, androidOverlayEnabled: true });
  await f.controller.refreshCapabilities();
  await f.controller.requestStop();
  assert.equal(f.preferences.getSnapshot().enabled, false);
  assert.equal(f.preferences.getSnapshot().androidOverlayEnabled, false);
  assert.deepEqual(f.calls, ['stopOverlay']);
  f.controller.dispose();
});
