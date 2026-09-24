import { useEffect, useState } from 'react';
import { authClient } from '../loyalty/client.js';

export default function DirectorTraffic({ traffic }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.hidden) return;
      const { data, error } = await authClient.rpc('app_director_traffic');
      if (active) setRows(error ? null : data);
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <section className="director-traffic" aria-label="Statistiques de fréquentation">
    <h2>Fréquentation 3B</h2>
    <p>Présence actualisée toutes les 30 secondes. Une personne reste comptée pendant 90 secondes après sa dernière activité visible.</p>
    <div className="director-traffic-totals">
      <span>Application en ligne <strong>{traffic?.app_online ?? '—'}</strong></span>
      <span>Site en ligne <strong>{traffic?.site_online ?? '—'}</strong></span>
      <span>Visites enregistrées <strong>{traffic ? Number(traffic.app_visits) + Number(traffic.site_visits) : '—'}</strong></span>
    </div>
    {rows && <div className="director-traffic-pages"><h3>Pages consultées</h3>{rows.length ? rows.map(row => <p key={`${row.platform}-${row.page}`}><span>{row.platform === 'app' ? 'Application' : 'Site'} · {row.page}</span><strong>{row.visits} visites · {row.active_now} en ligne</strong></p>) : <p>Les visites apparaîtront ici après activation du suivi.</p>}</div>}
  </section>;
}
