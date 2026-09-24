import test from "node:test";
import assert from "node:assert/strict";
import {
  getCountdownParts,
  getSyncOffsetSeconds,
  normalizeSchedule,
  programsForLocalDay,
  resolveBroadcastState,
} from "../src/tv/originsTvSchedule.js";

test("empty schedule stays in prelaunch", () => {
  const state = resolveBroadcastState(normalizeSchedule(), new Date("2026-09-25T10:00:00Z"));
  assert.equal(state.status, "prelaunch");
});

test("future program keeps antenna closed and exposes next", () => {
  const schedule = normalizeSchedule({
    channel: { status: "ready" },
    programs: [{ id: "p1", startAt: "2026-09-25T20:00:00Z", endAt: "2026-09-25T21:00:00Z" }],
  });
  const state = resolveBroadcastState(schedule, new Date("2026-09-25T19:00:00Z"));
  assert.equal(state.status, "closed");
  assert.equal(state.next.id, "p1");
});

test("program window becomes live and sync offset follows wall clock", () => {
  const schedule = normalizeSchedule({
    channel: { status: "ready" },
    programs: [{ id: "p1", startAt: "2026-09-25T20:00:00Z", endAt: "2026-09-25T21:00:00Z" }],
  });
  const now = new Date("2026-09-25T20:07:32Z");
  const state = resolveBroadcastState(schedule, now);
  assert.equal(state.status, "live");
  assert.equal(state.current.id, "p1");
  assert.equal(getSyncOffsetSeconds(state.current, now), 452);
});

test("countdown is deterministic", () => {
  assert.deepEqual(
    getCountdownParts("2026-09-26T00:00:00Z", "2026-09-25T22:58:55Z"),
    { totalSeconds: 3665, days: 0, hours: 1, minutes: 1, seconds: 5 }
  );
});

test("daily program selection respects channel timezone", () => {
  const programs = normalizeSchedule({
    programs: [
      { id: "a", startAt: "2026-09-25T20:00:00Z" },
      { id: "b", startAt: "2026-09-26T20:00:00Z" },
    ],
  }).programs;
  const day = programsForLocalDay(programs, new Date("2026-09-25T12:00:00Z"), "Europe/Paris");
  assert.deepEqual(day.map(item => item.id), ["a"]);
});
