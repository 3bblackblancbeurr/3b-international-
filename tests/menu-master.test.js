import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("general menu master uses the real rotating Broken Circle and keeps live navigation", async () => {
  const [navigation, circle, css, app] = await Promise.all([
    readFile(new URL("src/components/AppNavigation.jsx", root), "utf8"),
    readFile(new URL("src/components/BrokenCircle3D.jsx", root), "utf8"),
    readFile(new URL("src/styles/menu-master.css", root), "utf8"),
    readFile(new URL("src/App.jsx", root), "utf8"),
  ]);

  assert.match(navigation, /menu-master-dialog/);
  assert.match(navigation, /<BrokenCircle3D variant="menu"\/>/);
  assert.match(navigation, /BLACK · BLANC · BEUR/);
  assert.match(navigation, /Ce n’est pas une marque\. C’est un héritage\./);
  assert.match(navigation, /NAV_GROUPS\.map/);
  assert.match(navigation, /RouteLink/);
  assert.doesNotMatch(navigation, /Destin 3B|destin/i);

  assert.match(circle, /rotor\.rotation\.z/);
  assert.match(circle, /TAU\/24/);
  assert.match(circle, /variant==='menu'/);
  assert.match(circle, /broken-circle-3d--\$\{variant\}/);
  assert.match(circle, /prefers-reduced-motion/);
  assert.match(circle, /IntersectionObserver/);

  assert.match(css, /menu-master-circle-stage \.home-world-webgl-shell/);
  assert.match(css, /menu-master-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /menuMasterOrbit/);
  assert.match(app, /styles\/menu-master\.css/);
});
