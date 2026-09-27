export const COMPANION_MODES = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  SIT: "sit",
  SLEEP: "sleep",
  WAKE: "wake",
  CLOCK: "clock",
  NOTIFICATION: "notification",
  CELEBRATE: "celebrate",
  SECRET: "secret",
  REWARD: "reward",
  GUARDIAN: "guardian",
  SUPPORT: "support",
});

export const TRANSIENT_MODES = new Set([
  COMPANION_MODES.WAKE,
  COMPANION_MODES.CLOCK,
  COMPANION_MODES.NOTIFICATION,
  COMPANION_MODES.CELEBRATE,
  COMPANION_MODES.SECRET,
  COMPANION_MODES.REWARD,
  COMPANION_MODES.GUARDIAN,
  COMPANION_MODES.SUPPORT,
]);

export const DEFAULT_COMPANION_PREFS = Object.freeze({
  enabled: true,
  quiet: true,
  batterySaver: true,
  reducedPresence: false,
  androidOverlayEnabled: false,
  iosLiveActivityEnabled: false,
});

export function sanitizeCompanionPrefs(value = {}) {
  return {
    enabled: value.enabled !== false,
    quiet: value.quiet !== false,
    batterySaver: value.batterySaver !== false,
    reducedPresence: value.reducedPresence === true,
    androidOverlayEnabled: value.androidOverlayEnabled === true,
    iosLiveActivityEnabled: value.iosLiveActivityEnabled === true,
  };
}

export function timeDrivenMode(date = new Date()) {
  const hour = date.getHours();
  const minute = date.getMinutes();

  if (hour >= 1 && hour < 6) return COMPANION_MODES.SLEEP;
  if (hour === 6 && minute < 20) return COMPANION_MODES.WAKE;
  if (minute >= 58 || minute <= 2) return COMPANION_MODES.CLOCK;
  return COMPANION_MODES.IDLE;
}

export function contextDrivenMode({
  date = new Date(),
  secretPhase,
  page,
  memberRegistered = false,
} = {}) {
  if (secretPhase === "open" || secretPhase === "attempt") return COMPANION_MODES.SECRET;
  if (page === "shop") return COMPANION_MODES.REWARD;
  if (page === "passport" || page === "member") return COMPANION_MODES.GUARDIAN;
  if (!memberRegistered && page === "home") return COMPANION_MODES.SUPPORT;
  return timeDrivenMode(date);
}

export function modeDurationMs(mode) {
  switch (mode) {
    case COMPANION_MODES.NOTIFICATION: return 4200;
    case COMPANION_MODES.CELEBRATE: return 6200;
    case COMPANION_MODES.REWARD: return 5600;
    case COMPANION_MODES.SECRET: return 8000;
    case COMPANION_MODES.GUARDIAN: return 5200;
    case COMPANION_MODES.SUPPORT: return 5200;
    case COMPANION_MODES.WAKE: return 7000;
    case COMPANION_MODES.CLOCK: return 4800;
    default: return 0;
  }
}

export function eventToMode(type) {
  switch (type) {
    case "reward": return COMPANION_MODES.REWARD;
    case "celebrate":
    case "win":
    case "success": return COMPANION_MODES.CELEBRATE;
    case "secret": return COMPANION_MODES.SECRET;
    case "guardian": return COMPANION_MODES.GUARDIAN;
    case "support": return COMPANION_MODES.SUPPORT;
    case "notification":
    case "alert": return COMPANION_MODES.NOTIFICATION;
    case "sleep": return COMPANION_MODES.SLEEP;
    case "wake": return COMPANION_MODES.WAKE;
    case "sit": return COMPANION_MODES.SIT;
    case "walk": return COMPANION_MODES.WALK;
    default: return COMPANION_MODES.IDLE;
  }
}

export function companionLabel(mode) {
  return ({
    idle: "Toujours là",
    walk: "Je me promène",
    sit: "Petite pause",
    sleep: "Mode sommeil",
    wake: "Bonjour",
    clock: "Je garde l’heure",
    notification: "Quelque chose arrive",
    celebrate: "Bien joué",
    secret: "Le Secret 3B approche",
    reward: "Une surprise t’attend",
    guardian: "Je veille sur ton 3B",
    support: "Toujours avec toi",
  })[mode] || "Toujours avec toi";
}
