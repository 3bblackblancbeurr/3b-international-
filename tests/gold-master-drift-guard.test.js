import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guard = readFileSync("scripts/verify-gold-master-diff.mjs", "utf8");

test("Gold Master drift guard protects new UI code", () => {
  assert.ok(guard.includes("new hard-coded color"));
  assert.ok(guard.includes("new raw <button>"));
  assert.ok(guard.includes("new raw <video>"));
  assert.ok(guard.includes("new literal border-radius"));
  assert.ok(guard.includes("new literal box-shadow"));
});

test("reviewed exceptions require an explicit marker", () => {
  assert.ok(guard.includes("gold-master-allow"));
});
