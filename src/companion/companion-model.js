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
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
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
    case COMPANION_MODES.SLEEP: return 15000;
    case COMPANION_MODES.SIT: return 10000;
    case COMPANION_MODES.WALK: return 4200;
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
    reward: "Récompense obtenue",
    guardian: "Je veille sur ton 3B",
    support: "Toujours avec toi",
  })[mode] || "Toujours avec toi";
}

const WANDER_POINTS = [82, 68, 20, 42, 76, 56, 15, 34, 88];
const EVENT_PRIORITY = Object.freeze({
  secret: 100, reward: 90, celebrate: 80, notification: 60,
  guardian: 40, support: 30, wake: 20, sleep: 20, sit: 10, walk: 0,
});
const EVENT_COOLDOWN_MS = 10000;
const QUEUE_TTL_MS = 12000;
const MAX_QUEUE = 3;

function baselineMode(state, now) {
  const mode = contextDrivenMode({ ...state.context, date: new Date(now) });
  // Clock and morning greetings are short reactions, never permanent loops.
  return mode === COMPANION_MODES.CLOCK || mode === COMPANION_MODES.WAKE
    ? COMPANION_MODES.IDLE : mode;
}

function wanderDelay(state) {
  return state.prefs.batterySaver ? 26000 : 16000;
}

export function companionMotionAllowed(state) {
  return state.prefs.enabled && state.environment.visible && !state.environment.paused
    && !state.environment.reducedMotion && !state.environment.lowPower
    && !state.prefs.reducedPresence;
}

function mayWander(state, now) {
  return companionMotionAllowed(state) && baselineMode(state, now) === COMPANION_MODES.IDLE;
}

function displayMode(state, now) {
  if (!state.prefs.enabled || !state.environment.visible) {
    return timeDrivenMode(new Date(now)) === COMPANION_MODES.SLEEP
      ? COMPANION_MODES.SLEEP : COMPANION_MODES.SIT;
  }
  return state.activity?.mode || baselineMode(state, now);
}

function finish(state, now) {
  return { ...state, now, mode: displayMode(state, now) };
}

function startWalk(state, now) {
  const wanderIndex = state.wanderIndex + 1;
  const x = WANDER_POINTS[wanderIndex % WANDER_POINTS.length];
  return {
    ...state, wanderIndex, x, facing: x < state.x ? -1 : 1,
    activity: { kind: "walk", mode: COMPANION_MODES.WALK, priority: 0, until: now + 4200 },
    nextWanderAt: now + wanderDelay(state),
  };
}

function clockReaction(state, now) {
  const date = new Date(now);
  const mode = timeDrivenMode(date);
  if (mode !== COMPANION_MODES.CLOCK && mode !== COMPANION_MODES.WAKE) return state;
  // The :58 to :02 window belongs to one hour, including a midnight rollover.
  const clockDate = new Date(now);
  if (mode === COMPANION_MODES.CLOCK && date.getMinutes() >= 58) {
    clockDate.setHours(clockDate.getHours() + 1);
  }
  const token = `${mode}:${clockDate.getFullYear()}-${clockDate.getMonth()}-${clockDate.getDate()}:${mode === COMPANION_MODES.WAKE ? "morning" : clockDate.getHours()}`;
  if (state.clockToken === token) return state;
  const next = { ...state, clockToken: token };
  if (state.activity || baselineMode(state, now) !== COMPANION_MODES.IDLE) return next;
  return {
    ...next,
    activity: { kind: "clock", mode, priority: 5, until: now + modeDurationMs(mode) },
    nextWanderAt: now + wanderDelay(state),
  };
}

function reconcile(state, now, allowWander = false) {
  let next = {
    ...state,
    recent: state.recent.filter((item) => item.until > now),
    queue: state.queue.filter((item) => item.expiresAt > now),
  };
  if (!next.prefs.enabled || !next.environment.visible) {
    return finish({ ...next, activity: null, queue: [], nextWanderAt: now + wanderDelay(next) }, now);
  }

  if (next.activity?.until <= now || (next.activity?.kind === "walk" && !mayWander(next, now))) {
    next.activity = null;
    next.nextWanderAt = now + wanderDelay(next);
  }
  if (baselineMode(next, now) === COMPANION_MODES.SECRET && next.activity?.priority < EVENT_PRIORITY.secret) {
    next.activity = null;
  }
  if (!next.activity && next.queue.length && baselineMode(next, now) !== COMPANION_MODES.SECRET) {
    const [event, ...queue] = [...next.queue].sort((a, b) => b.priority - a.priority || a.receivedAt - b.receivedAt);
    next = {
      ...next, queue,
      activity: { kind: "event", mode: event.mode, priority: event.priority, until: now + modeDurationMs(event.mode) },
      nextWanderAt: now + wanderDelay(next),
    };
  }
  next = clockReaction(next, now);
  if (allowWander && !next.activity && mayWander(next, now) && now >= next.nextWanderAt) {
    next = startWalk(next, now);
  }
  return finish(next, now);
}

/** Pure state machine. All deadlines use the action's wall-clock timestamp. */
export function createCompanionState({ prefs, context = {}, environment = {}, now = Date.now() } = {}) {
  return reconcile({
    prefs: sanitizeCompanionPrefs(prefs),
    context: { page: context.page, secretPhase: context.secretPhase, memberRegistered: context.memberRegistered === true },
    environment: { visible: true, lowPower: false, reducedMotion: false, paused: false, online: true, ...environment },
    activity: null,
    queue: [],
    recent: [],
    clockToken: null,
    x: 82,
    facing: -1,
    wanderIndex: 0,
    nextWanderAt: now + (prefs?.batterySaver === false ? 16000 : 26000),
    now,
  }, now);
}

function receiveEvent(state, action, now) {
  const mode = eventToMode(action.eventType);
  // Unknown event names cannot dismiss a real reward or current context.
  if (mode === COMPANION_MODES.IDLE || !state.prefs.enabled || !state.environment.visible) return state;
  if (mode === COMPANION_MODES.WALK) {
    return !state.activity && mayWander(state, now) ? startWalk(state, now) : state;
  }
  const eventId = action.detail?.id ?? action.detail?.eventId;
  const key = typeof eventId === "string" || typeof eventId === "number"
    ? `${mode}:${String(eventId).slice(0, 128)}` : mode;
  if (state.activity?.mode === mode || state.queue.some((item) => item.mode === mode)
    || state.recent.some((item) => item.key === key && item.until > now)) return state;

  const priority = EVENT_PRIORITY[mode] || 0;
  const next = { ...state, recent: [...state.recent, { key, until: now + EVENT_COOLDOWN_MS }].slice(-32) };
  const contextualPriority = baselineMode(next, now) === COMPANION_MODES.SECRET ? EVENT_PRIORITY.secret : 0;
  if (priority >= contextualPriority && (!next.activity || priority > next.activity.priority)) {
    return {
      ...next,
      activity: { kind: "event", mode, priority, until: now + modeDurationMs(mode) },
      nextWanderAt: now + wanderDelay(next),
    };
  }
  // One pending reaction per mode, at most three, and no stale replay after a tab resumes.
  return {
    ...next,
    queue: [...next.queue, { mode, priority, receivedAt: now, expiresAt: now + QUEUE_TTL_MS }]
      .sort((a, b) => b.priority - a.priority || a.receivedAt - b.receivedAt).slice(0, MAX_QUEUE),
  };
}

export function companionReducer(state, action) {
  const now = Number.isFinite(action.now) ? action.now : state.now;
  let next = state;
  if (now < state.now) {
    // A device clock correction must not trap a reaction for hours.
    const offset = now - state.now;
    next = {
      ...state,
      activity: state.activity ? { ...state.activity, until: state.activity.until + offset } : null,
      queue: state.queue.map((item) => ({ ...item, receivedAt: item.receivedAt + offset, expiresAt: item.expiresAt + offset })),
      recent: state.recent.map((item) => ({ ...item, until: item.until + offset })),
      nextWanderAt: state.nextWanderAt + offset,
    };
  }
  switch (action.type) {
    case "sync": {
      const wasAllowed = companionMotionAllowed(next);
      next = {
        ...next,
        prefs: action.prefs ? sanitizeCompanionPrefs(action.prefs) : next.prefs,
        context: action.context ? { ...next.context, ...action.context } : next.context,
        environment: action.environment ? { ...next.environment, ...action.environment } : next.environment,
      };
      if (wasAllowed !== companionMotionAllowed(next) || action.context || action.prefs) {
        next.nextWanderAt = now + wanderDelay(next);
      }
      return reconcile(next, now);
    }
    case "event":
      return finish(receiveEvent(reconcile(next, now), action, now), now);
    case "position": {
      if (!Number.isFinite(action.x)) return state;
      const x = Math.min(100, Math.max(0, action.x));
      return reconcile({
        ...next, x, facing: x === next.x ? next.facing : x < next.x ? -1 : 1,
        activity: next.activity?.kind === "walk" ? null : next.activity,
        nextWanderAt: now + wanderDelay(next),
      }, now);
    }
    case "tick":
      return reconcile(next, now, true);
    default:
      return state;
  }
}

/** One timer is enough: a reaction deadline, the next stroll, or the next minute. */
export function nextCompanionDeadline(state) {
  if (!state.prefs.enabled || !state.environment.visible) return null;
  const nextMinute = Math.floor(state.now / 60000) * 60000 + 60000;
  const deadlines = [nextMinute];
  if (state.activity) deadlines.push(state.activity.until);
  if (!state.activity && mayWander(state, state.now)) deadlines.push(state.nextWanderAt);
  return Math.max(state.now + 16, Math.min(...deadlines));
}
