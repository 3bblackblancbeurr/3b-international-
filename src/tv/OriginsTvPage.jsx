import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, CalendarClock, Heart, Maximize2, Play, Radio, RefreshCw, Tv2, WifiOff } from "lucide-react";
import useOriginsTvSchedule from "./useOriginsTvSchedule.js";
import { getCountdownParts, getSyncOffsetSeconds, programsForLocalDay } from "./originsTvSchedule.js";
import "./origins-tv.css";

const FAVORITE_KEY = "3b-origins-tv-favorite";
const REMINDER_KEY = "3b-origins-tv-reminder";

function localTime(value, timezone) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Countdown({ target, now }) {
  const parts = getCountdownParts(target, now);
  if (!parts) return null;
  const chunks = [];
  if (parts.days) chunks.push(String(parts.days).padStart(2, "0"));
  chunks.push(String(parts.hours).padStart(2, "0"));
  chunks.push(String(parts.minutes).padStart(2, "0"));
  chunks.push(String(parts.seconds).padStart(2, "0"));
  return <span className="tv-countdown" aria-label="Temps restant">{chunks.join(":")}</span>;
}

function SyncedVideo({ program }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const source = program && program.source;

  function syncPlayer(force = false) {
    const video = videoRef.current;
    if (!video || !program) return;
    const target = getSyncOffsetSeconds(program, new Date());
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const safeTarget = Math.min(Math.max(0, target), Math.max(0, video.duration - 0.25));
    if (force || Math.abs(video.currentTime - safeTarget) > 2.5) video.currentTime = safeTarget;
  }

  async function startPlayback() {
    const video = videoRef.current;
    if (!video) return;
    syncPlayer(true);
    try {
      await video.play();
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }

  useEffect(() => {
    if (!program || (source && source.kind === "embed")) return undefined;
    const interval = window.setInterval(() => syncPlayer(false), 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncPlayer(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [program && program.id, source && source.kind]);

  if (!source || !source.url) {
    return <div className="tv-stage-empty"><Tv2 size={44} /><strong>Régie prête</strong><span>La source vidéo sera connectée au moment de la programmation.</span></div>;
  }

  if (source.kind === "embed") {
    return <div className="tv-embed-shell" ref={shellRef}>
      <iframe
        src={source.url}
        title={program.title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>;
  }

  return <div className="tv-video-shell" ref={shellRef}>
    <video
      key={program.id}
      ref={videoRef}
      src={source.url}
      poster={program.poster || undefined}
      controls
      playsInline
      preload="metadata"
      onLoadedMetadata={startPlayback}
      onPlay={() => syncPlayer(false)}
    >
      {(program.tracks || []).map(track => (
        <track
          key={(track.srclang || "track") + "-" + track.src}
          kind={track.kind || "subtitles"}
          src={track.src}
          srcLang={track.srclang}
          label={track.label}
          default={Boolean(track.default)}
        />
      ))}
    </video>
    <div className="tv-player-tools">
      {autoplayBlocked && <button type="button" className="tv-action primary" onClick={startPlayback}><Play size={17}/> Rejoindre le direct</button>}
      <button type="button" className="tv-icon-action" aria-label="Plein écran" onClick={() => shellRef.current && shellRef.current.requestFullscreen && shellRef.current.requestFullscreen()}><Maximize2 size={18}/></button>
    </div>
  </div>;
}

function ProgramList({ programs, timezone, currentId }) {
  if (!programs.length) {
    return <div className="tv-empty-program"><CalendarClock size={24}/><div><strong>Grille en préparation</strong><span>Les horaires seront publiés ici sans modifier l’application.</span></div></div>;
  }

  return <div className="tv-program-list">
    {programs.map(program => (
      <article key={program.id} className={program.id === currentId ? "tv-program is-live" : "tv-program"}>
        <time dateTime={program.startAt}>{localTime(program.startAt, timezone)}</time>
        <div><strong>{program.title}</strong>{program.label && <span>{program.label}</span>}</div>
        {program.id === currentId && <b><Radio size={14}/> Direct</b>}
      </article>
    ))}
  </div>;
}

export default function OriginsTvPage() {
  const { schedule, state, now, loading, error } = useOriginsTvSchedule();
  const timezone = schedule.channel.timezone || "Europe/Paris";
  const [favorite, setFavorite] = useState(() => localStorage.getItem(FAVORITE_KEY) === "1");
  const [reminder, setReminder] = useState(() => localStorage.getItem(REMINDER_KEY) === "1");
  const today = useMemo(() => programsForLocalDay(schedule.programs, now, timezone), [schedule.programs, now, timezone]);

  useEffect(() => {
    if (!reminder || !state.next) return undefined;
    const delay = new Date(state.next.startAt).getTime() - Date.now();
    if (delay <= 0 || delay > 2147483647) return undefined;
    const timer = window.setTimeout(() => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("3B ORIGINS TV", { body: "La diffusion programmée commence maintenant." });
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reminder, state.next && state.next.id]);

  async function toggleReminder() {
    const nextValue = !reminder;
    if (nextValue && "Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    setReminder(nextValue);
    localStorage.setItem(REMINDER_KEY, nextValue ? "1" : "0");
  }

  function toggleFavorite() {
    const nextValue = !favorite;
    setFavorite(nextValue);
    localStorage.setItem(FAVORITE_KEY, nextValue ? "1" : "0");
  }

  const channelMode = schedule.channel.mode === "continuous" ? "24/7" : "PROGRAMMÉE";
  const current = state.current;
  const next = state.next;

  return <section className="origins-tv-page">
    <header className="tv-hero">
      <div className="tv-hero-copy">
        <p className="eyebrow">3B INTERNATIONAL · CHAÎNE OFFICIELLE</p>
        <div className="tv-title-line"><span className="tv-logo-mark"><Tv2 size={26}/></span><h1>3B ORIGINS TV</h1></div>
        <p className="tv-tagline">{schedule.channel.tagline || "La chaîne du Monde du 3B."}</p>
        <div className="tv-badges">
          <span><span className={state.status === "live" ? "tv-live-dot active" : "tv-live-dot"}/> {state.status === "live" ? "EN DIRECT" : state.status === "prelaunch" ? "PRÉPARATION" : "ANTENNE FERMÉE"}</span>
          <span>{channelMode}</span>
          <span>{timezone}</span>
        </div>
      </div>
      <div className="tv-hero-actions">
        <button type="button" className={favorite ? "tv-action selected" : "tv-action"} onClick={toggleFavorite}><Heart size={17} fill={favorite ? "currentColor" : "none"}/>{favorite ? "Dans mes favoris" : "Favori"}</button>
        <button type="button" className={reminder ? "tv-action selected" : "tv-action"} onClick={toggleReminder}>{reminder ? <BellRing size={17}/> : <Bell size={17}/>} {reminder ? "Rappel activé" : "Prévenir au début"}</button>
      </div>
    </header>

    <div className="tv-console">
      <section className="tv-stage" aria-live="polite">
        <div className="tv-stage-topbar">
          <span><Radio size={16}/> 3B ORIGINS TV</span>
          <span>{state.status === "live" ? "LIVE" : channelMode}</span>
        </div>

        {state.status === "live" && current ? <>
          <SyncedVideo program={current}/>
          <div className="tv-now-strip"><div><small>MAINTENANT</small><strong>{current.title}</strong></div>{next && <div><small>ENSUITE</small><strong>{localTime(next.startAt, timezone)} · {next.title}</strong></div>}</div>
        </> : <div className="tv-off-air">
          <div className="tv-off-air-symbol"><span>3B</span><i/></div>
          <p>{state.status === "prelaunch" ? "LA CHAÎNE SE PRÉPARE" : "ANTENNE FERMÉE"}</p>
          {next ? <>
            <strong>Prochaine diffusion · {localTime(next.startAt, timezone)}</strong>
            <Countdown target={next.startAt} now={now}/>
          </> : <span>La prochaine diffusion apparaîtra automatiquement dès que la grille sera publiée.</span>}
        </div>}
      </section>

      <aside className="tv-sidebar">
        <div className="tv-panel">
          <div className="tv-panel-heading"><div><p className="eyebrow">Aujourd’hui</p><h2>Programme TV</h2></div><CalendarClock size={21}/></div>
          <ProgramList programs={today} timezone={timezone} currentId={current && current.id}/>
        </div>

        <div className="tv-panel tv-system-panel">
          <p className="eyebrow">Système</p>
          <div className="tv-system-row"><span>Synchronisation</span><strong>Automatique</strong></div>
          <div className="tv-system-row"><span>Support</span><strong>Web · PWA</strong></div>
          <div className="tv-system-row"><span>Grille distante</span><strong>{loading ? "Connexion…" : error ? "En attente" : "Connectée"}</strong></div>
          {error && <p className="tv-system-note"><WifiOff size={15}/>{error}</p>}
          <p className="tv-system-note"><RefreshCw size={15}/> La grille se met à jour automatiquement sans nouvelle version de l’application.</p>
        </div>
      </aside>
    </div>

    <section className="tv-roadmap" aria-label="Évolution de la chaîne">
      <article><span>01</span><div><strong>Diffusions programmées</strong><p>Ouverture et fermeture automatiques de l’antenne selon la grille publiée.</p></div></article>
      <article><span>02</span><div><strong>Plusieurs rendez-vous</strong><p>La même régie accepte autant de créneaux que nécessaire sans changer l’interface.</p></div></article>
      <article><span>03</span><div><strong>Chaîne continue</strong><p>Le mode peut évoluer vers une programmation permanente quand le catalogue sera prêt.</p></div></article>
    </section>
  </section>;
}
