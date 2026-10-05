import { useCallback, useEffect, useRef, useState } from "react";
import { isNativeApp } from "../native/runtime.js";
import { Button } from "../design-system/index.jsx";
import { serverReleaseDecision } from "./release-policy.js";
import "./app-update.css";

const CURRENT_BUILD_ID = typeof __THREEB_BUILD_ID__ !== "undefined" ? __THREEB_BUILD_ID__ : "dev";
const CURRENT_VERSION = typeof __THREEB_APP_VERSION__ !== "undefined" ? __THREEB_APP_VERSION__ : "dev";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISSED_PREFIX = "3b:update:dismissed:";
const APPLIED_NOTICE_KEY = "3b:update:applied";

function registrationScriptPath(registration) {
  const worker = registration?.active || registration?.waiting || registration?.installing;
  if (!worker?.scriptURL) return "";
  try {
    return new URL(worker.scriptURL).pathname;
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function releaseAssetUrls(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const raw = [
    ...[...doc.querySelectorAll("script[src]")].map((node) => node.getAttribute("src")),
    ...[...doc.querySelectorAll("link[href]")]
      .filter((node) => ["stylesheet", "modulepreload", "preload"].includes(node.rel))
      .map((node) => node.getAttribute("href")),
  ];

  return [...new Set(raw
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value, window.location.href);
      } catch {
        return null;
      }
    })
    .filter((url) => url && url.origin === window.location.origin)
    .map((url) => url.href))];
}

async function probeAssetSize(url) {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!response.ok) return 0;
    return Number(response.headers.get("content-length")) || 0;
  } catch {
    return 0;
  }
}

async function prefetchLatestBuild(onProgress) {
  const indexResponse = await fetch(`/?__3b_update=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });
  if (!indexResponse.ok) throw new Error("latest-build-unavailable");

  const html = await indexResponse.text();
  const assets = releaseAssetUrls(html);
  if (assets.length === 0) {
    onProgress(84);
    return;
  }

  const measured = await Promise.all(assets.map(probeAssetSize));
  const fallbackWeight = 256 * 1024;
  const weights = measured.map((size) => size > 0 ? size : fallbackWeight);
  const totalWeight = weights.reduce((sum, size) => sum + size, 0) || assets.length;
  let completedWeight = 0;

  for (let index = 0; index < assets.length; index += 1) {
    const url = assets[index];
    const weight = weights[index];

    try {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) throw new Error("asset-download-failed");

      const contentLength = Number(response.headers.get("content-length")) || measured[index] || 0;
      if (!response.body?.getReader) {
        await response.arrayBuffer();
      } else {
        const reader = response.body.getReader();
        let fileBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fileBytes += value?.byteLength || 0;
          const fileRatio = contentLength > 0
            ? Math.min(fileBytes / contentLength, 0.985)
            : 0.45;
          const ratio = Math.min((completedWeight + (weight * fileRatio)) / totalWeight, 0.985);
          onProgress(Math.round(8 + (ratio * 76)));
        }
      }
    } catch {
      // A single asset must never prevent the release from being applied.
    }

    completedWeight += weight;
    const ratio = Math.min(completedWeight / totalWeight, 1);
    onProgress(Math.round(8 + (ratio * 76)));
  }

  onProgress(84);
}

function waitForInstalledWorker(registration, timeoutMs = 5500) {
  if (!registration) return Promise.resolve(null);
  if (registration.waiting) return Promise.resolve(registration.waiting);
  const worker = registration.installing;
  if (!worker) return Promise.resolve(null);
  if (worker.state === "installed") return Promise.resolve(registration.waiting || worker);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      worker.removeEventListener("statechange", changed);
      window.clearTimeout(timeout);
      resolve(value);
    };
    const changed = () => {
      if (worker.state === "installed") finish(registration.waiting || worker);
      if (worker.state === "redundant") finish(null);
    };
    const timeout = window.setTimeout(() => finish(registration.waiting || null), timeoutMs);
    worker.addEventListener("statechange", changed);
  });
}

function readInstalledNotice() {
  try {
    const value = sessionStorage.getItem(APPLIED_NOTICE_KEY);
    if (!value) return null;
    sessionStorage.removeItem(APPLIED_NOTICE_KEY);
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function AppUpdateManager() {
  const registrationRef = useRef(null);
  const reloadRequestedRef = useRef(false);
  const [release, setRelease] = useState(null);
  const [applying, setApplying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Prête à être installée");
  const [installedNotice, setInstalledNotice] = useState(readInstalledNotice);

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
    if (!installedNotice) return undefined;
    const timer = window.setTimeout(() => setInstalledNotice(null), 4600);
    return () => window.clearTimeout(timer);
  }, [installedNotice]);

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
    if (applying || !release) return;
    setApplying(true);
    setProgress(3);
    setPhase("Préparation de la nouvelle version…");

    try {
      setProgress(8);
      setPhase("Téléchargement sécurisé…");
      await prefetchLatestBuild(setProgress);
    } catch {
      setProgress((value) => Math.max(value, 78));
    }

    setPhase("Installation sur ton appareil…");
    setProgress((value) => Math.max(value, 88));
    reloadRequestedRef.current = true;

    let waitingWorker = null;
    try {
      const registration = registrationRef.current || await navigator.serviceWorker.getRegistration("/");
      await registration?.update();
      waitingWorker = await waitForInstalledWorker(registration);
    } catch {
      // Reload below still revalidates index.html and Vite's hashed assets.
    }

    setProgress(97);
    setPhase("Finalisation…");

    try {
      sessionStorage.setItem(APPLIED_NOTICE_KEY, JSON.stringify({
        buildId: release.buildId,
        version: release.version,
      }));
    } catch {
      // Confirmation is cosmetic and must not block the update.
    }

    await sleep(260);
    setProgress(100);
    setPhase("Mise à jour installée · redémarrage…");
    await sleep(220);

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => window.location.reload(), 1200);
      return;
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

  if ((!release || dismissed) && installedNotice) {
    return (
      <div className="threeb-update-installed" role="status" aria-live="polite">
        <span className="threeb-update-installed-mark" aria-hidden="true">3B</span>
        <span>
          <strong>Mise à jour installée</strong>
          <small>3B est maintenant à jour.</small>
        </span>
      </div>
    );
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
      className={`threeb-update-shell${mandatory ? " is-mandatory" : ""}${applying ? " is-applying" : ""}`}
      role="dialog"
      aria-modal={mandatory ? "true" : undefined}
      aria-live={mandatory ? "assertive" : "polite"}
      aria-labelledby="threeb-update-title"
    >
      <section className="threeb-update-panel">
        <div className="threeb-update-grid" aria-hidden="true" />
        <div className="threeb-update-glow" aria-hidden="true" />

        <div className="threeb-update-visual" style={{ "--update-progress": `${progress}%` }}>
          <div className="threeb-update-mark" aria-label={applying ? `Progression ${progress}%` : "3B"}>
            <span className="threeb-update-mark-outline" aria-hidden="true">3B</span>
            <span className="threeb-update-mark-fill" aria-hidden="true">3B</span>
            {applying && <i className="threeb-update-frontier" aria-hidden="true" />}
          </div>
          <div className="threeb-update-progress-copy">
            <strong>{applying ? `${progress}%` : "NOUVEAU"}</strong>
            <span>{applying ? phase : "Une nouvelle version t’attend"}</span>
          </div>
        </div>

        <p className="threeb-update-kicker">
          {mandatory ? "MISE À JOUR REQUISE" : "NOUVELLE VERSION 3B DISPONIBLE"}
        </p>
        <h2 id="threeb-update-title">
          {mandatory ? "Mise à jour 3B obligatoire" : "Une nouvelle version de 3B est prête"}
        </h2>
        <p className="threeb-update-copy">
          Téléchargement, installation et redémarrage contrôlés depuis l’application.
        </p>
        <p className="threeb-update-version">
          Installée&nbsp;: {CURRENT_VERSION} · {currentBuildLabel}<br />
          Nouvelle&nbsp;: {targetLabel}
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
            {applying ? "INSTALLATION EN COURS…" : "INSTALLER LA MISE À JOUR"}
          </Button>
          {!mandatory && !applying && (
            <Button
              className="threeb-update-secondary"
              variant="ghost"
              size="lg"
              onClick={dismissUpdate}
            >
              Plus tard
            </Button>
          )}
        </div>
        <p className="threeb-update-safe">
          Ton Passeport, tes XP, tes Coins et tes données sont conservés.
        </p>
      </section>
    </div>
  );
}
