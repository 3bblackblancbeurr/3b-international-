import { resolveNexusWorld } from './nexus-worlds.js';
export const NEXUS_REQUEST_KEY = '3b:nexus-visit-v1';
export function queueNexusVisit(storage, code, now = Date.now()) {
  if (!resolveNexusWorld(code) || !Number.isFinite(now)) return false;
  try { storage.setItem(NEXUS_REQUEST_KEY, JSON.stringify({ code, at: now })); return true; } catch { return false; }
}
export function peekNexusVisit(storage, now = Date.now()) {
  try {
    const request = JSON.parse(storage.getItem(NEXUS_REQUEST_KEY)), world = resolveNexusWorld(request?.code);
    if (!world || !Number.isFinite(request.at) || !Number.isFinite(now) || request.at > now || now - request.at > 120000) return null;
    return { type: 'visit', region: world.id };
  } catch { return null; }
}
export function consumeNexusVisit(storage, now = Date.now()) {
  const intent = peekNexusVisit(storage, now);
  try { storage.removeItem(NEXUS_REQUEST_KEY); return intent; } catch { return null; }
}
