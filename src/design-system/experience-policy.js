export const EXPERIENCE_VERSION = '2.0.0';
export const INTRO_SEEN_KEY = '3b_luxury_intro_v2';
export const MOTION = Object.freeze({ press: 160, surface: 250, route: 380, portal: 760, intro: 2200, return: 180, milestone: 2400 });

// These limits describe presentation only. They never gate a route or a reward.
export function experiencePolicy(options = {}, device = {}) {
  const reduced = device.reduced === true || options.reducedMotion === true || options.animations === false;
  const economical = device.saveData === true || (device.memory > 0 && device.memory <= 4);
  return { reduced, economical, animate: !reduced && !device.hidden,
    sensor: options.sensorReflections === true, preview3D: !reduced && !economical, sound: options.interfaceSound === true,
    haptics: options.haptics !== false && !reduced,
    introDuration: reduced || options.cinematicIntros === false ? 0 : device.seen ? MOTION.return : MOTION.intro };
}

export function readIntroSeen(storage) {
  try { return storage?.getItem(INTRO_SEEN_KEY) === 'seen'; } catch { return false; }
}

export function markIntroSeen(storage) {
  try { storage?.setItem(INTRO_SEEN_KEY, 'seen'); } catch { /* Cosmetic preference: storage can be unavailable. */ }
}

export function surfaceTilt(x = .5, y = .5, strength = 4) {
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : .5));
  return { x: (0.5 - clamp(y)) * strength * 2, y: (clamp(x) - .5) * strength * 2,
    lightX: clamp(x) * 100, lightY: clamp(y) * 100 };
}

export const REALM_PREVIEWS = Object.freeze([
  { code: 'FR', name: 'France', value: 'Justice', guardian: 'Céliane' },
  { code: 'DZ', name: 'Algérie', value: 'Loyauté', guardian: 'Yliane' },
  { code: 'MA', name: 'Maroc', value: 'Noblesse', guardian: 'Naël' },
  { code: 'TN', name: 'Tunisie', value: 'Courage', guardian: 'Soraya' },
  { code: 'ES', name: 'Espagne', value: 'Passion', guardian: 'Diego' },
  { code: 'IT', name: 'Italie', value: 'Espoir', guardian: 'Alessio' },
  { code: 'TR', name: 'Turquie', value: 'Foi', guardian: 'Émir' },
  { code: 'EE', name: 'Estonie', value: 'Sagesse', guardian: 'Eira' },
]);
