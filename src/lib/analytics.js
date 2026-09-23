const DEFAULT_POSTHOG_PROJECT_TOKEN = "phc_rMapCkE5ZQoM6TTAefPrc6DDPcSAQ7MsLfY2UicghUNE";
const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

const projectToken = String(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN || DEFAULT_POSTHOG_PROJECT_TOKEN).trim();
const ingestionHost = String(import.meta.env.VITE_POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");

const ALLOWED_EVENTS = new Set(["3b_app_open", "3b_route_view"]);
const SENSITIVE_PROPERTY_PATTERN = /(^|[_-])(email|e-mail|name|full_name|first_name|last_name|user_id|member_id|account_id|handle|username|password|passcode|token|secret|phone|address|birth|dob|ip)([_-]|$)/i;

let sessionDistinctId = "";
let lastRouteKey = "";
let lastRouteAt = 0;

function privacySignalEnabled() {
  if (typeof navigator === "undefined") return true;
  const dnt = navigator.doNotTrack || globalThis.doNotTrack || navigator.msDoNotTrack;
  return navigator.globalPrivacyControl === true || dnt === "1" || dnt === "yes";
}

function getSessionDistinctId() {
  if (sessionDistinctId) return sessionDistinctId;
  if (globalThis.crypto?.randomUUID) {
    sessionDistinctId = `3b-session-${globalThis.crypto.randomUUID()}`;
  } else {
    sessionDistinctId = `3b-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
  return sessionDistinctId;
}

function safeLocationProperties() {
  if (typeof window === "undefined") return {};
  return {
    $current_url: `${window.location.origin}${window.location.pathname}`,
    $host: window.location.host,
    $pathname: window.location.pathname,
  };
}

function safeReferrerOrigin() {
  if (typeof document === "undefined" || !document.referrer) return "";
  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

function cleanProperties(properties) {
  const clean = {};
  for (const [key, value] of Object.entries(properties || {})) {
    if (SENSITIVE_PROPERTY_PATTERN.test(key)) continue;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) clean[key] = value;
  }
  return clean;
}

export function capture3BEvent(event, properties = {}) {
  const normalizedEvent = String(event || "").trim();
  if (typeof window === "undefined" || !projectToken || privacySignalEnabled() || !ALLOWED_EVENTS.has(normalizedEvent)) return false;

  const payload = {
    api_key: projectToken,
    event: normalizedEvent,
    distinct_id: getSessionDistinctId(),
    properties: {
      $process_person_profile: false,
      app_name: "3B International",
      app_surface: "web",
      ...safeLocationProperties(),
      ...cleanProperties(properties),
    },
  };

  fetch(`${ingestionHost}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});

  return true;
}

export function captureAppOpen() {
  return capture3BEvent("3b_app_open", {
    referrer_origin: safeReferrerOrigin(),
  });
}

export function captureRouteView({ page = "unknown", gameSlug = "" } = {}) {
  const now = Date.now();
  const routeKey = `${page}:${gameSlug}`;
  if (routeKey === lastRouteKey && now - lastRouteAt < 1200) return false;
  lastRouteKey = routeKey;
  lastRouteAt = now;

  return capture3BEvent("3b_route_view", {
    page: String(page || "unknown").slice(0, 80),
    game_slug: gameSlug ? String(gameSlug).slice(0, 80) : "",
  });
}
