import { useEffect, useMemo, useState } from "react";
import { normalizeSchedule, resolveBroadcastState } from "./originsTvSchedule.js";

const FALLBACK = normalizeSchedule();

export default function useOriginsTvSchedule() {
  const scheduleUrl = (import.meta.env && import.meta.env.VITE_ORIGINS_TV_SCHEDULE_URL) || "/origins-tv/schedule.json";
  const [schedule, setSchedule] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;

    async function refresh() {
      try {
        const response = await fetch(scheduleUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const payload = await response.json();
        if (!disposed) {
          setSchedule(normalizeSchedule(payload));
          setError("");
        }
      } catch {
        if (!disposed) setError("La grille TV n’est pas encore publiée.");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [scheduleUrl]);

  const state = useMemo(() => resolveBroadcastState(schedule, now), [schedule, now]);
  return { schedule, state, now, loading, error, scheduleUrl };
}
