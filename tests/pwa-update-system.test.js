import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  assert.doesNotMatch(manager, /localStorage\.clear|sessionStorage\.clear|caches\.delete/);

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
