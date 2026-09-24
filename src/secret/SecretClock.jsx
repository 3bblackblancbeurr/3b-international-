import { Clock3, LockKeyhole, Radio, Sparkles } from "lucide-react";
import { getPageHref } from "../lib/navigation.js";
import "./daily-secret.css";

export default function SecretClock({ secret, goTo, compact = false }) {
  const phase = secret?.phase || "loading";
  const isLive = phase === "open" || phase === "attempt";
  const Icon = phase === "open" ? Radio : phase === "attempt" ? Sparkles : phase === "completed" ? Sparkles : LockKeyhole;
  const content = (
    <>
      <span className="secret-clock-orbit" aria-hidden="true"><i /><i /></span>
      <Clock3 size={compact ? 16 : 18} strokeWidth={1.7} aria-hidden="true" />
      <span className="secret-clock-copy">
        <strong>{secret?.parisClock || "--:--:--"}</strong>
        <small>{isLive ? `${secret.label} · ${secret.countdown}` : secret?.label || "HEURE 3B"}</small>
      </span>
      <Icon className="secret-clock-state" size={compact ? 15 : 18} strokeWidth={1.7} aria-hidden="true" />
    </>
  );

  if (secret?.actionable) {
    return (
      <a
        href={getPageHref("secret")}
        onClick={(event) => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          goTo?.("secret");
        }}
        className={`secret-clock secret-clock-${secret.tone} ${compact ? "is-compact" : ""}`}
        data-phase={phase}
        aria-label={isLive ? `Secret 3B actif, ${secret.countdown} restantes` : "Voir l’état du Secret 3B"}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={`secret-clock secret-clock-${secret?.tone || "idle"} ${compact ? "is-compact" : ""}`} data-phase={phase} aria-label="Horloge 3B">
      {content}
    </div>
  );
}
