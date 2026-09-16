import { authClient } from '../loyalty/client.js';

const INSTALL_KEY = '3b_install_id_v1';
const INSTALL_SENT_KEY = '3b_install_ping_v1';
const SESSION_KEY = '3b_presence_session_v1';

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const n = Math.random() * 16 | 0;
    return (char === 'x' ? n : (n & 3 | 8)).toString(16);
  });
}

function storedId(storage, key) {
  try {
    let value = storage.getItem(key);
    if (!value) { value = uuid(); storage.setItem(key, value); }
    return value;
  } catch { return uuid(); }
}

export function runtimePlatform() {
  const capacitor = globalThis.Capacitor;
  if (capacitor?.isNativePlatform?.()) return capacitor.getPlatform?.() || 'native';
  if (/Android/i.test(navigator.userAgent)) return 'android-web';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios-web';
  return 'web';
}

export async function pingPresence(page = 'unknown') {
  const id = storedId(sessionStorage, SESSION_KEY);
  const { error } = await authClient.rpc('app_presence_ping', { p_session_id: id, p_platform: runtimePlatform(), p_page: page });
  if (error) throw error;
}

export async function pingInstall(force = false) {
  const id = storedId(localStorage, INSTALL_KEY);
  try { if (!force && localStorage.getItem(INSTALL_SENT_KEY) === '1') return; } catch {}
  const { error } = await authClient.rpc('app_install_ping', { p_install_id: id, p_platform: runtimePlatform() });
  if (error) throw error;
  try { localStorage.setItem(INSTALL_SENT_KEY, '1'); } catch {}
}

export async function getAppMetrics() {
  const { data, error } = await authClient.rpc('app_metrics_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    installs: Number(row?.total_installs || 0),
    online: Number(row?.online_now || 0),
    active15m: Number(row?.active_15m || 0),
  };
}

export function startAppTelemetry(page) {
  let alive = true;
  let timer;
  const presence = () => {
    if (!alive || document.visibilityState === 'hidden') return;
    pingPresence(page).catch(() => {});
  };
  const installed = () => pingInstall(true).catch(() => {});
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true || globalThis.Capacitor?.isNativePlatform?.();
  if (standalone) pingInstall().catch(() => {});
  window.addEventListener('appinstalled', installed);
  document.addEventListener('visibilitychange', presence);
  presence();
  timer = window.setInterval(presence, 45_000);
  return () => {
    alive = false;
    clearInterval(timer);
    window.removeEventListener('appinstalled', installed);
    document.removeEventListener('visibilitychange', presence);
  };
}
