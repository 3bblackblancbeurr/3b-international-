const DEFAULT_CHANNEL = Object.freeze({
  id: "3b-origins-tv",
  name: "3B ORIGINS TV",
  tagline: "La chaîne du Monde du 3B.",
  timezone: "Europe/Paris",
  mode: "scheduled",
  status: "prelaunch",
});

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeProgram(program, index = 0) {
  if (!program || typeof program !== "object") return null;
  const startAt = asDate(program.startAt);
  if (!startAt) return null;
  const endAt = asDate(program.endAt);

  return {
    id: String(program.id || ("program-" + (index + 1))),
    title: String(program.title || "Programme 3B ORIGINS"),
    label: String(program.label || ""),
    startAt: startAt.toISOString(),
    endAt: endAt ? endAt.toISOString() : null,
    poster: program.poster || null,
    source: program.source || null,
    tracks: Array.isArray(program.tracks) ? program.tracks : [],
    metadata: program.metadata && typeof program.metadata === "object" ? program.metadata : {},
  };
}

export function normalizeSchedule(payload = {}) {
  const channel = { ...DEFAULT_CHANNEL, ...(payload.channel || {}) };
  const programs = (Array.isArray(payload.programs) ? payload.programs : [])
    .map(normalizeProgram)
    .filter(Boolean)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  return {
    version: Number(payload.version) || 1,
    updatedAt: payload.updatedAt || null,
    channel,
    programs,
  };
}

export function getProgramWindow(program, nextProgram) {
  const start = asDate(program && program.startAt);
  const explicitEnd = asDate(program && program.endAt);
  const nextStart = asDate(nextProgram && nextProgram.startAt);
  return { start, end: explicitEnd || nextStart || null };
}

export function resolveBroadcastState(scheduleInput, nowInput = new Date()) {
  const schedule = normalizeSchedule(scheduleInput);
  const now = asDate(nowInput) || new Date();
  const nowMs = now.getTime();
  const programs = schedule.programs;

  if (schedule.channel.status === "prelaunch" && programs.length === 0) {
    return { status: "prelaunch", current: null, next: null, now };
  }

  let current = null;
  let next = null;

  for (let index = 0; index < programs.length; index += 1) {
    const program = programs[index];
    const following = programs[index + 1];
    const window = getProgramWindow(program, following);
    if (!window.start) continue;

    if (window.start.getTime() > nowMs) {
      next = program;
      break;
    }

    if (window.end && nowMs >= window.start.getTime() && nowMs < window.end.getTime()) {
      current = program;
      next = following || null;
      break;
    }
  }

  if (!current && !next) {
    next = programs.find(program => new Date(program.startAt).getTime() > nowMs) || null;
  }

  return { status: current ? "live" : "closed", current, next, now };
}

export function getSyncOffsetSeconds(program, nowInput = new Date()) {
  const start = asDate(program && program.startAt);
  const now = asDate(nowInput) || new Date();
  if (!start) return 0;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
}

export function getCountdownParts(targetInput, nowInput = new Date()) {
  const target = asDate(targetInput);
  const now = asDate(nowInput) || new Date();
  if (!target) return null;

  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalSeconds, days, hours, minutes, seconds };
}

export function programsForLocalDay(programs, dateInput = new Date(), timezone = DEFAULT_CHANNEL.timezone) {
  const date = asDate(dateInput) || new Date();
  const key = date.toLocaleDateString("fr-FR", { timeZone: timezone });
  return programs.filter(program => {
    const start = asDate(program.startAt);
    return start && start.toLocaleDateString("fr-FR", { timeZone: timezone }) === key;
  });
}
