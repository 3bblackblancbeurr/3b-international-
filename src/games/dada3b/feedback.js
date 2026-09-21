const PREF_KEY = '3b_dada_feedback_v1';

const DEFAULTS = Object.freeze({
  sound: true,
  voice: false,
  haptics: true,
});

const PATTERNS = {
  roll: [220, 0.035],
  exit: [330, 0.06, 440, 0.08],
  door: [294, 0.06, 392, 0.08, 587, 0.12],
  move: [260, 0.035],
  sanctuary: [392, 0.06, 523, 0.1],
  barricade: [196, 0.07, 294, 0.09],
  capture: [145, 0.08, 420, 0.12, 180, 0.08],
  finish: [392, 0.08, 494, 0.08, 659, 0.13],
  victory: [330, 0.1, 440, 0.1, 523, 0.12, 659, 0.18],
  tripleSix: [170, 0.1, 120, 0.16],
  timeout: [210, 0.08, 180, 0.1],
};

const VOICE = {
  exit: 'Écurie ouverte.',
  door: 'Porte nationale ouverte.',
  capture: 'Fracture Matrix.',
  finish: 'Fragment sécurisé.',
  victory: 'Nexus complété.',
  barricade: 'Bouclier 3B.',
  tripleSix: 'Surcharge Matrix.',
  timeout: 'Temps écoulé.',
};

const COUNTRY_PITCH = {
  fr: 1.00, dz: 0.93, es: 1.08, ma: 0.96,
  it: 1.04, tn: 1.11, tr: 0.89, ee: 1.16,
};

const HAPTICS = {
  roll: 18,
  exit: [25, 30, 35],
  door: [22, 25, 38, 25, 60],
  move: 12,
  sanctuary: [18, 22, 18],
  barricade: [30, 25, 45],
  capture: [50, 35, 85],
  finish: [25, 20, 25, 20, 70],
  victory: [40, 35, 60, 35, 110],
  tripleSix: [90, 40, 90],
  timeout: [35, 30, 35],
};

export function readDadaFeedbackPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREF_KEY));
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveDadaFeedbackPreferences(value) {
  const next = {
    sound: value?.sound !== false,
    voice: value?.voice === true,
    haptics: value?.haptics !== false,
  };
  try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function createDadaFeedback(initial = readDadaFeedbackPreferences()) {
  let prefs = { ...DEFAULTS, ...initial };
  let context = null;

  function ensureAudio() {
    if (!prefs.sound || typeof window === 'undefined') return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') context.resume?.().catch(() => {});
    return context;
  }

  function tone(frequency, duration, delay = 0) {
    const audio = ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audio.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.07, audio.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + delay + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(audio.currentTime + delay);
    oscillator.stop(audio.currentTime + delay + duration + 0.02);
  }

  function sound(type, countryId) {
    if (!prefs.sound) return;
    const pattern = PATTERNS[type] || PATTERNS.move;
    const pitch = COUNTRY_PITCH[countryId] || 1;
    let delay = 0;
    for (let index = 0; index < pattern.length; index += 2) {
      const frequency = pattern[index] * pitch;
      const duration = pattern[index + 1] || 0.05;
      tone(frequency, duration, delay);
      delay += duration + 0.025;
    }
  }

  function haptic(type) {
    if (!prefs.haptics || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(HAPTICS[type] || 12); } catch {}
  }

  function voice(type) {
    if (!prefs.voice || typeof speechSynthesis === 'undefined') return;
    const text = VOICE[type];
    if (!text) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.02;
      utterance.pitch = 0.82;
      utterance.volume = 0.72;
      speechSynthesis.speak(utterance);
    } catch {}
  }

  return {
    set(next) {
      prefs = saveDadaFeedbackPreferences({ ...prefs, ...next });
      return { ...prefs };
    },
    get() {
      return { ...prefs };
    },
    event(type, meta = {}) {
      sound(type, meta.countryId);
      haptic(type);
      voice(type);
    },
    close() {
      try { context?.close?.(); } catch {}
      context = null;
      try { speechSynthesis?.cancel?.(); } catch {}
    },
  };
}
