import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("src/control/ControlCenterPage.jsx", "utf8");
const css = readFileSync("src/styles/gold-master.css", "utf8");

test("Command OS exposes the four Gold Master global states", () => {
  for (const state of ["NOMINAL", "ATTENTION", "ACTION", "CRITICAL"]) assert.ok(source.includes(state));
});

test("Command OS overview is rendered before Albert detail workspace", () => {
  const overview = source.indexOf("<CommandOverview");
  const albert = source.indexOf("<AlbertWorkspace");
  assert.ok(overview >= 0);
  assert.ok(albert > overview);
});

test("critical state is derived from verified production/control API faults", () => {
  assert.ok(source.includes("['production','control-api'].includes(alert.key)"));
});

test("overview explicitly refuses to invent unverified OK states", () => {
  assert.ok(source.includes("n’est jamais affichée comme « OK »"));
});

test("Command OS overview consumes shared Gold Master primitives", () => {
  for (const item of ["<Card", "<Badge", "<Stat"]) assert.ok(source.includes(item));
  assert.ok(css.includes(".command-overview"));
  assert.ok(css.includes("var(--3b-border)"));
});
