import { load, persist } from './state.js';
import { SPAWNS } from './data.js';

// The current public WorldEntry mounts ORIGINS, whose progression is local and
// scoped by uid. Never import the independent legacy world's save/journal here.
export const spawns = SPAWNS;
const message = 'Progression ORIGINS sur cet appareil · pas de synchronisation cloud dans ce moteur.';
export function loadWorld(uid) {
  return { data: load(window.localStorage, uid), message, local: true };
}
export function saveWorld(uid, data) {
  const storage = window.localStorage;
  const ok = persist(storage, uid, data);
  return { ok, data: ok ? load(storage, uid) : null, message, local: true };
}
