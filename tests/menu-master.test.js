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
  assert.match(navigation, /Ton univers\. Un seul centre\./);
  assert.match(navigation, /L’héritage/);
  assert.match(navigation, /compact \/>/);
  assert.match(navigation, /NAV_GROUPS\.map/);
  assert.match(navigation, /RouteLink/);
  assert.doesNotMatch(navigation, /Destin 3B|destin/i);

  assert.match(circle, /rotor\.rotation\.z/);
  assert.match(circle, /TAU\/24/);
  assert.match(circle, /variant==='menu'/);
  assert.match(circle, /broken-circle-3d--\$\{variant\}/);
  assert.match(circle, /prefers-reduced-motion/);
  assert.match(circle, /IntersectionObserver/);
  assert.match(circle, /ambientRig/);
  assert.match(circle, /TorusGeometry\(2\.92/);
  assert.match(circle, /PointsMaterial/);

  assert.match(css, /menu-master-main/);
  assert.match(css, /grid-template-columns:minmax\(390px/);
  assert.match(css, /menu-master-circle-stage \.home-world-webgl-shell/);
  assert.match(css, /menu-master-grid/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /menuMasterOrbit/);
  assert.match(app, /styles\/menu-master\.css/);
});


test("mobile visual master is a dedicated phone surface, not the desktop panel squeezed down", async () => {
  const [navigation, css] = await Promise.all([
    readFile(new URL("src/components/AppNavigation.jsx", root), "utf8"),
    readFile(new URL("src/styles/menu-master.css", root), "utf8"),
  ]);

  assert.match(navigation, /MOBILE_MENU_ORDER/);
  assert.match(navigation, /menu-mobile-master/);
  assert.match(navigation, /menu-mobile-grid/);
  assert.match(navigation, /menu-mobile-dock/);
  assert.match(navigation, /menu-mobile-dock-core/);
  assert.match(navigation, /BLACK · BLANC · BEUR/);
  assert.doesNotMatch(navigation, /Destin 3B|destin/i);

  assert.match(css, /MOBILE VISUAL MASTER V2/);
  assert.match(css, /menu-master-panel,[\s\S]*?menu-master-footer[\s\S]*?display:none!important/);
  assert.match(css, /menu-mobile-master[\s\S]*?display:flex/);
  assert.match(css, /menu-mobile-grid[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /menu-mobile-dock[\s\S]*?grid-template-columns:1fr 1fr 68px 1fr 1fr/);
  assert.match(css, /menu-master-circle-stage[\s\S]*?width:308px/);
});
