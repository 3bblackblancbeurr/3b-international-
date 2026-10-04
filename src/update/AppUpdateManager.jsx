import { useCallback, useEffect, useRef, useState } from "react";
import { isNativeApp } from "../native/runtime.js";
import { Button } from "../design-system/index.jsx";
import { serverReleaseDecision } from "./release-policy.js";
import "./app-update.css";

const CURRENT_BUILD_ID = typeof __THREEB_BUILD_ID__ !== "undefined" ? __THREEB_BUILD_ID__ : "dev";
const CURRENT_VERSION = typeof __THREEB_APP_VERSION__ !== "undefined" ? __THREEB_APP_VERSION__ : "dev";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISSED_PREFIX = "3b:update:dismissed:";

function registrationScriptPath(registration) {
  const worker = registration?.active || registration?.waiting || registration?.installing;
  if (!worker?.scriptURL) return "";
  try {
    return new URL(worker.scriptURL).pathname;
  } catch {
    return "";
  }
}

async function healLegacyPwaRegistrations() {
  if (!("serviceWorker" in navigator)) return false;
  const registrations = await navigator.serviceWorker.getRegistrations();
  const legacy = registrations.filter((registration) => {
    const path = registrationScriptPath(registration);
    return path && path !== "/sw.js";
  });
  if (legacy.length === 0) return false;

  await Promise.all(legacy.map((registration) => registration.unregister().catch(() => false)));

  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }

  return true;
}

export default function AppUpdateManager() {
  const registrationRef = useRef(null);
  const reloadRequestedRef = useRef(false);
  const [release, setRelease] = useState(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const publishRelease = useCallback((next) => {
    const decision = serverReleaseDecision(next, CURRENT_BUILD_ID);
    if (decision.status === "current") {
      setRelease(null);
      setDismissed(false);
      return;
    }
    if (decision.status !== "available") return;
    const normalized = decision.release;
    let wasDismissed = false;
    try {
      wasDismissed = sessionStorage.getItem(DISMISSED_PREFIX + normalized.buildId) === "1";
    } catch {
      wasDismissed = false;
    }
    setDismissed(wasDismissed && !normalized.mandatory);
    setRelease((current) => {
      if (!current || current.buildId !== normalized.buildId) return normalized;
      return { ...current, mandatory: current.mandatory || normalized.mandatory, version: normalized.version || current.version };
    });
  }, []);

  const checkServerRelease = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const response = await fetch(`/version.json?ts=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const next = await response.json();
      publishRelease(next);
    } catch {
      // A failed version check must never block the application.
    }
  }, [publishRelease]);

  useEffect(() => {
    if (!import.meta.env.PROD || isNativeApp() || !("serviceWorker" in navigator)) return undefined;

    let disposed = false;
    let registration = null;

    const watchWorker = (worker) => {
      if (!worker) return;
      const stateChanged = () => {
        if (disposed || worker.state !== "installed" || !navigator.serviceWorker.controller) return;
        // A worker can catch up after the page already loaded the latest build.
        // Its installation is a reason to check, never proof of a new release.
        void checkServerRelease();
      };
      worker.addEventListener("statechange", stateChanged);
    };

    const updateFound = () => watchWorker(registration?.installing);
    const controllerChanged = () => {
      if (!reloadRequestedRef.current) return;
      window.location.reload();
    };
    const foregroundCheck = () => {
      if (document.visibilityState === "visible") {
        void checkServerRelease();
        void registrationRef.current?.update().catch(() => {});
      }
    };
    const onlineCheck = () => {
      void checkServerRelease();
      void registrationRef.current?.update().catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged);
    document.addEventListener("visibilitychange", foregroundCheck);
    window.addEventListener("online", onlineCheck);

    const interval = window.setInterval(() => {
      void checkServerRelease();
      void registrationRef.current?.update().catch(() => {});
    }, CHECK_INTERVAL_MS);

    const setupWorker = async () => {
      try {
        const healedLegacy = await healLegacyPwaRegistrations();
        if (disposed) return;
        if (healedLegacy && navigator.serviceWorker.controller) {
          window.location.reload();
          return;
        }

        const nextRegistration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;

        registration = nextRegistration;
        registrationRef.current = nextRegistration;
        registration.addEventListener("updatefound", updateFound);
        if (registration.waiting && navigator.serviceWorker.controller) {
          void checkServerRelease();
        }
        void registration.update().catch(() => {});
      } catch {
        // The web application remains usable if service-worker repair or registration fails.
      }
    };

    void setupWorker();
    void checkServerRelease();

    return () => {
      disposed = true;
      window.clearInterval(interval);
      registration?.removeEventListener("updatefound", updateFound);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged);
      document.removeEventListener("visibilitychange", foregroundCheck);
      window.removeEventListener("online", onlineCheck);
    };
  }, [checkServerRelease, publishRelease]);

  async function applyUpdate() {
    if (applying) return;
    setApplying(true);
    reloadRequestedRef.current = true;

    try {
      const registration = registrationRef.current || await navigator.serviceWorker.getRegistration("/");
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      await registration?.update();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }
    } catch {
      // Reload below still revalidates index.html and Vite's hashed assets.
    }

    window.location.reload();
  }

  function dismissUpdate() {
    if (!release || release.mandatory) return;
    try {
      sessionStorage.setItem(DISMISSED_PREFIX + release.buildId, "1");
    } catch {
      // Dismissal is optional; blocked storage must not affect the app.
    }
    setDismissed(true);
  }

  if (!release || dismissed) return null;

  const mandatory = release.mandatory;
  const currentBuildLabel = CURRENT_BUILD_ID === "dev" ? "dev" : CURRENT_BUILD_ID.slice(0, 7);
  const targetBuildLabel = release.buildId === "service-worker" ? "" : release.buildId.slice(0, 7);
  const targetLabel = release.version === "nouvelle"
    ? "dernière version"
    : `v${release.version}${targetBuildLabel ? ` · ${targetBuildLabel}` : ""}`;

  return (
    <div
      className={`threeb-update-shell${mandatory ? " is-mandatory" : ""}`}
      role="dialog"
      aria-modal={mandatory ? "true" : undefined}
      aria-live={mandatory ? "assertive" : "polite"}
      aria-labelledby="threeb-update-title"
    >
      <section className="threeb-update-panel">
        <div className="threeb-update-glow" aria-hidden="true" />
        <p className="threeb-update-kicker">
          {mandatory ? "MISE À JOUR REQUISE" : "NOUVELLE VERSION 3B DISPONIBLE"}
        </p>
        <h2 id="threeb-update-title">
          {mandatory ? "Mise à jour 3B obligatoire" : "Nouvelle version 3B disponible"}
        </h2>
        <p className="threeb-update-copy">
          Améliorations graphiques, Monde 3B, Passeport et performances.
        </p>
        <p className="threeb-update-version">
          Version installée&nbsp;: {CURRENT_VERSION} · {currentBuildLabel} · Disponible&nbsp;: {targetLabel}
        </p>
        {mandatory && (
          <p className="threeb-update-required">
            Cette mise à jour doit être installée avant de continuer afin de garder l’application compatible et sécurisée.
          </p>
        )}
        <div className="threeb-update-actions">
          <Button
            className="threeb-update-primary"
            variant="champagne"
            size="lg"
            onClick={applyUpdate}
            disabled={applying}
          >
            {applying ? "MISE À JOUR…" : "METTRE À JOUR"}
          </Button>
          {!mandatory && (
            <Button
              className="threeb-update-secondary"
              variant="ghost"
              size="lg"
              onClick={dismissUpdate}
              disabled={applying}
            >
              Plus tard
            </Button>
          )}
        </div>
        <p className="threeb-update-safe">
          Ton compte, ton Passeport, tes XP, tes Coins et tes données ne sont pas supprimés par cette mise à jour.
        </p>
      </section>
    </div>
  );
}
