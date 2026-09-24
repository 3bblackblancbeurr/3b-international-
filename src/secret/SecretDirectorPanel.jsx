import { useEffect, useMemo, useState } from "react";
import { CalendarClock, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchDirectorSecretSchedule, setDirectorSecretEvent } from "./dailySecret.js";

const parisTime = value => new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date(value));

export default function SecretDirectorPanel() {
  const today = useMemo(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()), []);
  const [rows, setRows] = useState([]);
  const [eventDate, setEventDate] = useState(today);
  const [localTime, setLocalTime] = useState("20:18");
  const [openMinutes, setOpenMinutes] = useState(30);
  const [attemptMinutes, setAttemptMinutes] = useState(15);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBusy(true);
      setRows(await fetchDirectorSecretSchedule(14));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Planning indisponible.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    try {
      setBusy(true);
      await setDirectorSecretEvent({ eventDate, localTime, openMinutes, attemptMinutes, enabled: true });
      setMessage("Horaire Directeur enregistré.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="secret-director" aria-labelledby="secret-director-title">
      <div className="secret-director-heading">
        <div>
          <p className="eyebrow">DIRECTEUR · PROTOCOLE DE L’HEURE</p>
          <h2 id="secret-director-title">Calendrier privé du Secret</h2>
          <p>Ces heures ne sont jamais envoyées aux visiteurs avant l’ouverture. Tu peux remplacer une heure uniquement tant qu’aucune tentative n’a commencé.</p>
        </div>
        <button type="button" className="ghost-button" onClick={load} disabled={busy}><RefreshCw size={16} /> Actualiser</button>
      </div>

      <form className="secret-director-form" onSubmit={save}>
        <label><span>Date</span><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} /></label>
        <label><span>Heure Paris</span><input type="time" value={localTime} onChange={e => setLocalTime(e.target.value)} /></label>
        <label><span>Ouverture (min)</span><input type="number" min="5" max="180" value={openMinutes} onChange={e => setOpenMinutes(Number(e.target.value))} /></label>
        <label><span>Tentative (min)</span><input type="number" min="3" max="60" value={attemptMinutes} onChange={e => setAttemptMinutes(Number(e.target.value))} /></label>
        <button type="submit" className="primary-button" disabled={busy}><ShieldCheck size={17} /> Programmer</button>
      </form>

      {message && <p className="secret-director-message" role="status">{message}</p>}

      <div className="secret-director-grid">
        {rows.map(row => <article key={row.event_date}>
          <CalendarClock size={18} aria-hidden="true" />
          <div><strong>{row.event_date}</strong><span>{parisTime(row.opens_at)} → {parisTime(row.closes_at)}</span></div>
          <small>{Math.round(row.attempt_seconds / 60)} min · {row.source === "director" ? "DIRECTEUR" : "AUTO"}</small>
        </article>)}
      </div>
    </section>
  );
}
