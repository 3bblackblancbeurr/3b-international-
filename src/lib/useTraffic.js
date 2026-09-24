import { useEffect, useState } from 'react';
import { authClient } from '../loyalty/client.js';

const SESSION_KEY = '3b_traffic_session';
const INSTALL_KEY = '3b_traffic_install';

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

function installId() {
  try {
    let id = localStorage.getItem(INSTALL_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(INSTALL_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

function platform() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'app' : 'site';
}

export function useTraffic(page) {
  useEffect(() => {
    const id = sessionId();
    const install = installId();
    let disposed = false;
    const refresh = async () => {
      if (document.hidden || !navigator.onLine) return;
      await authClient.rpc('app_install_ping', {
        p_install_id: install, p_platform: platform(),
      });
      const { error } = await authClient.rpc('app_presence_ping', {
        p_session_id: id, p_platform: platform(), p_page: page,
      });
      if (error || disposed) return;
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [page]);
}
