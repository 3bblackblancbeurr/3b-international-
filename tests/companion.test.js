import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPANION_MODES,
  companionMotionAllowed,
  companionReducer,
  createCompanionState,
  contextDrivenMode,
  eventToMode,
  modeDurationMs,
  nextCompanionDeadline,
  sanitizeCompanionPrefs,
  timeDrivenMode,
} from "../src/companion/companion-model.js";

test("night hours put the companion to sleep", () => {
  const date = new Date("2026-09-27T02:15:00");
  assert.equal(timeDrivenMode(date), COMPANION_MODES.SLEEP);
});

const MIDDAY = new Date("2026-09-27T14:20:00").getTime();
const makeState = (options = {}) => createCompanionState({
  now: MIDDAY,
  context: { page: "games", memberRegistered: true },
  ...options,
});
const tick = (state, now) => companionReducer(state, { type: "tick", now });
const event = (state, eventType, now = state.now, detail) => companionReducer(state, { type: "event", eventType, now, detail });
const sync = (state, patch, now = state.now) => companionReducer(state, { type: "sync", now, ...patch });

test("malformed stored preferences cannot break startup or enable native services", () => {
  for (const input of [null, [], "enabled", 7, false]) {
    const prefs = sanitizeCompanionPrefs(input);
    assert.equal(prefs.enabled, true);
    assert.equal(prefs.androidOverlayEnabled, false);
    assert.equal(prefs.iosLiveActivityEnabled, false);
  }
  const prefs = sanitizeCompanionPrefs({ androidOverlayEnabled: "true", iosLiveActivityEnabled: 1 });
  assert.equal(prefs.androidOverlayEnabled, false);
  assert.equal(prefs.iosLiveActivityEnabled, false);
});

test("visiting the shop never invents an earned reward", () => {
  assert.equal(contextDrivenMode({ page: "shop", date: new Date(MIDDAY) }), COMPANION_MODES.IDLE);
});

test("real reward survives navigation and restores the latest page context", () => {
  let state = event(makeState(), "reward");
  const expires = state.activity.until;
  state = sync(state, { context: { page: "passport" } }, MIDDAY + 1000);
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  assert.equal(state.activity.until, expires);
  state = tick(state, expires);
  assert.equal(state.mode, COMPANION_MODES.GUARDIAN);
  state = sync(state, { context: { page: "games" } }, expires + 100);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
});

test("a scheduled stroll cannot interrupt a celebration or page guardian", () => {
  let state = event(makeState(), "win", MIDDAY + 25000);
  state = tick(state, MIDDAY + 26000);
  assert.equal(state.mode, COMPANION_MODES.CELEBRATE);
  assert.equal(state.x, 82);
  state = tick(state, MIDDAY + 31200);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
  assert.equal(state.x, 82);
  state = sync(state, { context: { page: "passport" } });
  state = tick(state, MIDDAY + 100000);
  assert.equal(state.mode, COMPANION_MODES.GUARDIAN);
  assert.equal(state.x, 82);
});

test("real events interrupt strolling, while unknown events cannot dismiss them", () => {
  let state = tick(makeState(), MIDDAY + 26000);
  assert.equal(state.mode, COMPANION_MODES.WALK);
  assert.equal(state.facing, -1);
  state = event(state, "reward");
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  const expires = state.activity.until;
  state = event(state, "unknown", state.now + 100);
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  assert.equal(state.activity.until, expires);
});

test("event bursts are coalesced, bounded and do not extend the active reaction", () => {
  let state = event(makeState(), "secret");
  const expires = state.activity.until;
  for (let i = 0; i < 100; i += 1) {
    state = event(state, "secret", MIDDAY + i * 10, { id: `secret-${i}` });
    state = event(state, ["notification", "reward", "support", "celebrate"][i % 4], state.now);
    assert.ok(state.queue.length <= 3);
    assert.ok(state.recent.length <= 32);
  }
  assert.equal(state.activity.until, expires);
  assert.equal(state.queue.filter((entry) => entry.mode === "reward").length, 1);
  state = tick(state, expires);
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  state = tick(state, expires + modeDurationMs(COMPANION_MODES.REWARD));
  assert.equal(state.mode, COMPANION_MODES.IDLE);
  assert.deepEqual(state.queue, []);
});

test("low priority notifications wait for celebrations without replacing them", () => {
  let state = event(makeState(), "win");
  state = event(state, "notification", MIDDAY + 200);
  assert.equal(state.mode, COMPANION_MODES.CELEBRATE);
  assert.equal(state.queue.length, 1);
  state = tick(state, MIDDAY + modeDurationMs("celebrate"));
  assert.equal(state.mode, COMPANION_MODES.NOTIFICATION);
  state = tick(state, state.activity.until);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
});

test("the Secret page keeps priority and queued rewards expire instead of replaying late", () => {
  let state = makeState({ context: { page: "home", secretPhase: "open", memberRegistered: true } });
  state = event(state, "reward");
  assert.equal(state.mode, COMPANION_MODES.SECRET);
  assert.equal(state.queue.length, 1);
  state = sync(state, { context: { secretPhase: "closed" } }, MIDDAY + 20000);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
  assert.deepEqual(state.queue, []);
});

test("hiding or disabling the companion clears reactions and all scheduled work", () => {
  for (const patch of [{ environment: { visible: false } }, { prefs: { enabled: false } }]) {
    let state = event(makeState(), "reward");
    state = event(state, "notification");
    state = sync(state, patch, MIDDAY + 1000);
    const x = state.x;
    assert.equal(state.activity, null);
    assert.deepEqual(state.queue, []);
    assert.equal(nextCompanionDeadline(state), null);
    assert.equal(companionMotionAllowed(state), false);
    state = event(state, "celebrate", MIDDAY + 2000);
    state = tick(state, MIDDAY + 120000);
    assert.equal(state.x, x);
    assert.equal(state.activity, null);
  }
});

test("resuming a hidden tab waits before walking and cannot replay hidden events", () => {
  let state = sync(makeState(), { environment: { visible: false } });
  state = event(state, "reward", MIDDAY + 1000);
  state = sync(state, { environment: { visible: true } }, MIDDAY + 120000);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
  assert.equal(state.activity, null);
  assert.equal(state.x, 82);
  state = tick(state, state.now + 1000);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
});

test("motion policy prevents position changes and interrupts ongoing strolling", () => {
  for (const patch of [
    { environment: { reducedMotion: true } },
    { environment: { lowPower: true } },
    { environment: { paused: true } },
    { prefs: { reducedPresence: true } },
  ]) {
    let state = tick(makeState(), MIDDAY + 26000);
    assert.equal(state.mode, COMPANION_MODES.WALK);
    state = sync(state, patch, MIDDAY + 26100);
    const x = state.x;
    assert.equal(state.mode, COMPANION_MODES.IDLE);
    assert.equal(companionMotionAllowed(state), false);
    state = tick(state, MIDDAY + 120000);
    state = event(state, "walk");
    assert.equal(state.x, x);
    assert.notEqual(state.mode, COMPANION_MODES.WALK);
  }
});

test("manual position is bounded, stops strolling, and preserves meaningful reactions", () => {
  let state = tick(makeState(), MIDDAY + 26000);
  state = companionReducer(state, { type: "position", x: 200, now: MIDDAY + 27000 });
  assert.equal(state.x, 100);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
  assert.equal(state.facing, 1);
  state = event(state, "reward");
  state = companionReducer(state, { type: "position", x: -20, now: MIDDAY + 28000 });
  assert.equal(state.x, 0);
  assert.equal(state.facing, -1);
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  assert.equal(companionReducer(state, { type: "position", x: NaN, now: state.now }), state);
});

test("clock and wake reactions occur once per time window and finish", () => {
  for (const at of ["2026-09-27T14:58:00", "2026-09-27T06:01:00"]) {
    const now = new Date(at).getTime();
    let state = makeState({ now });
    const mode = state.mode;
    assert.ok(mode === COMPANION_MODES.CLOCK || mode === COMPANION_MODES.WAKE);
    state = tick(state, now + modeDurationMs(mode));
    assert.equal(state.mode, COMPANION_MODES.IDLE);
    state = tick(state, now + 10000);
    assert.equal(state.mode, COMPANION_MODES.IDLE);
  }
});

test("sleep returns after a real night reward and forbids autonomous motion", () => {
  const now = new Date("2026-09-27T02:15:00").getTime();
  let state = makeState({ now });
  assert.equal(state.mode, COMPANION_MODES.SLEEP);
  state = event(state, "reward");
  assert.equal(state.mode, COMPANION_MODES.REWARD);
  state = tick(state, state.activity.until);
  assert.equal(state.mode, COMPANION_MODES.SLEEP);
  state = tick(state, now + 120000);
  assert.equal(state.x, 82);
  assert.equal(state.mode, COMPANION_MODES.SLEEP);
});

test("device clock moving backwards cannot freeze a reaction deadline", () => {
  let state = event(makeState(), "reward");
  const correctedNow = MIDDAY - 3600000;
  state = tick(state, correctedNow);
  assert.equal(state.activity.until, correctedNow + modeDurationMs("reward"));
  state = tick(state, state.activity.until);
  assert.equal(state.mode, COMPANION_MODES.IDLE);
});

test("the companion watches the clock around the hour", () => {
  const date = new Date("2026-09-27T12:59:00");
  assert.equal(timeDrivenMode(date), COMPANION_MODES.CLOCK);
});

test("Secret 3B has priority over the current page", () => {
  const mode = contextDrivenMode({
    date: new Date("2026-09-27T14:20:00"),
    secretPhase: "open",
    page: "shop",
    memberRegistered: true,
  });
  assert.equal(mode, COMPANION_MODES.SECRET);
});

test("passport and account routes switch to guardian mode", () => {
  assert.equal(contextDrivenMode({
    date: new Date("2026-09-27T14:20:00"),
    page: "passport",
    memberRegistered: true,
  }), COMPANION_MODES.GUARDIAN);
});

test("events map to safe known modes", () => {
  assert.equal(eventToMode("win"), COMPANION_MODES.CELEBRATE);
  assert.equal(eventToMode("reward"), COMPANION_MODES.REWARD);
  assert.equal(eventToMode("unknown"), COMPANION_MODES.IDLE);
});

test("preferences only accept explicit boolean choices", () => {
  assert.deepEqual(sanitizeCompanionPrefs({
    enabled: false,
    quiet: false,
    batterySaver: false,
    reducedPresence: true,
    androidOverlayEnabled: true,
    iosLiveActivityEnabled: true,
  }), {
    enabled: false,
    quiet: false,
    batterySaver: false,
    reducedPresence: true,
    androidOverlayEnabled: true,
    iosLiveActivityEnabled: true,
  });
});
