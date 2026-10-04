import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const COMPANION_SPEECH_LIMIT = 280;
const SPEECH_TIMEOUT = 35000;

// These presets shape the device's real voices; they do not impersonate cloud voices.
export const VOICE_STYLES = Object.freeze([
  Object.freeze({ id: 'grave', label: 'Grave · Signature 3B', pitch: 0.68, rate: 0.92, description: 'Une présence profonde, posée et chaleureuse.' }),
  Object.freeze({ id: 'naturelle', label: 'Naturelle · Proche', pitch: 1, rate: 1, description: 'Une voix directe, claire et expressive.' }),
  Object.freeze({ id: 'lumineuse', label: 'Lumineuse · Énergie', pitch: 1.12, rate: 1.04, description: 'Une présence vive et souriante.' }),
  Object.freeze({ id: 'calme', label: 'Calme · Velours', pitch: 0.87, rate: 0.87, description: 'Un rythme doux qui laisse respirer les mots.' }),
]);

const PERSONALITY_VOICE = Object.freeze({
  bienveillant: { rate: 1, pitch: 1 },
  taquin: { rate: 1.04, pitch: 1.04 },
  calme: { rate: 0.94, pitch: 0.96 },
  audacieux: { rate: 1.03, pitch: 0.96 },
  curieux: { rate: 1, pitch: 1.03 },
  energique: { rate: 1.08, pitch: 1.06 },
});

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = (number, min, max) => Math.max(min, Math.min(max, number));

export function companionVoiceProsody(personality = 'bienveillant', voiceStyle = 'grave') {
  const personalityVoice = own(PERSONALITY_VOICE, personality) ? PERSONALITY_VOICE[personality] : PERSONALITY_VOICE.bienveillant;
  const style = VOICE_STYLES.find(item => item.id === voiceStyle) || VOICE_STYLES[0];
  return {
    rate: Number(clamp(style.rate * personalityVoice.rate, 0.78, 1.18).toFixed(3)),
    pitch: Number(clamp(style.pitch * personalityVoice.pitch, 0.6, 1.22).toFixed(3)),
    volume: 0.9,
  };
}

export function normalizeCompanionSpeechText(value) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  const points = Array.from(text);
  if (points.length <= COMPANION_SPEECH_LIMIT) return text;
  let shortened = points.slice(0, COMPANION_SPEECH_LIMIT - 1).join('');
  const lastSpace = shortened.lastIndexOf(' ');
  if (lastSpace > shortened.length * 0.7) shortened = shortened.slice(0, lastSpace);
  return `${shortened.trimEnd()}…`;
}

function voiceIdOf(voice) {
  const id = voice.voiceURI || `${voice.lang || 'und'}:${voice.name || 'Voix'}:${voice.localService === true ? 'local' : 'system'}`;
  if (typeof id === 'string' && id.length <= 180 && !/[\u0000-\u001f\u007f]/.test(id)) return id;
  // Some device URIs are longer than the preference store accepts. Keep their
  // selection stable instead of silently truncating to a different native URI.
  let hash = 2166136261;
  for (const point of String(id)) hash = Math.imul(hash ^ point.codePointAt(0), 16777619);
  return `system-voice:${(hash >>> 0).toString(36)}`;
}

function voiceScore(voice) {
  const lang = String(voice.lang || '').toLowerCase().replaceAll('_', '-');
  return (/^fr(?:-|$)/.test(lang) ? 10000 : 0)
    + (voice.localService === true ? 1000 : 0)
    + (lang === 'fr-fr' ? 100 : 0) + (voice.default ? 10 : 0);
}

function sortedVoices(voices) {
  const seen = new Set();
  return Array.from(voices || []).filter(voice => {
    if (!voice || typeof voice.name !== 'string') return false;
    const id = voiceIdOf(voice);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name, 'fr'));
}

export function selectCompanionVoice(voices, voiceId = 'auto') {
  const ordered = sortedVoices(voices);
  return (voiceId !== 'auto' && ordered.find(voice => voiceIdOf(voice) === voiceId)) || ordered[0] || null;
}

const STATUS_LABELS = Object.freeze({
  unavailable: 'La lecture vocale est indisponible sur cet appareil.',
  off: 'Voix désactivée',
  hidden: 'Voix en pause',
  locked: 'Touche « Écouter » pour lancer la voix.',
  ready: 'Voix prête',
  queued: 'La voix se prépare…',
  speaking: 'Le compagnon te parle',
  busy: 'Une autre voix parle déjà. Réessaie dans un instant.',
  error: 'La voix n’a pas pu être lue. Tu peux réessayer.',
});

/**
 * Independently testable owner of at most one Web Speech utterance.
 * connect()/disconnect() mirror a React mount and support Strict Mode remounts.
 * No input listeners, microphone, silent unlock, automatic retries or external API.
 */
export function createCompanionVoiceController({
  speechSynthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  document: pageDocument = globalThis.document,
  navigator: pageNavigator = globalThis.navigator,
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: unschedule = globalThis.clearTimeout,
  enabled = false, visible = true, personality = 'bienveillant', voiceId = 'auto', voiceStyle = 'grave',
} = {}) {
  const available = Boolean(speechSynthesis && typeof speechSynthesis.speak === 'function'
    && typeof speechSynthesis.cancel === 'function' && typeof Utterance === 'function');
  let config = { enabled: enabled === true, visible: visible === true, personality, voiceId, voiceStyle };
  let connected = false;
  let unlocked = false;
  let speaking = false;
  let error = null;
  let active = null;
  let generation = 0;
  let rawVoices = [];
  let voices = [];
  let selectedVoice = null;
  let removeVoiceListener = null;
  const subscribers = new Set();

  const documentVisible = () => !pageDocument || (pageDocument.hidden !== true
    && (!pageDocument.visibilityState || pageDocument.visibilityState === 'visible'));
  const allowed = () => connected && available && config.enabled && config.visible && documentVisible();

  function state() {
    const status = !available ? 'unavailable' : !connected || !config.enabled ? 'off'
      : !config.visible || !documentVisible() ? 'hidden' : !unlocked ? 'locked'
        : active ? (speaking ? 'speaking' : 'queued') : error === 'busy' ? 'busy' : error ? 'error' : 'ready';
    const actualVoice = active?.utterance.voice || selectedVoice;
    const selectedVoiceId = actualVoice ? voiceIdOf(actualVoice) : 'auto';
    return {
      available, enabled: config.enabled, unlocked, speaking, pending: Boolean(active && !speaking),
      status, statusLabel: STATUS_LABELS[status], error, voices, selectedVoiceId,
      voiceName: actualVoice?.name || (available ? 'Voix du système' : ''),
      localVoice: typeof actualVoice?.localService === 'boolean' ? actualVoice.localService : null,
      voiceFallback: config.voiceId !== 'auto' && config.voiceId !== selectedVoiceId,
    };
  }

  let snapshot = state();
  function publish() {
    const next = state();
    if (Object.keys(next).every(key => next[key] === snapshot[key])) return;
    snapshot = next;
    for (const listener of subscribers) listener(snapshot);
  }

  function refreshVoices() {
    if (!connected) return;
    try { rawVoices = sortedVoices(speechSynthesis?.getVoices?.() || []); }
    catch { rawVoices = []; }
    const next = rawVoices.map(voice => ({ id: voiceIdOf(voice), name: voice.name, lang: voice.lang || '', localService: voice.localService === true }));
    if (JSON.stringify(next) !== JSON.stringify(voices)) voices = next;
    selectedVoice = selectCompanionVoice(rawVoices, config.voiceId);
    publish();
  }

  function release(record) {
    if (!record) return;
    if (record.timer != null) unschedule(record.timer);
    record.utterance.onstart = null;
    record.utterance.onend = null;
    record.utterance.onerror = null;
  }

  function cancelOwned() {
    const previous = active;
    ++generation;
    active = null;
    speaking = false;
    release(previous);
    // cancel() clears the GLOBAL queue: never call it merely to unlock or reset.
    if (previous?.submitted) { try { speechSynthesis.cancel(); } catch { /* Already stopped or unavailable. */ } }
    return Boolean(previous);
  }

  function stop() {
    const stopped = cancelOwned();
    error = null;
    publish();
    return stopped;
  }

  function onVisibilityChange() {
    if (!documentVisible()) stop();
    else publish(); // Returning to the page never replays an abandoned phrase.
  }

  function configure(next = {}) {
    const updated = { ...config, ...next };
    updated.enabled = updated.enabled === true;
    updated.visible = updated.visible === true;
    const changedVoice = ['personality', 'voiceId', 'voiceStyle'].some(key => updated[key] !== config[key]);
    if (config.enabled && !updated.enabled) unlocked = false;
    config = updated;
    if (!config.enabled || !config.visible || changedVoice) { cancelOwned(); error = null; }
    selectedVoice = selectCompanionVoice(rawVoices, config.voiceId);
    publish();
  }

  function unlock(options = {}) {
    if (!connected || !available || !config.visible || !documentVisible() || options.userGesture !== true) return false;
    // On older engines the caller must invoke this directly in a trusted handler.
    // On engines exposing UserActivation, a fabricated gesture flag cannot unlock.
    try { if (pageNavigator?.userActivation?.isActive === false) return false; }
    catch { return false; }
    unlocked = true;
    error = null;
    publish();
    return true;
  }

  function speak(value, options = {}) {
    const text = normalizeCompanionSpeechText(value);
    if (!text || !allowed()) return false;
    if (!unlocked && !unlock(options)) return false;
    // Do not queue behind another owner: cancelling our queued phrase would also
    // cancel the welcome voice. A later user interaction can try again instead.
    if (!active && (speechSynthesis.speaking || speechSynthesis.pending || speechSynthesis.paused)) {
      error = 'busy'; publish(); return false;
    }
    cancelOwned();
    error = null;
    refreshVoices();
    let utterance;
    try {
      utterance = new Utterance(text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = selectedVoice?.lang || 'fr-FR';
      Object.assign(utterance, companionVoiceProsody(config.personality, config.voiceStyle));
    } catch { error = 'synthesis-failed'; publish(); return false; }
    const token = ++generation;
    const record = { utterance, token, timer: null, submitted: false };
    active = record;
    const current = () => connected && active === record && generation === token;
    const finish = event => {
      if (!current()) return;
      active = null;
      speaking = false;
      release(record);
      const code = event?.error;
      if (code === 'not-allowed') unlocked = false;
      error = code && !['canceled', 'interrupted'].includes(code) ? 'synthesis-failed' : null;
      publish();
    };
    utterance.onstart = () => {
      if (!current()) return;
      if (!allowed()) { stop(); return; }
      speaking = true; publish();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    record.timer = schedule(() => {
      if (!current()) return;
      cancelOwned(); error = 'timeout'; publish();
    }, SPEECH_TIMEOUT);
    record.timer?.unref?.();
    publish();
    // A synchronous subscriber can hide or unmount the companion on this update.
    if (!current() || !allowed()) { if (current()) stop(); return false; }
    record.submitted = true;
    try { speechSynthesis.speak(utterance); }
    catch {
      if (current()) { cancelOwned(); error = 'synthesis-failed'; publish(); }
      return false;
    }
    return true;
  }

  function connect() {
    if (connected) return;
    connected = true;
    pageDocument?.addEventListener?.('visibilitychange', onVisibilityChange);
    if (available && typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      removeVoiceListener = () => speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
    } else if (available && 'onvoiceschanged' in speechSynthesis) {
      const previous = speechSynthesis.onvoiceschanged;
      const listener = function (event) { if (typeof previous === 'function') previous.call(this, event); refreshVoices(); };
      speechSynthesis.onvoiceschanged = listener;
      removeVoiceListener = () => { if (speechSynthesis.onvoiceschanged === listener) speechSynthesis.onvoiceschanged = previous; };
    }
    refreshVoices();
    publish();
  }

  function disconnect() {
    connected = false;
    pageDocument?.removeEventListener?.('visibilitychange', onVisibilityChange);
    removeVoiceListener?.();
    removeVoiceListener = null;
    unlocked = false;
    cancelOwned();
    error = null;
    publish();
  }

  return { connect, disconnect, configure, speak, stop, unlock, getSnapshot: () => snapshot,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); } };
}

const useCommittedEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * In the opt-in click: unlock({userGesture:true}); persist enabled:true.
 * To speak in that SAME click, flushSync the preference update first, then call
 * speak(text, {userGesture:true}); layout effects commit the new enabled value.
 * Persisting the opt-in never auto-unlocks speech on a future visit.
 */
export default function useCompanionVoice({ enabled = false, visible = true, personality = 'bienveillant', voiceId = 'auto', voiceStyle = 'grave' } = {}) {
  const controllerRef = useRef(null);
  if (!controllerRef.current) controllerRef.current = createCompanionVoiceController({ enabled, visible, personality, voiceId, voiceStyle });
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(controller.getSnapshot);
  useCommittedEffect(() => {
    const unsubscribe = controller.subscribe(setSnapshot);
    controller.connect();
    setSnapshot(controller.getSnapshot());
    return () => { unsubscribe(); controller.disconnect(); };
  }, [controller]);
  useCommittedEffect(() => { controller.configure({ enabled, visible, personality, voiceId, voiceStyle }); }, [controller, enabled, visible, personality, voiceId, voiceStyle]);
  return { ...snapshot, speak: controller.speak, stop: controller.stop, unlock: controller.unlock };
}
