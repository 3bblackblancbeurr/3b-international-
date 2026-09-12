import { resolveNexusWorld } from './nexus-worlds.js';
export const NEXUS_REQUEST_KEY = '3b:nexus-visit-v1';
export function queueNexusVisit(storage, code, now = Date.now()) {
  if (!resolveNexusWorld(code) || !Number.isFinite(now)) return false;
  try { storage.setItem(NEXUS_REQUEST_KEY, JSON.stringify({ code, at: now })); return true; } catch { return false; }
}
export function consumeNexusVisit(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(NEXUS_REQUEST_KEY);
    if (!raw) return null;
    storage.removeItem(NEXUS_REQUEST_KEY);
    const request = JSON.parse(raw), world = resolveNexusWorld(request?.code);
    if (!world || !Number.isFinite(request.at) || !Number.isFinite(now) || request.at > now || now - request.at > 120000) return null;
    return { type: 'visit', region: world.id };
  } catch { return null; }
}
