import { useEffect, useState } from 'react';
import { authClient } from '../loyalty/client.js';

const SESSION_KEY = '3b_traffic_session';

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

function platform() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'app' : 'site';
}

export function useTraffic(page) {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    const id = sessionId();
    let disposed = false;
    const refresh = async () => {
      if (document.hidden || !navigator.onLine) return;
      const { error } = await authClient.rpc('app_presence_ping', {
        p_session_id: id, p_platform: platform(), p_page: page,
      });
      if (error || disposed) return;
      const { data } = await authClient.rpc('app_traffic_summary');
      if (!disposed && data?.[0]) setSummary(data[0]);
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
  return summary;
}
