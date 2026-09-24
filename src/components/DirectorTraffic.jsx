import { useEffect, useState } from 'react';
import { authClient } from '../loyalty/client.js';

export default function DirectorTraffic() {
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [monthly, setMonthly] = useState([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.hidden) return;
      const [{ data: trafficRows, error }, { data: totals, error: totalsError }, { data: days }, { data: months }] = await Promise.all([
        authClient.rpc('app_director_traffic'),
        authClient.rpc('app_director_traffic_summary'),
        authClient.rpc('app_director_traffic_timeline', { p_period: 'day' }),
        authClient.rpc('app_director_traffic_timeline', { p_period: 'month' }),
      ]);
      if (active) {
        setRows(error ? null : trafficRows);
        setSummary(totalsError ? null : totals?.[0] || null);
        setDaily(days || []);
        setMonthly(months || []);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <section className="director-traffic" aria-label="Statistiques de fréquentation">
    <h2>Fréquentation 3B</h2>
    <p>Statistiques anonymes, réservées au compte Directeur. Présence actualisée toutes les 30 secondes ; une session reste en ligne 90 secondes après sa dernière activité visible.</p>
    <div className="director-traffic-totals">
      <span>Application en ligne <strong>{summary?.app_online ?? '—'}</strong></span>
      <span>Site en ligne <strong>{summary?.site_online ?? '—'}</strong></span>
      <span>Appareils uniques <strong>{summary?.unique_installs ?? '—'}</strong></span>
      <span>Sessions enregistrées <strong>{summary?.visits ?? '—'}</strong></span>
    </div>
    {rows && <div className="director-traffic-pages"><h3>En temps réel · pages consultées</h3>{rows.length ? rows.map(row => <p key={`${row.platform}-${row.page}`}><span>{row.platform === 'app' ? 'Application' : 'Site'} · {row.page}</span><strong>{row.visits} sessions · {row.active_now} en ligne</strong></p>) : <p>Les premières sessions apparaîtront ici.</p>}</div>}
    <TrafficChart title="14 derniers jours" rows={daily} />
    <TrafficChart title="12 derniers mois" rows={monthly} />
  </section>;
}

function TrafficChart({ title, rows }) {
  const max = Math.max(1, ...rows.map(row => Number(row.sessions) || 0));
  return <section className="director-traffic-chart"><h3>{title}</h3>{rows.length ? <div className="director-traffic-bars" role="img" aria-label={`${title} : ${rows.map(row => `${row.bucket}, ${row.sessions} sessions`).join('; ')}`}>{rows.map(row => <div key={row.bucket} title={`${row.bucket} · ${row.sessions} sessions`}><i style={{ height: `${Math.max(5, Math.round(Number(row.sessions) / max * 100))}%` }}/><span>{row.bucket}</span><b>{row.sessions}</b></div>)}</div> : <p>Les données apparaîtront dès les premières visites enregistrées.</p>}</section>;
}
