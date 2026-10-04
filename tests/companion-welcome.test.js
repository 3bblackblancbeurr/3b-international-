import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sanitizeLivingPrefs } from '../src/companion/companion-personality.js';
import { companionVoiceProsody, selectCompanionVoice } from '../src/companion/useCompanionVoice.js';

// Execute the production greeting without importing App's JSX and browser shell.
// The actual preference validation and voice selection/prosody are also executed.
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const start = appSource.indexOf('const WELCOME_MESSAGE =');
const end = appSource.indexOf('const MEMBER_MENU_ITEM =', start);
assert.ok(start >= 0 && end > start, 'the production welcome section must be available');
const welcomeSource = appSource.slice(start, end);

class Target {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  dispatchEvent(event) {
    for (const callback of [...(this.listeners.get(event.type) || [])]) callback(event);
    return true;
  }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

const LOCAL_FRENCH = { name: 'Voix française locale', voiceURI: 'fr-local', lang: 'fr-FR', localService: true };
const SYSTEM_FRENCH = { name: 'Voix française du système', voiceURI: 'fr-system', lang: 'fr-FR', localService: false };
const LIVING_KEY = 'threeb_companion_living_v1';
const COMPANION_KEY = 'threeb_companion_prefs_v1';
const STOP_EVENT = 'threeb:companion-voice-stop';

function setup(t, { living = { voiceEnabled: true }, companion = { enabled: true }, hidden = false, busy = false, pending = false } = {}) {
  const document = new Target();
  document.hidden = hidden;
  const window = new Target();
  const storage = new Map([[LIVING_KEY, JSON.stringify(living)], [COMPANION_KEY, JSON.stringify(companion)]]);
  const timers = new Map();
  const announcements = [];
  let timerId = 0;
  const synthesis = {
    speaking: busy, pending, cancelled: 0, spoken: [], voices: [SYSTEM_FRENCH, LOCAL_FRENCH],
    getVoices() { return this.voices; },
    speak(utterance) { this.spoken.push(utterance); this.pending = true; },
    cancel() { this.cancelled++; this.speaking = false; this.pending = false; },
  };
  window.speechSynthesis = synthesis;
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.addEventListener('threeb:companion-speaking', event => announcements.push(event.detail.speaking));
  const speakWelcome = vm.runInNewContext(`${welcomeSource}\nspeakWelcome;`, {
    window, document,
    localStorage: { getItem: key => storage.get(key) ?? null },
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
    sanitizeLivingPrefs, companionVoiceProsody, selectCompanionVoice,
  }, { filename: 'App.speakWelcome.behavior.js' });
  const emitStop = () => window.dispatchEvent({ type: STOP_EVENT });
  const begin = () => { synthesis.pending = false; synthesis.speaking = true; synthesis.spoken.at(-1)?.onstart?.(); };
  const finish = () => { synthesis.pending = false; synthesis.speaking = false; synthesis.spoken.at(-1)?.onend?.(); };
  t.after(emitStop);
  return { speakWelcome, window, document, synthesis, timers, announcements, storage, emitStop, begin, finish };
}

function assertReleased(env) {
  assert.equal(env.timers.size, 0);
  assert.equal(env.window.count(STOP_EVENT), 0);
  assert.equal(env.document.count('visibilitychange'), 0);
}

test('welcome uses the selected real voice and personality/style, then cleans up after normal completion', t => {
  const env = setup(t, { living: { voiceEnabled: true, personality: 'taquin', voiceId: 'fr-system', voiceStyle: 'grave' } });
  env.speakWelcome();
  assert.equal(env.synthesis.spoken.length, 1);
  const utterance = env.synthesis.spoken[0];
  assert.ok(utterance.text.startsWith("Bienvenue dans l'univers 3B."));
  assert.equal(utterance.voice, SYSTEM_FRENCH);
  assert.equal(utterance.lang, 'fr-FR');
  for (const [key, value] of Object.entries(companionVoiceProsody('taquin', 'grave'))) assert.equal(utterance[key], value);
  assert.equal(env.window.count(STOP_EVENT), 1);
  assert.equal(env.document.count('visibilitychange'), 1);
  assert.equal([...env.timers.values()][0].delay, 20000);
  env.begin();
  assert.deepEqual(env.announcements, [true]);
  env.finish();
  assert.deepEqual(env.announcements, [true, false]);
  assertReleased(env);
  assert.equal(env.synthesis.cancelled, 0);
  assert.equal(utterance.onstart, null);
  assert.equal(utterance.onend, null);
  assert.equal(utterance.onerror, null);
  env.synthesis.speaking = true;
  env.emitStop();
  assert.equal(env.synthesis.cancelled, 0, 'a finished welcome must not cancel another voice');
});

for (const started of [false, true]) {
  test(`companion stop event mutes ${started ? 'speaking' : 'queued'} welcome and blocks stale callbacks`, t => {
    const env = setup(t);
    env.speakWelcome();
    const utterance = env.synthesis.spoken[0];
    const lateStart = utterance.onstart;
    const lateEnd = utterance.onend;
    const lateError = utterance.onerror;
    const lateTimeout = [...env.timers.values()][0].callback;
    if (started) env.begin();
    env.storage.set(LIVING_KEY, JSON.stringify({ voiceEnabled: false }));
    env.emitStop();
    assert.equal(env.synthesis.cancelled, 1);
    assert.equal(env.synthesis.speaking, false);
    assert.equal(env.synthesis.pending, false);
    assertReleased(env);
    const stoppedAnnouncements = [...env.announcements];
    env.synthesis.speaking = true; // A different owner may speak after the stop.
    lateStart(); lateEnd(); lateError(); lateTimeout(); env.emitStop();
    assert.equal(env.synthesis.cancelled, 1);
    assert.deepEqual(env.announcements, stoppedAnnouncements);
    env.synthesis.speaking = false;
    env.speakWelcome();
    assert.equal(env.synthesis.spoken.length, 1, 'saved mute prevents a new greeting');
  });

  test(`document visibility stops ${started ? 'speaking' : 'queued'} welcome without replay on return`, t => {
    const env = setup(t);
    env.speakWelcome();
    if (started) env.begin();
    env.document.hidden = true;
    env.document.dispatchEvent({ type: 'visibilitychange' });
    assert.equal(env.synthesis.cancelled, 1);
    assertReleased(env);
    env.document.hidden = false;
    env.document.dispatchEvent({ type: 'visibilitychange' });
    assert.equal(env.synthesis.spoken.length, 1);
    assert.equal(env.announcements.at(-1), false);
  });
}

test('a stalled welcome expires after its bounded lifetime and releases its listeners', t => {
  const env = setup(t);
  env.speakWelcome();
  env.begin();
  const timeout = [...env.timers.values()][0];
  assert.equal(timeout.delay, 20000);
  timeout.callback();
  assert.equal(env.synthesis.cancelled, 1);
  assert.deepEqual(env.announcements, [true, false]);
  assertReleased(env);
  timeout.callback();
  assert.equal(env.synthesis.cancelled, 1);
});

for (const existing of [{ busy: true }, { pending: true }]) {
  test(`welcome preserves an existing ${existing.busy ? 'speaking' : 'queued'} voice and installs no ownership listeners`, t => {
    const env = setup(t, existing);
    env.speakWelcome();
    env.emitStop();
    env.document.hidden = true;
    env.document.dispatchEvent({ type: 'visibilitychange' });
    assert.equal(env.synthesis.spoken.length, 0);
    assert.equal(env.synthesis.cancelled, 0);
    assert.deepEqual(env.announcements, []);
    assertReleased(env);
  });
}

for (const [label, config] of [
  ['voice preference disabled', { living: { voiceEnabled: false } }],
  ['voice preference absent', { living: {} }],
  ['companion preference disabled', { companion: { enabled: false } }],
  ['document already hidden', { hidden: true }],
]) {
  test(`welcome does not start with ${label}`, t => {
    const env = setup(t, config);
    env.speakWelcome();
    assert.equal(env.synthesis.spoken.length, 0);
    assert.equal(env.synthesis.cancelled, 0);
    assertReleased(env);
  });
}

test('malformed saved preferences cannot start the greeting or throw through boot', t => {
  const env = setup(t);
  env.storage.set(LIVING_KEY, '{broken');
  assert.doesNotThrow(env.speakWelcome);
  assert.equal(env.synthesis.spoken.length, 0);
  assertReleased(env);
});

test('a missing selected device voice falls back to the real local French voice', t => {
  const env = setup(t, { living: { voiceEnabled: true, voiceId: 'missing-on-this-device' } });
  env.speakWelcome();
  assert.equal(env.synthesis.spoken[0].voice, LOCAL_FRENCH);
  env.finish();
  assertReleased(env);
});

test('a repeated entry action cannot add a second welcome behind the first one', t => {
  const env = setup(t);
  env.speakWelcome();
  env.speakWelcome();
  assert.equal(env.synthesis.spoken.length, 1);
  assert.equal(env.window.count(STOP_EVENT), 1);
  assert.equal(env.timers.size, 1);
  env.finish();
  assertReleased(env);
});

test('browser synthesis failure releases the welcome state and does not retain a future global cancel', t => {
  const env = setup(t);
  env.synthesis.speak = () => { throw new Error('Browser synthesis unavailable'); };
  assert.doesNotThrow(env.speakWelcome);
  assert.deepEqual(env.announcements, [false]);
  assertReleased(env);
  env.synthesis.speaking = true;
  env.emitStop();
  assert.equal(env.synthesis.cancelled, 0);
});

test('a browser error event cleans up and late stop does not interfere with another voice', t => {
  const env = setup(t);
  env.speakWelcome();
  env.synthesis.pending = false;
  env.synthesis.spoken[0].onerror({ error: 'not-allowed' });
  assertReleased(env);
  assert.deepEqual(env.announcements, [false]);
  env.synthesis.speaking = true;
  env.emitStop();
  assert.equal(env.synthesis.cancelled, 0);
});
