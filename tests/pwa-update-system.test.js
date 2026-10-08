import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { serverReleaseDecision } from "../src/update/release-policy.js";

const root = new URL("../", import.meta.url);

test("3B PWA update system is wired end-to-end", async () => {
  const [vite, main, manager, vercelRaw] = await Promise.all([
    readFile(new URL("vite.config.js", root), "utf8"),
    readFile(new URL("src/main.jsx", root), "utf8"),
    readFile(new URL("src/update/AppUpdateManager.jsx", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
  ]);

  assert.match(vite, /fileName: "version\.json"/);
  assert.match(vite, /fileName: "sw\.js"/);
  assert.match(vite, /__THREEB_BUILD_ID__/);
  assert.match(main, /<AppUpdateManager \/>/);
  assert.match(manager, /NOUVELLE VERSION 3B DISPONIBLE/);
  assert.match(manager, /MISE À JOUR REQUISE/);
  assert.match(manager, /SKIP_WAITING/);
  assert.match(manager, /INSTALLER LA MISE À JOUR/);
  assert.match(manager, /prefetchLatestBuild/);
  assert.match(manager, /response\.body\.getReader/);
  assert.match(manager, /Mise à jour installée/);
  assert.doesNotMatch(manager, /localStorage\.clear|sessionStorage\.clear|indexedDB\.deleteDatabase/);
  assert.match(manager, /caches\.delete/);

  const vercel = JSON.parse(vercelRaw);
  const serviceWorkerHeaders = vercel.headers.find((entry) => entry.source === "/sw.js");
  const versionHeaders = vercel.headers.find((entry) => entry.source === "/version.json");

  assert.ok(serviceWorkerHeaders, "sw.js must have explicit anti-cache headers");
  assert.ok(versionHeaders, "version.json must have explicit anti-cache headers");
  assert.ok(serviceWorkerHeaders.headers.some((header) =>
    header.key === "Cache-Control" && /no-store/.test(header.value)
  ));
  assert.ok(versionHeaders.headers.some((header) =>
    header.key === "Cache-Control" && /no-store/.test(header.value)
  ));
});

test("a worker catching up to the installed build never announces another application update", () => {
  assert.deepEqual(serverReleaseDecision({ buildId: "ffa34c8", version: "1.0.0" }, "ffa34c8"), { status: "current" });
  assert.deepEqual(serverReleaseDecision({ buildId: "service-worker", version: "nouvelle" }, "ffa34c8"), { status: "unknown" });
  assert.deepEqual(serverReleaseDecision({ buildId: " ffa34c8 ", mandatory: true }, "ffa34c8"), { status: "current" });
});

test("confirmed new releases keep their exact build and mandatory update policy", () => {
  assert.deepEqual(serverReleaseDecision({ buildId: "8a30088", version: "1.0.1", mandatory: true }, "ffa34c8"), {
    status: "available", release: { buildId: "8a30088", version: "1.0.1", mandatory: true },
  });
  assert.deepEqual(serverReleaseDecision({ buildId: "8a30088", mandatory: false }, "ffa34c8"), {
    status: "available", release: { buildId: "8a30088", version: "nouvelle", mandatory: false },
  });
  for (const invalid of [null, "offline", {}, { version: "1.0.0" }, { buildId: " " }]) {
    assert.deepEqual(serverReleaseDecision(invalid, "ffa34c8"), { status: "unknown" });
  }
});

test("worker lifecycle checks the server and a confirmed current build clears every stale prompt", async () => {
  const manager = await readFile(new URL("src/update/AppUpdateManager.jsx", root), "utf8");
  assert.doesNotMatch(manager, /publishRelease\(\{\s*buildId:\s*"service-worker"/);
  assert.match(manager, /decision\.status === "current"[\s\S]*?setRelease\(null\)/);
  assert.doesNotMatch(manager, /current\?\.buildId === "service-worker" \? current : null/);
  assert.match(manager, /worker\.state !== "installed"[\s\S]*?void checkServerRelease\(\)/);
  assert.match(manager, /registration\.waiting && navigator\.serviceWorker\.controller[\s\S]*?void checkServerRelease\(\)/);
});


test("home portal renders an architectural atmospheric scene and the real 3D Broken Circle", async () => {
  const [portal, circle3d, homeCss] = await Promise.all([
    readFile(new URL("src/components/WorldPortalCard.jsx", root), "utf8"),
    readFile(new URL("src/components/BrokenCircle3D.jsx", root), "utf8"),
    readFile(new URL("src/styles/home-app.css", root), "utf8"),
  ]);

  assert.doesNotMatch(portal,/hub-cite-origine\.webp/,"the rejected photo plate must not return");
  assert.match(portal,/home-world-atmosphere/);
  assert.match(portal,/<BrokenCircle3D variant="menu"\/>/);
  assert.match(portal, /BrokenCircle3D/);
  assert.doesNotMatch(portal, /home-world-ring-svg|home-world-ring-rotor|home-world-ring-fragments/);

  assert.match(circle3d, /await import\('three'\)/);
  assert.match(circle3d, /limestone-color\.webp/);
  assert.match(circle3d, /MeshPhysicalMaterial/);
  assert.match(circle3d, /ExtrudeGeometry/);
  assert.match(circle3d, /rotor\.rotation\.z/);
  assert.match(circle3d, /TAU\/24/);
  assert.match(circle3d, /IntersectionObserver/);
  assert.match(circle3d, /prefers-reduced-motion/);
  assert.match(circle3d, /powerPreference:'high-performance'/);
  assert.match(circle3d, /annularSectorGeometry/);
  assert.match(circle3d, /webglcontextlost/);
  assert.match(circle3d, /dataset\.state='fallback'/);

  assert.match(homeCss, /home-world-webgl-shell/);
  assert.match(homeCss, /home-world-webgl-canvas/);
  assert.match(homeCss, /data-state="fallback"/);
  assert.doesNotMatch(homeCss, /threebBrokenCircleSpin|home-world-ring-rotor|home-world-ring-svg/);
});