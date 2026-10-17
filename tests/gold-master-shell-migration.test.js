import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const compact = readFileSync("src/components/CompactCard.jsx", "utf8");
const home = readFileSync("src/components/HomePage.jsx", "utf8");
const world = readFileSync("src/components/WorldPortalCard.jsx", "utf8");
const design = readFileSync("src/design-system/index.jsx", "utf8");
const css = readFileSync("src/styles/gold-master.css", "utf8");
const app = readFileSync("src/App.jsx", "utf8");

test("CompactCard composes the shared Gold Master Card", () => {
  assert.ok(compact.includes("import {Card}"));
  assert.ok(compact.includes("<Card as={Tag}"));
});

test("immersive home uses shared Gold Master Buttons for its principal actions", () => {
  const scene=readFileSync("src/components/ImmersiveWorldHome.jsx","utf8");
  assert.match(home,/ImmersiveWorldHome/);
  assert.match(scene,/import \{Button\} from '\.\.\/design-system\/index\.jsx'/);
  assert.match(scene,/<Button variant="ghost" type="button" className="th-world-menu-launch"/);
  assert.match(scene,/<Button variant="ghost" type="button" className="th-world-explore"/);
});

test("World portal actions use the shared Gold Master Button", () => {
  assert.match(world, /import\s*\{\s*Button\s*\}\s*from\s*['"]\.\.\/design-system\/index\.jsx['"]/);
  assert.ok(world.includes("as={RouteLink}"));
  assert.ok(world.includes('className="surface-button"'));
  assert.equal(world.includes("<button"), false);
});

test("shared primitives can preserve existing semantic tags", () => {
  assert.ok(design.includes('as: Tag = "button"'));
  assert.ok(design.includes('as: Tag = "section"'));
});

test("shell overrides consume canonical tokens", () => {
  for (const token of ["--3b-champagne", "--3b-matrix", "--3b-border", "--3b-radius-card", "--3b-radius-hero"]) {
    assert.ok(css.includes(`var(${token})`));
  }
});


test("Passport access uses the shared Gold Master Button", () => {
  assert.ok(app.includes('import { Button } from "./design-system/index.jsx";'));
  assert.ok(app.includes('<Button variant="champagne" className="primary-button"'));
  assert.ok(app.includes('<Button variant="ghost" className="ghost-button"'));
});
