import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPANION_MODES,
  contextDrivenMode,
  eventToMode,
  sanitizeCompanionPrefs,
  timeDrivenMode,
} from "../src/companion/companion-model.js";

test("night hours put the companion to sleep", () => {
  const date = new Date("2026-09-27T02:15:00");
  assert.equal(timeDrivenMode(date), COMPANION_MODES.SLEEP);
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
  }), {
    enabled: false,
    quiet: false,
    batterySaver: false,
    reducedPresence: true,
  });
});
