import { DEFAULT_COMPANION_PREFS, sanitizeCompanionPrefs } from './companion-model.js';

export const COMPANION_PREFS_KEY = 'threeb_companion_prefs_v1';

const freezePrefs = value => Object.freeze(sanitizeCompanionPrefs(value));
const samePrefs = (left, right) => Object.keys(DEFAULT_COMPANION_PREFS).every(key => left[key] === right[key]);
const parsePrefs = value => {
  try { return freezePrefs(JSON.parse(value || '{}')); }
  catch { return freezePrefs({}); }
};

/** One owner for the floating companion preference, shared by every settings surface. */
export function createCompanionPreferencesStore({
  getStorage = () => globalThis.window?.localStorage,
  eventTarget = globalThis.window,
} = {}) {
  let snapshot;
  let sessionOverride = false;
  const listeners = new Set();
  const storage = () => { try { return getStorage(); } catch { return null; } };

  function read() {
    try {
      const source = storage();
      return source ? parsePrefs(source.getItem(COMPANION_PREFS_KEY)) : null;
    } catch { return null; }
  }

  function getSnapshot() {
    snapshot ??= read() || freezePrefs({});
    return snapshot;
  }

  function publish(next) {
    if (samePrefs(getSnapshot(), next)) return false;
    snapshot = next;
    for (const listener of [...listeners]) listener();
    return true;
  }

  function update(patch) {
    const current = getSnapshot();
    const safePatch = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
    // A settings edit in another tab may precede its storage event. Merge the
    // latest disk value so changing battery policy cannot undo a recent disable.
    const latest = sessionOverride ? null : read();
    const next = freezePrefs({ ...(latest || current), ...safePatch });
    if (latest && samePrefs(latest, next)) { publish(next); return snapshot; }
    if (!latest && samePrefs(current, next)) return current;
    // Commit to memory even when Safari/private mode or a full disk rejects storage.
    try {
      const source = storage();
      sessionOverride = !source;
      source?.setItem(COMPANION_PREFS_KEY, JSON.stringify(next));
    } catch { sessionOverride = true; }
    publish(next);
    return snapshot;
  }

  function onStorage(event) {
    if (event.key !== COMPANION_PREFS_KEY && event.key !== null) return;
    const source = storage();
    if (event.storageArea && source && event.storageArea !== source) return;
    // Read the latest committed value rather than replaying an older queued event.
    // A received storage event never writes back, so tabs cannot echo each other.
    const next = read();
    sessionOverride = false;
    if (next) publish(next);
    else if (event.key === COMPANION_PREFS_KEY && typeof event.newValue === 'string') publish(parsePrefs(event.newValue));
    else if (event.key === null || event.newValue === null) publish(freezePrefs({}));
  }

  function subscribe(listener) {
    getSnapshot();
    if (!listeners.size) {
      eventTarget?.addEventListener?.('storage', onStorage);
      const latest = sessionOverride ? null : read();
      if (latest) publish(latest);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) eventTarget?.removeEventListener?.('storage', onStorage);
    };
  }

  return { getSnapshot, getServerSnapshot: () => DEFAULT_COMPANION_PREFS, subscribe, update };
}

export const companionPreferences = createCompanionPreferencesStore();
