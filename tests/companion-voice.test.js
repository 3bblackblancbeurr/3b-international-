import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANION_SPEECH_LIMIT, VOICE_STYLES, companionVoiceProsody,
  createCompanionVoiceController, normalizeCompanionSpeechText, selectCompanionVoice,
} from '../src/companion/useCompanionVoice.js';

class Target {
  listeners = new Map();
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of this.listeners.get(type) || []) listener({ type }); }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

const localFrench = { name: 'Français local', voiceURI: 'fr-local', lang: 'fr-FR', localService: true };
const remoteFrench = { name: 'Français système', voiceURI: 'fr-system', lang: 'fr-FR', localService: false, default: true };
const english = { name: 'English', voiceURI: 'en-local', lang: 'en-US', localService: true, default: true };

function setup(t, config = {}) {
  const doc = new Target();
  doc.hidden = false; doc.visibilityState = 'visible';
  const navigator = { userActivation: { isActive: true } };
  const synth = new Target();
  synth.voices = [english, remoteFrench, localFrench];
  synth.spoken = []; synth.cancelled = 0; synth.speaking = false; synth.pending = false; synth.paused = false;
  synth.getVoices = () => synth.voices;
  synth.speak = utterance => { synth.spoken.push(utterance); synth.pending = true; };
  synth.cancel = () => { synth.cancelled++; synth.pending = false; synth.speaking = false; };
  const timers = new Map();
  let timerId = 0;
  const voice = createCompanionVoiceController({
    speechSynthesis: synth, Utterance: class { constructor(text) { this.text = text; } },
    document: doc, navigator,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id), ...config,
  });
  voice.connect();
  t.after(() => voice.disconnect());
  const start = (utterance = synth.spoken.at(-1)) => { synth.pending = false; synth.speaking = true; utterance.onstart?.(); };
  const end = (utterance = synth.spoken.at(-1)) => { synth.pending = false; synth.speaking = false; utterance.onend?.(); };
  return { voice, synth, doc, navigator, timers, start, end };
}

test('speech requires a voice opt-in and an explicit active user gesture', t => {
  const { voice, synth, navigator, doc } = setup(t);
  assert.equal(voice.getSnapshot().status, 'off');
  assert.equal(voice.speak('Bonjour', { userGesture: true }), false);
  assert.equal(voice.unlock(), false);
  voice.configure({ enabled: true });
  assert.equal(voice.speak('Bonjour'), false);
  assert.equal(voice.getSnapshot().status, 'locked');
  navigator.userActivation.isActive = false;
  assert.equal(voice.unlock({ userGesture: true }), false);
  assert.equal(voice.speak('Bonjour', { userGesture: true }), false);
  navigator.userActivation.isActive = true;
  assert.equal(voice.speak('Bonjour', { userGesture: true }), true);
  assert.equal(synth.spoken.length, 1);
  assert.equal(doc.count('pointerdown'), 0);
  assert.equal(doc.count('click'), 0);
});

test('unlock does not utter, cancel or silently enable a disabled voice', t => {
  const { voice, synth } = setup(t);
  assert.equal(voice.unlock({ userGesture: true }), true);
  assert.equal(voice.speak('Pas encore'), false);
  assert.equal(synth.spoken.length, 0);
  assert.equal(synth.cancelled, 0);
  voice.configure({ enabled: true });
  assert.equal(voice.speak('Maintenant oui'), true);
});

test('actual speech events drive speaking state and the real voice selection', t => {
  const { voice, synth, start, end, timers } = setup(t, { enabled: true });
  voice.speak('  Bonjour\nà toi ! ', { userGesture: true });
  const utterance = synth.spoken[0];
  assert.equal(utterance.text, 'Bonjour à toi !');
  assert.equal(utterance.voice, localFrench);
  assert.equal(utterance.lang, 'fr-FR');
  assert.equal(utterance.pitch, 0.68);
  assert.equal(voice.getSnapshot().pending, true);
  assert.equal(voice.getSnapshot().speaking, false);
  start();
  assert.equal(voice.getSnapshot().speaking, true);
  assert.equal(voice.getSnapshot().status, 'speaking');
  end();
  assert.equal(voice.getSnapshot().status, 'ready');
  assert.equal(timers.size, 0);
  assert.equal(synth.cancelled, 0);
});

test('another application utterance is preserved on stop, lifecycle changes and speech attempts', t => {
  const { voice, synth, doc } = setup(t, { enabled: true });
  synth.speaking = true;
  assert.equal(voice.speak('Mon tour ?', { userGesture: true }), false);
  assert.equal(voice.getSnapshot().status, 'busy');
  voice.stop();
  voice.configure({ personality: 'calme', voiceId: 'en-local', voiceStyle: 'calme' });
  doc.hidden = true; doc.visibilityState = 'hidden'; doc.emit('visibilitychange');
  voice.configure({ enabled: false });
  voice.disconnect();
  assert.equal(synth.cancelled, 0);
  assert.equal(synth.spoken.length, 0);
});

for (const [label, change] of [
  ['disable', ({ voice }) => voice.configure({ enabled: false })],
  ['hide companion', ({ voice }) => voice.configure({ visible: false })],
  ['hide document', ({ doc }) => { doc.hidden = true; doc.visibilityState = 'hidden'; doc.emit('visibilitychange'); }],
  ['change personality', ({ voice }) => voice.configure({ personality: 'taquin' })],
  ['change voice', ({ voice }) => voice.configure({ voiceId: 'fr-system' })],
  ['change voice style', ({ voice }) => voice.configure({ voiceStyle: 'naturelle' })],
  ['unmount', ({ voice }) => voice.disconnect()],
]) {
  for (const hasStarted of [false, true]) test(`${label} cancels ${hasStarted ? 'active' : 'queued'} own speech and ignores late events`, t => {
    const env = setup(t, { enabled: true });
    env.voice.speak('Phrase abandonnée', { userGesture: true });
    if (hasStarted) env.start();
    const utterance = env.synth.spoken[0];
    const lateStart = utterance.onstart; const lateEnd = utterance.onend; const lateError = utterance.onerror;
    const lateTimeout = [...env.timers.values()][0];
    change(env);
    const stopped = env.voice.getSnapshot();
    assert.equal(stopped.speaking, false);
    assert.equal(stopped.pending, false);
    assert.equal(env.synth.cancelled, 1);
    assert.equal(env.timers.size, 0);
    lateStart(); lateEnd(); lateError({ error: 'not-allowed' }); lateTimeout();
    assert.deepEqual(env.voice.getSnapshot(), stopped);
    assert.equal(env.synth.cancelled, 1);
    assert.equal(env.synth.spoken.length, 1);
  });
}

test('only the latest phrase owns callbacks, even after replacement', t => {
  const { voice, synth, start } = setup(t, { enabled: true });
  voice.speak('Première', { userGesture: true });
  const oldEnd = synth.spoken[0].onend;
  const oldStart = synth.spoken[0].onstart;
  voice.speak('Deuxième'); start();
  oldEnd(); oldStart();
  assert.equal(synth.spoken.length, 2);
  assert.equal(synth.cancelled, 1);
  assert.equal(voice.getSnapshot().speaking, true);
});

test('a synchronous visibility change during the queued update prevents submission to the browser', t => {
  const { voice, synth } = setup(t, { enabled: true });
  const unsubscribe = voice.subscribe(snapshot => {
    if (snapshot.pending) voice.configure({ visible: false });
  });
  assert.equal(voice.speak('Ne pas démarrer', { userGesture: true }), false);
  assert.equal(synth.spoken.length, 0);
  assert.equal(synth.cancelled, 0);
  assert.equal(voice.getSnapshot().speaking, false);
  unsubscribe();
});

test('hidden documents block calls even before visibilitychange is delivered, without replay on return', t => {
  const { voice, synth, doc } = setup(t, { enabled: true });
  voice.unlock({ userGesture: true });
  doc.hidden = true;
  assert.equal(voice.speak('Ne pas lire'), false);
  assert.equal(voice.unlock({ userGesture: true }), false);
  doc.hidden = false; doc.emit('visibilitychange');
  assert.equal(synth.spoken.length, 0);
  assert.equal(voice.speak('Retour volontaire'), true);
});

test('a delayed start rechecks document visibility before making the avatar speak', t => {
  const { voice, synth, doc, start } = setup(t, { enabled: true });
  voice.speak('Phrase en attente', { userGesture: true });
  doc.hidden = true;
  start();
  assert.equal(voice.getSnapshot().speaking, false);
  assert.equal(synth.cancelled, 1);
});

test('late voice availability updates the picker but never replays speech or loses the saved selection', t => {
  const { voice, synth, end } = setup(t, { enabled: true, voiceId: 'fr-future' });
  assert.equal(voice.getSnapshot().voiceFallback, true);
  assert.equal(voice.getSnapshot().selectedVoiceId, 'fr-local');
  assert.equal(voice.getSnapshot().voices[0].id, 'fr-local');
  const future = { ...localFrench, name: 'Nouvelle voix', voiceURI: 'fr-future' };
  synth.voices.push(future); synth.emit('voiceschanged');
  assert.equal(voice.getSnapshot().voiceFallback, false);
  assert.equal(voice.getSnapshot().selectedVoiceId, 'fr-future');
  assert.equal(synth.spoken.length, 0);
  voice.speak('Bonjour', { userGesture: true });
  assert.equal(synth.spoken[0].voice, future); end();
  synth.voices = [remoteFrench]; synth.emit('voiceschanged');
  assert.equal(voice.getSnapshot().selectedVoiceId, 'fr-system');
  assert.equal(voice.getSnapshot().localVoice, false);
  assert.equal(voice.getSnapshot().voiceFallback, true);
  assert.equal(synth.spoken.length, 1);
});

test('empty voice lists and a temporarily failing getVoices preserve system speech fallback', t => {
  const { voice, synth } = setup(t, { enabled: true });
  synth.getVoices = () => { throw new Error('initialising'); };
  synth.emit('voiceschanged');
  assert.equal(voice.getSnapshot().voiceName, 'Voix du système');
  assert.equal(voice.getSnapshot().localVoice, null);
  assert.equal(voice.speak('Bonjour', { userGesture: true }), true);
  assert.equal(synth.spoken[0].lang, 'fr-FR');
});

test('long device voice URIs receive stable preference-safe IDs and still select the native voice', t => {
  const { voice, synth } = setup(t, { enabled: true });
  const longVoice = { ...localFrench, name: 'Voix avec URI longue', voiceURI: 'voice:'.repeat(100) };
  synth.voices = [longVoice]; synth.emit('voiceschanged');
  const id = voice.getSnapshot().voices[0].id;
  assert.ok(id.length <= 180);
  assert.doesNotMatch(id, /[\u0000-\u001f\u007f]/);
  voice.configure({ voiceId: id });
  assert.equal(selectCompanionVoice([longVoice, english], id), longVoice);
  assert.equal(voice.getSnapshot().voiceFallback, false);
  assert.equal(voice.speak('Une sélection durable', { userGesture: true }), true);
  assert.equal(synth.spoken[0].voice, longVoice);
});

test('voice styles and personality shape bounded, distinct device prosody', () => {
  assert.deepEqual(VOICE_STYLES.map(style => style.id), ['grave', 'naturelle', 'lumineuse', 'calme']);
  const signatures = new Set();
  for (const personality of ['bienveillant', 'taquin', 'calme', 'audacieux', 'curieux', 'energique']) {
    const prosody = companionVoiceProsody(personality, 'grave');
    signatures.add(JSON.stringify(prosody));
    assert.ok(prosody.rate >= 0.78 && prosody.rate <= 1.18);
    assert.ok(prosody.pitch >= 0.6 && prosody.pitch <= 1.22);
  }
  assert.equal(signatures.size, 6);
  assert.ok(companionVoiceProsody('calme').rate < companionVoiceProsody('energique').rate);
  assert.ok(companionVoiceProsody('bienveillant', 'grave').pitch < companionVoiceProsody('bienveillant', 'naturelle').pitch);
  assert.deepEqual(companionVoiceProsody('__proto__', 'invalid'), companionVoiceProsody());
  assert.equal(selectCompanionVoice([english, remoteFrench, localFrench]), localFrench);
  assert.equal(selectCompanionVoice([localFrench, english], 'en-local'), english);
  assert.equal(selectCompanionVoice([]), null);
});

test('text stays short, safe for Unicode, and empty or malformed input never interrupts speech', t => {
  assert.equal(normalizeCompanionSpeechText(null), '');
  assert.equal(normalizeCompanionSpeechText({}), '');
  assert.equal(normalizeCompanionSpeechText(' \n\t '), '');
  const bounded = normalizeCompanionSpeechText('Bonjour 🌍 '.repeat(1000));
  assert.ok(Array.from(bounded).length <= COMPANION_SPEECH_LIMIT);
  assert.ok(bounded.endsWith('…'));
  assert.doesNotMatch(bounded, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/u);
  const { voice, synth } = setup(t, { enabled: true });
  voice.speak('Bonjour', { userGesture: true });
  assert.equal(voice.speak(''), false);
  assert.equal(synth.cancelled, 0);
});

test('blocked and failed browser speech can be retried without stale speaking state', t => {
  const { voice, synth, timers } = setup(t, { enabled: true });
  voice.speak('Bonjour', { userGesture: true });
  synth.spoken[0].onerror({ error: 'not-allowed' }); synth.pending = false;
  assert.equal(voice.getSnapshot().status, 'locked');
  assert.equal(voice.getSnapshot().speaking, false);
  assert.equal(timers.size, 0);
  assert.equal(voice.speak('Sans geste'), false);
  assert.equal(voice.speak('Avec un nouveau geste', { userGesture: true }), true);
  voice.stop();
  synth.speak = () => { throw new Error('Device error'); };
  assert.equal(voice.speak('Moteur indisponible'), false);
  assert.equal(voice.getSnapshot().status, 'error');
  assert.equal(voice.getSnapshot().pending, false);
  assert.equal(timers.size, 0);
});

test('a stalled utterance has a bounded lifetime and cannot resurrect on late events', t => {
  const { voice, synth, timers } = setup(t, { enabled: true });
  voice.speak('Bonjour', { userGesture: true });
  const oldStart = synth.spoken[0].onstart;
  [...timers.values()][0]();
  assert.equal(voice.getSnapshot().status, 'error');
  assert.equal(voice.getSnapshot().error, 'timeout');
  assert.equal(synth.cancelled, 1);
  oldStart();
  assert.equal(voice.getSnapshot().speaking, false);
});

test('mount cleanup removes listeners and Strict Mode reconnect requires a fresh gesture', t => {
  const { voice, synth, doc } = setup(t, { enabled: true });
  assert.equal(doc.count('visibilitychange'), 1);
  assert.equal(synth.count('voiceschanged'), 1);
  voice.speak('Avant démontage', { userGesture: true });
  voice.disconnect();
  assert.equal(doc.count('visibilitychange'), 0);
  assert.equal(synth.count('voiceschanged'), 0);
  assert.equal(voice.speak('Après démontage', { userGesture: true }), false);
  voice.connect(); voice.connect();
  assert.equal(doc.count('visibilitychange'), 1);
  assert.equal(synth.count('voiceschanged'), 1);
  assert.equal(voice.getSnapshot().status, 'locked');
  assert.equal(voice.speak('Nouveau montage', { userGesture: true }), true);
});

test('devices without Web Speech expose unavailable without throwing or installing voice listeners', t => {
  const { voice, synth } = setup(t, { Utterance: null });
  assert.equal(voice.getSnapshot().available, false);
  assert.equal(voice.getSnapshot().status, 'unavailable');
  assert.equal(voice.unlock({ userGesture: true }), false);
  assert.equal(voice.speak('Bonjour', { userGesture: true }), false);
  assert.equal(synth.count('voiceschanged'), 0);
  assert.equal(synth.cancelled, 0);
});
