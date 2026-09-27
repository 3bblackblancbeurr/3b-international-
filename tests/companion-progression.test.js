import test from "node:test";
import assert from "node:assert/strict";
import { createCompanionArrivalTracker, createCompanionProgressionTracker } from "../src/companion/progression.js";
import { createSnapshotGate } from "../src/loyalty/session-state.js";
import { companionReducer, createCompanionState } from "../src/companion/companion-model.js";

const profile = (xp, user_id = "member-a") => ({ user_id, xp });
const owner = { userId: "member-a", generation: 1 };

test("initial account loading and progress within the same tier never celebrate", () => {
  const tracker = createCompanionProgressionTracker();
  assert.equal(tracker.observe(profile(1500), owner), null);
  assert.equal(tracker.observe(profile(1900), owner), null);
  assert.equal(tracker.observe(profile(1900), owner), null);
  assert.equal(tracker.observe(profile(4999), owner), null);
  assert.deepEqual(tracker.observe(profile(5000), owner), { source: "xp-level", id: "xp-level:ambassador", tier: "ambassador" });
});

test("an accepted tier crossing celebrates once despite replays or older snapshots", () => {
  const tracker = createCompanionProgressionTracker();
  tracker.observe(profile(299), owner);
  assert.equal(tracker.observe(profile(300), owner)?.tier, "explorer");
  assert.equal(tracker.observe(profile(300), owner), null);
  assert.equal(tracker.observe(profile(100), owner), null);
  assert.equal(tracker.observe(profile(350), owner), null);
  assert.equal(tracker.observe(profile(12000), owner)?.tier, "legend");
});

test("account switches and a fresh login establish a new silent baseline", () => {
  const tracker = createCompanionProgressionTracker();
  tracker.observe(profile(299), owner);
  assert.equal(tracker.observe(profile(1500, "member-b"), { userId: "member-b", generation: 2 }), null);
  assert.equal(tracker.observe(profile(5000), { ...owner, generation: 3 }), null);
  assert.equal(tracker.observe(profile(12000), { ...owner, generation: 3 })?.tier, "legend");
});

test("invalid and foreign profile data cannot cause or suppress a tier crossing", () => {
  const tracker = createCompanionProgressionTracker();
  tracker.observe(profile(299), owner);
  for (const xp of [null, undefined, -1, Infinity, NaN, {}, "", "1e6", 400.5]) {
    assert.equal(tracker.observe(profile(xp), owner), null);
  }
  assert.equal(tracker.observe(profile(60000, "member-b"), owner), null);
  assert.equal(tracker.observe(profile("300"), owner)?.tier, "explorer");
});

test("snapshot ownership gate keeps delayed requests from creating progress reactions", () => {
  const gate = createSnapshotGate();
  const tracker = createCompanionProgressionTracker();
  gate.setUser("member-a");
  const current = gate.accountTicket();
  const accept = (result, ticket) => gate.accept(result, ticket) ? tracker.observe(result.profile, ticket) : null;
  assert.equal(accept({ profile: profile(299) }, current), null);
  gate.setUser("member-b");
  gate.setUser("member-a");
  assert.equal(accept({ profile: profile(5000) }, current), null);
  assert.equal(accept({ profile: profile(300) }, gate.accountTicket()), null);
});

test("tier celebration queues after the earned reward and then becomes visible", () => {
  const now = new Date("2026-09-27T14:20:00").getTime();
  let state = createCompanionState({ now, context: { page: "games", memberRegistered: true } });
  state = companionReducer(state, { type: "event", eventType: "reward", now });
  state = companionReducer(state, { type: "event", eventType: "celebrate", detail: { source: "xp-level" }, now });
  assert.equal(state.mode, "reward");
  state = companionReducer(state, { type: "tick", now: state.activity.until });
  assert.equal(state.mode, "celebrate");
});

test("notification arrival tracking suppresses initial rows, repeated polls and reordering", () => {
  const tracker = createCompanionArrivalTracker();
  assert.deepEqual(tracker.observe(["old-1", "old-2"]), []);
  assert.deepEqual(tracker.observe(["old-2", "old-1"]), []);
  assert.deepEqual(tracker.observe(["new-1", "new-1", "old-2"]), ["new-1"]);
  assert.deepEqual(tracker.observe(["old-1", "new-1", "old-2"]), []);
});

test("empty successful baseline can be followed by genuinely new notifications", () => {
  const tracker = createCompanionArrivalTracker();
  assert.deepEqual(tracker.observe(undefined), []);
  assert.deepEqual(tracker.observe([]), []);
  assert.deepEqual(tracker.observe([null, "", "order-1"]), ["order-1"]);
  assert.deepEqual(tracker.observe(["order-1"]), []);
});
