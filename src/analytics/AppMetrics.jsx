import React, { useEffect, useState } from 'react';
import { Activity, Download, Users } from 'lucide-react';
import { getAppMetrics } from './telemetry.js';
import './metrics.css';

export default function AppMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      try {
        const value = await getAppMetrics();
        if (live) { setMetrics(value); setError(false); }
      } catch { if (live) setError(true); }
    };
    refresh();
    const timer = setInterval(refresh, 30_000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  if (error && !metrics) return null;
  return <section className="app-metrics" aria-label="Statistiques de l’application 3B">
    <div><Download size={17}/><span>Installations détectées</span><strong>{metrics?.installs ?? '—'}</strong></div>
    <div><Users size={17}/><span>En ligne maintenant</span><strong>{metrics?.online ?? '—'}</strong></div>
    <div><Activity size={17}/><span>Actifs sur 15 min</span><strong>{metrics?.active15m ?? '—'}</strong></div>
  </section>;
}
