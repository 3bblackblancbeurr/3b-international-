import React, { useEffect, useMemo, useRef, useState } from "react";
import CompanionAvatar from "./CompanionAvatar.jsx";
import {
  COMPANION_MODES,
  DEFAULT_COMPANION_PREFS,
  companionLabel,
  contextDrivenMode,
  eventToMode,
  modeDurationMs,
  sanitizeCompanionPrefs,
} from "./companion-model.js";
import {
  companionPlatform,
  getCompanionCapabilities,
  openCompanionWallpaperPicker,
  requestOverlayPermission,
  setNativeCompanionMode,
  startCompanionOverlay,
  stopCompanionOverlay,
} from "../native/companion.js";

const PREFS_KEY = "threeb_companion_prefs_v1";

function readPrefs() {
  try {
    return sanitizeCompanionPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_COMPANION_PREFS };
  }
}

function savePrefs(value) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private/restricted contexts.
  }
}

function nextWanderTarget(index) {
  const points = [82, 68, 20, 42, 76, 56, 15, 34, 88];
  return points[index % points.length];
}

export default function CompanionLayer({ page, secretPhase, memberRegistered }) {
  const [prefs, setPrefs] = useState(readPrefs);
  const [mode, setMode] = useState(() => contextDrivenMode({ secretPhase, page, memberRegistered }));
  const [panelOpen, setPanelOpen] = useState(false);
  const [x, setX] = useState(82);
  const [wanderIndex, setWanderIndex] = useState(0);
  const [capabilities, setCapabilities] = useState(null);
  const [nativeStatus, setNativeStatus] = useState("");
  const transientTimer = useRef(0);

  const platform = companionPlatform();
  const label = useMemo(() => companionLabel(mode), [mode]);

  useEffect(() => {
    let live = true;
    getCompanionCapabilities().then((value) => {
      if (live) setCapabilities(value);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!prefs.enabled) return undefined;
    const contextual = contextDrivenMode({ secretPhase, page, memberRegistered });
    if (contextual !== COMPANION_MODES.IDLE || mode === COMPANION_MODES.IDLE || mode === COMPANION_MODES.SIT) {
      setMode(contextual);
    }
    return undefined;
  }, [page, secretPhase, memberRegistered, prefs.enabled]);

  useEffect(() => {
    if (!prefs.enabled) return undefined;

    const onCompanionEvent = (event) => {
      const type = event?.detail?.type || event?.type?.replace(/^threeb:/, "");
      const next = eventToMode(type);
      setMode(next);
      window.clearTimeout(transientTimer.current);
      const duration = modeDurationMs(next);
      if (duration > 0) {
        transientTimer.current = window.setTimeout(() => {
          setMode(contextDrivenMode({ secretPhase, page, memberRegistered }));
        }, duration);
      }
    };

    const events = [
      "threeb:companion",
      "threeb:reward",
      "threeb:celebrate",
      "threeb:notification",
      "threeb:secret",
    ];
    events.forEach((name) => window.addEventListener(name, onCompanionEvent));
    return () => {
      events.forEach((name) => window.removeEventListener(name, onCompanionEvent));
      window.clearTimeout(transientTimer.current);
    };
  }, [prefs.enabled, page, secretPhase, memberRegistered]);

  useEffect(() => {
    if (!prefs.enabled || prefs.reducedPresence || mode === COMPANION_MODES.SLEEP) return undefined;
    const delay = prefs.batterySaver ? 26000 : 16000;
    const interval = window.setInterval(() => {
      setWanderIndex((current) => {
        const next = current + 1;
        setMode(COMPANION_MODES.WALK);
        setX(nextWanderTarget(next));
        window.setTimeout(() => {
          setMode((currentMode) => currentMode === COMPANION_MODES.WALK ? COMPANION_MODES.SIT : currentMode);
        }, prefs.batterySaver ? 3800 : 5200);
        return next;
      });
    }, delay);
    return () => window.clearInterval(interval);
  }, [prefs.enabled, prefs.reducedPresence, prefs.batterySaver, mode === COMPANION_MODES.SLEEP]);

  useEffect(() => {
    if (!prefs.enabled || platform !== "android") return;
    setNativeCompanionMode(mode).catch(() => {});
  }, [mode, prefs.enabled, platform]);

  function updatePrefs(patch) {
    const next = sanitizeCompanionPrefs({ ...prefs, ...patch });
    setPrefs(next);
    savePrefs(next);
  }

  async function enableOverlay() {
    setNativeStatus("Vérification de l’autorisation…");
    try {
      const permission = await requestOverlayPermission();
      if (permission?.granted) {
        const result = await startCompanionOverlay();
        setNativeStatus(result?.started ? "Compagnon Android actif hors de l’application." : "Impossible de démarrer le compagnon.");
      } else {
        setNativeStatus("Autorise « Afficher par-dessus les autres applications », puis reviens dans 3B.");
      }
    } catch {
      setNativeStatus("Le mode compagnon Android n’est pas disponible sur cet appareil.");
    }
  }

  async function disableOverlay() {
    await stopCompanionOverlay().catch(() => {});
    setNativeStatus("Compagnon hors application arrêté.");
  }

  async function openWallpaper() {
    try {
      const result = await openCompanionWallpaperPicker();
      setNativeStatus(result?.opened ? "Choisis « Compagnon 3B » comme fond animé." : "Fond animé indisponible.");
    } catch {
      setNativeStatus("Fond animé indisponible sur cet appareil.");
    }
  }

  if (!prefs.enabled) {
    return (
      <button
        className="companion3b-reactivate"
        type="button"
        onClick={() => updatePrefs({ enabled: true })}
        aria-label="Réactiver le Compagnon 3B"
      >
        3B
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="companion3b-shell"
        data-mode={mode}
        data-battery-saver={prefs.batterySaver ? "true" : "false"}
        style={{ "--companion-x": `${x}vw` }}
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="companion3b-panel"
        title={label}
      >
        <span className="companion3b-bubble" aria-hidden="true">{label}</span>
        <CompanionAvatar mode={mode} size={prefs.reducedPresence ? 76 : 108} title={`Compagnon 3B · ${label}`} />
      </button>

      {panelOpen && (
        <aside className="companion3b-panel" id="companion3b-panel" aria-label="Réglages Compagnon 3B">
          <div className="companion3b-panel-head">
            <div>
              <span className="companion3b-kicker">3B COMPANION</span>
              <strong>Toujours avec vous</strong>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Fermer">×</button>
          </div>

          <p className="companion3b-panel-status"><i /> {label}</p>
          <p className="companion3b-copy">
            Un seul compagnon 3B, identique pour tout le monde. Son apparence n’est pas personnalisable.
          </p>

          <div className="companion3b-toggles">
            <label>
              <span>Mode batterie intelligent</span>
              <input type="checkbox" checked={prefs.batterySaver} onChange={(e) => updatePrefs({ batterySaver: e.target.checked })} />
            </label>
            <label>
              <span>Présence discrète</span>
              <input type="checkbox" checked={prefs.reducedPresence} onChange={(e) => updatePrefs({ reducedPresence: e.target.checked })} />
            </label>
            <label>
              <span>Silencieux</span>
              <input type="checkbox" checked={prefs.quiet} onChange={(e) => updatePrefs({ quiet: e.target.checked })} />
            </label>
          </div>

          {platform === "android" && (
            <div className="companion3b-native-actions">
              <button type="button" onClick={enableOverlay}>Activer hors de l’app</button>
              <button type="button" onClick={openWallpaper}>Écran verrouillé / fond animé</button>
              <button type="button" onClick={disableOverlay}>Arrêter le mode externe</button>
            </div>
          )}

          {platform === "ios" && (
            <p className="companion3b-platform-note">
              Sur iPhone, la présence hors application passe par WidgetKit et Live Activity ; iOS garde le contrôle du verrouillage et de la Dynamic Island.
            </p>
          )}

          {platform === "web" && (
            <p className="companion3b-platform-note">
              Dans la PWA, le compagnon vit dans 3B. Les fonctions système complètes sont disponibles avec les versions mobiles natives.
            </p>
          )}

          {capabilities && (
            <div className="companion3b-capabilities" aria-label="Capacités">
              <span className={capabilities.inApp ? "on" : ""}>App</span>
              <span className={capabilities.overlay ? "on" : ""}>Overlay</span>
              <span className={capabilities.liveWallpaper ? "on" : ""}>Lock</span>
              <span className={capabilities.liveActivity ? "on" : ""}>Live</span>
            </div>
          )}

          {nativeStatus && <p className="companion3b-native-status" role="status">{nativeStatus}</p>}

          <button className="companion3b-disable" type="button" onClick={() => updatePrefs({ enabled: false })}>
            Désactiver le compagnon
          </button>
        </aside>
      )}
    </>
  );
}
