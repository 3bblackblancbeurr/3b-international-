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
  endCompanionLiveActivity,
  getCompanionCapabilities,
  openCompanionWallpaperPicker,
  requestOverlayPermission,
  setNativeCompanionMode,
  startCompanionLiveActivity,
  startCompanionOverlay,
  stopCompanionOverlay,
  updateCompanionLiveActivity,
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

function mayFollowClock(mode) {
  return [
    COMPANION_MODES.IDLE,
    COMPANION_MODES.SIT,
    COMPANION_MODES.SLEEP,
    COMPANION_MODES.WAKE,
    COMPANION_MODES.CLOCK,
  ].includes(mode);
}

export default function CompanionLayer({ page, secretPhase, memberRegistered }) {
  const [prefs, setPrefs] = useState(readPrefs);
  const [mode, setMode] = useState(() => contextDrivenMode({ secretPhase, page, memberRegistered }));
  const [panelOpen, setPanelOpen] = useState(false);
  const [x, setX] = useState(82);
  const [wanderIndex, setWanderIndex] = useState(0);
  const [capabilities, setCapabilities] = useState(null);
  const [nativeStatus, setNativeStatus] = useState("");
  const [lowPower, setLowPower] = useState(false);
  const transientTimer = useRef(0);
  const visibilityTimer = useRef(0);

  const platform = companionPlatform();
  const label = useMemo(() => companionLabel(mode), [mode]);

  function updatePrefs(patch) {
    setPrefs((current) => {
      const next = sanitizeCompanionPrefs({ ...current, ...patch });
      savePrefs(next);
      return next;
    });
  }

  function restoreContext(afterMs = 0) {
    window.clearTimeout(transientTimer.current);
    const apply = () => setMode(contextDrivenMode({ secretPhase, page, memberRegistered }));
    if (afterMs > 0) transientTimer.current = window.setTimeout(apply, afterMs);
    else apply();
  }

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
    if (contextual !== COMPANION_MODES.IDLE || mayFollowClock(mode)) {
      setMode(contextual);
    }
    return undefined;
  }, [page, secretPhase, memberRegistered, prefs.enabled]);

  useEffect(() => {
    if (!prefs.enabled) return undefined;
    const ticker = window.setInterval(() => {
      setMode((current) => mayFollowClock(current)
        ? contextDrivenMode({ secretPhase, page, memberRegistered })
        : current);
    }, 30000);
    return () => window.clearInterval(ticker);
  }, [prefs.enabled, page, secretPhase, memberRegistered]);

  useEffect(() => {
    if (!prefs.enabled) return undefined;

    const onCompanionEvent = (event) => {
      const type = event?.detail?.type || event?.type?.replace(/^threeb:/, "");
      const next = eventToMode(type);
      setMode(next);
      window.clearTimeout(transientTimer.current);
      const duration = modeDurationMs(next);
      if (duration > 0) restoreContext(duration);
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
    if (!prefs.enabled) return undefined;

    const onVisibility = () => {
      window.clearTimeout(visibilityTimer.current);
      if (document.hidden) {
        setMode((current) => current === COMPANION_MODES.SLEEP ? current : COMPANION_MODES.SIT);
        return;
      }
      setMode(COMPANION_MODES.WAKE);
      visibilityTimer.current = window.setTimeout(
        () => setMode(contextDrivenMode({ secretPhase, page, memberRegistered })),
        2400,
      );
    };

    const onOffline = () => {
      setMode(COMPANION_MODES.GUARDIAN);
      setNativeStatus("Connexion perdue · le compagnon reste local et n’accède à aucune autre application.");
    };
    const onOnline = () => {
      setMode(COMPANION_MODES.SUPPORT);
      setNativeStatus("");
      restoreContext(2600);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.clearTimeout(visibilityTimer.current);
    };
  }, [prefs.enabled, page, secretPhase, memberRegistered]);

  useEffect(() => {
    if (!prefs.enabled || typeof navigator?.getBattery !== "function") return undefined;
    let battery;
    let live = true;
    const sync = () => {
      if (!battery || !live) return;
      setLowPower(!battery.charging && battery.level <= 0.2);
    };
    navigator.getBattery().then((value) => {
      if (!live) return;
      battery = value;
      sync();
      battery.addEventListener("levelchange", sync);
      battery.addEventListener("chargingchange", sync);
    }).catch(() => {});
    return () => {
      live = false;
      battery?.removeEventListener("levelchange", sync);
      battery?.removeEventListener("chargingchange", sync);
    };
  }, [prefs.enabled]);

  useEffect(() => {
    if (!prefs.enabled || prefs.reducedPresence || lowPower || mode === COMPANION_MODES.SLEEP) return undefined;
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
  }, [prefs.enabled, prefs.reducedPresence, prefs.batterySaver, lowPower, mode === COMPANION_MODES.SLEEP]);

  useEffect(() => {
    if (!prefs.enabled || platform !== "android" || !prefs.androidOverlayEnabled) return;
    startCompanionOverlay()
      .then(() => setNativeCompanionMode(mode))
      .catch(() => {});
  }, [prefs.enabled, prefs.androidOverlayEnabled, platform]);

  useEffect(() => {
    if (!prefs.enabled || platform !== "android" || !prefs.androidOverlayEnabled) return;
    setNativeCompanionMode(mode).catch(() => {});
  }, [mode, prefs.enabled, prefs.androidOverlayEnabled, platform]);

  useEffect(() => {
    if (!prefs.enabled || platform !== "ios" || !prefs.iosLiveActivityEnabled) return;
    updateCompanionLiveActivity({ mode, message: label }).catch(() => {});
  }, [mode, label, prefs.enabled, prefs.iosLiveActivityEnabled, platform]);

  async function enableOverlay() {
    setNativeStatus("Vérification de l’autorisation Android…");
    try {
      const permission = await requestOverlayPermission();
      if (permission?.granted) {
        const result = await startCompanionOverlay();
        if (result?.started) {
          updatePrefs({ androidOverlayEnabled: true });
          await setNativeCompanionMode(mode).catch(() => {});
          setNativeStatus("Compagnon Android actif hors de l’application.");
        } else {
          setNativeStatus("Impossible de démarrer le compagnon.");
        }
      } else {
        setNativeStatus("Autorise « Afficher par-dessus les autres applications », puis reviens ici et appuie à nouveau sur Activer.");
      }
    } catch {
      setNativeStatus("Le mode compagnon Android n’est pas disponible sur cet appareil.");
    }
  }

  async function disableOverlay() {
    await stopCompanionOverlay().catch(() => {});
    updatePrefs({ androidOverlayEnabled: false });
    setNativeStatus("Compagnon hors application arrêté.");
  }

  async function openWallpaper() {
    try {
      const result = await openCompanionWallpaperPicker();
      setNativeStatus(result?.opened
        ? "Choisis « Compagnon 3B » comme fond animé. Android garde le contrôle de l’écran verrouillé."
        : "Fond animé indisponible.");
    } catch {
      setNativeStatus("Fond animé indisponible sur cet appareil.");
    }
  }

  async function enableLiveActivity() {
    setNativeStatus("Activation de la présence iPhone…");
    try {
      const result = await startCompanionLiveActivity({ mode, message: label });
      if (result?.started) {
        updatePrefs({ iosLiveActivityEnabled: true });
        setNativeStatus("Live Activity 3B active sur les surfaces iOS compatibles.");
      } else {
        setNativeStatus("Live Activities indisponibles ou désactivées dans iOS.");
      }
    } catch {
      setNativeStatus("Impossible d’activer la Live Activity sur cet iPhone.");
    }
  }

  async function disableLiveActivity() {
    await endCompanionLiveActivity().catch(() => {});
    updatePrefs({ iosLiveActivityEnabled: false });
    setNativeStatus("Live Activity 3B arrêtée.");
  }

  async function disableCompanion() {
    if (platform === "android" && prefs.androidOverlayEnabled) {
      await stopCompanionOverlay().catch(() => {});
    }
    if (platform === "ios" && prefs.iosLiveActivityEnabled) {
      await endCompanionLiveActivity().catch(() => {});
    }
    updatePrefs({
      enabled: false,
      androidOverlayEnabled: false,
      iosLiveActivityEnabled: false,
    });
    setPanelOpen(false);
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
        data-low-power={lowPower ? "true" : "false"}
        style={{ "--companion-x": `${x}vw` }}
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="companion3b-panel"
        title={label}
      >
        <span className="companion3b-bubble" aria-hidden="true">{label}</span>
        <CompanionAvatar mode={mode} size={prefs.reducedPresence || lowPower ? 76 : 108} title={`Compagnon 3B · ${label}`} />
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

          <p className="companion3b-panel-status"><i /> {label}{lowPower ? " · économie renforcée" : ""}</p>
          <p className="companion3b-copy">
            Un seul compagnon 3B, identique pour tout le monde. Son apparence n’est pas personnalisable. Les réglages ci-dessous ne changent que sa présence et sa consommation.
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
            <>
              <div className="companion3b-native-actions">
                <button type="button" onClick={enableOverlay}>
                  {prefs.androidOverlayEnabled ? "Relancer hors de l’app" : "Activer hors de l’app"}
                </button>
                <button type="button" onClick={openWallpaper}>Écran verrouillé / fond animé</button>
                <button type="button" onClick={disableOverlay}>Arrêter le mode externe</button>
              </div>
              <p className="companion3b-platform-note">
                Le mode flottant nécessite l’autorisation Android dédiée. Le Compagnon 3B ne lit ni l’écran, ni les autres applications, ni le micro, ni la caméra.
              </p>
            </>
          )}

          {platform === "ios" && (
            <>
              <div className="companion3b-native-actions">
                <button type="button" onClick={enableLiveActivity}>
                  {prefs.iosLiveActivityEnabled ? "Actualiser Live Activity" : "Activer Live Activity"}
                </button>
                <button type="button" onClick={disableLiveActivity}>Arrêter Live Activity</button>
              </div>
              <p className="companion3b-platform-note">
                Le widget Compagnon 3B peut être ajouté à l’écran verrouillé. Sur iPhone, iOS garde le contrôle de l’écran verrouillé et de la Dynamic Island.
              </p>
            </>
          )}

          {platform === "web" && (
            <p className="companion3b-platform-note">
              Dans la PWA, le compagnon vit dans 3B. Les fonctions système complètes utilisent les versions mobiles natives.
            </p>
          )}

          {capabilities && (
            <div className="companion3b-capabilities" aria-label="Capacités">
              <span className={capabilities.inApp ? "on" : ""}>App</span>
              <span className={capabilities.overlay ? "on" : ""}>Overlay</span>
              <span className={capabilities.liveWallpaper ? "on" : ""}>Lock</span>
              <span className={capabilities.lockWidget ? "on" : ""}>Widget</span>
              <span className={capabilities.liveActivity ? "on" : ""}>Live</span>
            </div>
          )}

          {nativeStatus && <p className="companion3b-native-status" role="status">{nativeStatus}</p>}

          <button className="companion3b-disable" type="button" onClick={disableCompanion}>
            Désactiver le compagnon
          </button>
        </aside>
      )}
    </>
  );
}
