import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "../loyalty/client.js";

const POLL_MS = 5000;

function parseServerTime(value) {
  const stamp = Date.parse(value || "");
  return Number.isFinite(stamp) ? stamp : Date.now();
}

function formatParisClock(timestamp) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export async function fetchDailySecretStatus() {
  const { data, error } = await authClient.rpc("secret3b_daily_status");
  if (error) throw error;
  return data || {};
}

export async function startDailySecretAttempt() {
  const { data, error } = await authClient.rpc("secret3b_start_daily_attempt");
  if (error) throw error;
  return data || {};
}

export async function completeDailySecretAttempt() {
  const { data, error } = await authClient.rpc("secret3b_complete_daily_attempt");
  if (error) throw error;
  return data || {};
}

export async function fetchDirectorSecretSchedule(days = 14) {
  const { data, error } = await authClient.rpc("secret3b_director_schedule", { p_days: days });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function setDirectorSecretEvent({ eventDate, localTime, openMinutes = 30, attemptMinutes = 15, enabled = true }) {
  const { data, error } = await authClient.rpc("secret3b_director_set_event", {
    p_event_date: eventDate,
    p_local_time: localTime,
    p_open_minutes: openMinutes,
    p_attempt_minutes: attemptMinutes,
    p_enabled: enabled,
  });
  if (error) throw error;
  return data || {};
}

export function useDailySecret() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(() => Date.now());
  const offsetRef = useRef(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchDailySecretStatus();
      if (!mountedRef.current) return next;
      offsetRef.current = parseServerTime(next.server_now) - Date.now();
      setStatus(next);
      setError("");
      return next;
    } catch (requestError) {
      if (!mountedRef.current) return null;
      setError(requestError instanceof Error ? requestError.message : "Horloge 3B indisponible.");
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const clock = window.setInterval(() => setTick(Date.now()), 1000);
    const wake = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
    };
  }, [refresh]);

  const serverNowMs = tick + offsetRef.current;
  const phase = status?.phase || "loading";
  const deadlineMs = Date.parse(status?.attempt_deadline_at || "");
  const closesMs = Date.parse(status?.closes_at || "");
  const countdownTarget = phase === "attempt" && Number.isFinite(deadlineMs) ? deadlineMs
    : phase === "open" && Number.isFinite(closesMs) ? closesMs
      : NaN;
  const liveSeconds = Number.isFinite(countdownTarget)
    ? Math.max(0, Math.ceil((countdownTarget - serverNowMs) / 1000))
    : 0;

  const derived = useMemo(() => {
    const map = {
      loading: { label: "SYNCHRONISATION", tone: "idle", actionable: false },
      waiting: { label: "HEURE ACTIVE", tone: "waiting", actionable: false },
      open: { label: "SIGNAL ACTIF", tone: "open", actionable: true },
      attempt: { label: "TENTATIVE EN COURS", tone: "attempt", actionable: true },
      completed: { label: "SECRET ACCOMPLI", tone: "completed", actionable: true },
      missed: { label: "SIGNAL PASSÉ", tone: "missed", actionable: true },
      expired: { label: "TEMPS ÉCOULÉ", tone: "missed", actionable: true },
      disabled: { label: "NEXUS EN VEILLE", tone: "idle", actionable: false },
    };
    return map[phase] || map.loading;
  }, [phase]);

  return {
    status,
    phase,
    loading,
    error,
    refresh,
    parisClock: formatParisClock(serverNowMs),
    serverNowMs,
    liveSeconds,
    countdown: formatCountdown(liveSeconds),
    ...derived,
  };
}
