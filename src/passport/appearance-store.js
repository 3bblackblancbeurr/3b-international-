import { passportInitials } from './identity.js';

const MODES = new Set(['initials', 'name', 'digital', 'photo', 'matrix']);
const KEY_PREFIX = '3b-passport-appearance-v1:';
const MAX_PHOTO_LENGTH = 2 * 1024 * 1024;

export const cleanInitials = value => [...String(value || '')
  .normalize('NFKC')
  .replace(/[^\p{L}\p{N}]/gu, '')
  .toLocaleUpperCase('fr-FR')].slice(0, 4).join('');

const storageKey = identity => identity?.userId ? KEY_PREFIX + identity.userId : null;

export const isDirectorPortraitIdentity = identity => Boolean(
  identity?.userId && identity.public_verified === true && identity.public_badge_key === 'director_founder'
);

export function normalizeAppearance(value, identity) {
  const director = isDirectorPortraitIdentity(identity);
  let mode = MODES.has(value?.mode) ? value.mode : director ? 'matrix' : 'initials';
  if (mode === 'matrix' && !director) mode = 'initials';
  if (mode === 'digital' && director) mode = 'matrix';
  const initials = cleanInitials(value?.initials) || passportInitials(identity);
  const photo = typeof value?.photo === 'string' && value.photo.length <= MAX_PHOTO_LENGTH &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value.photo) ? value.photo : '';
  return { mode, initials, photo };
}

export function appearanceFromSnapshot(snapshot, identity) {
  try { return normalizeAppearance(JSON.parse(snapshot), identity); }
  catch { return normalizeAppearance(null, identity); }
}

// A string snapshot stays stable between reads, including when storage is disabled.
// Subscribers are notified only after a successful write, outside React rendering.
export function createAppearanceStore({ getStorage = () => globalThis.localStorage, getEvents = () => globalThis.window } = {}) {
  const listeners = new Map();
  const readSnapshot = identity => {
    const key = storageKey(identity);
    if (!key) return null;
    try { return getStorage()?.getItem(key) ?? null; }
    catch { return null; }
  };
  const subscribe = (identity, onChange) => {
    const key = storageKey(identity);
    if (!key) return () => {};
    const subscribers = listeners.get(key) || new Set();
    subscribers.add(onChange);
    listeners.set(key, subscribers);
    const events = getEvents();
    const sync = event => {
      if (event.key !== null && event.key !== key) return;
      try { if (event.storageArea && event.storageArea !== getStorage()) return; }
      catch { return; }
      onChange();
    };
    events?.addEventListener('storage', sync);
    return () => {
      subscribers.delete(onChange);
      if (!subscribers.size) listeners.delete(key);
      events?.removeEventListener('storage', sync);
    };
  };
  const update = (identity, change, expectedAppearance = null) => {
    const key = storageKey(identity);
    if (!key) return false;
    const current = appearanceFromSnapshot(readSnapshot(identity), identity);
    // An async import must not overwrite a mode/photo selected in another tab.
    // null distinguishes a superseded import from a failed storage write.
    if (expectedAppearance && (current.mode !== expectedAppearance.mode || current.photo !== expectedAppearance.photo)) return null;
    const candidate = normalizeAppearance(typeof change === 'function' ? change(current) : { ...current, ...change }, identity);
    try {
      const storage = getStorage();
      if (!storage) return false;
      storage.setItem(key, JSON.stringify(candidate));
    } catch { return false; }
    for (const listener of listeners.get(key) || []) listener();
    return true;
  };
  return { readSnapshot, subscribe, update };
}

export const appearanceStore = createAppearanceStore();
