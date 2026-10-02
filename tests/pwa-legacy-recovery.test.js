import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("legacy PWA recovery preserves user storage and refreshes app assets", async () => {
  const [manager, recoveryPage, recoveryScript, vite, vercelRaw] = await Promise.all([
    readFile(new URL("src/update/AppUpdateManager.jsx", root), "utf8"),
    readFile(new URL("public/mettre-a-jour-3b.html", root), "utf8"),
    readFile(new URL("public/recovery-3b.js", root), "utf8"),
    readFile(new URL("vite.config.js", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
  ]);

  assert.match(manager, /healLegacyPwaRegistrations/);
  assert.match(manager, /registration\.unregister/);
  assert.match(manager, /caches\.delete/);
  assert.doesNotMatch(manager, /localStorage\.clear|sessionStorage\.clear|indexedDB\.deleteDatabase/);
  assert.match(manager, /const currentBuildLabel/);

  assert.match(recoveryPage, /<script src="\/recovery-3b\.js" defer><\/script>/);
  assert.doesNotMatch(recoveryPage, /<script>(?:.|\n)*getRegistrations/);

  assert.match(recoveryScript, /getRegistrations/);
  assert.match(recoveryScript, /registration\.unregister/);
  assert.match(recoveryScript, /caches\.delete/);
  assert.match(recoveryScript, /3b-recovered/);
  assert.doesNotMatch(recoveryScript, /localStorage\.clear|sessionStorage\.clear|indexedDB\.deleteDatabase/);

  assert.match(vite, /fileName: "service-worker\.js"/);
  assert.match(vite, /fileName: "pwa-sw\.js"/);
  assert.match(vite, /legacyRecoveryWorker/);
  assert.match(vite, /self\.registration\.unregister/);

  const vercel = JSON.parse(vercelRaw);
  for (const source of ["/service-worker.js", "/pwa-sw.js", "/mettre-a-jour-3b.html", "/recovery-3b.js"]) {
    const entry = vercel.headers.find((item) => item.source === source);
    assert.ok(entry, `${source} must have recovery headers`);
    assert.ok(entry.headers.some((header) =>
      header.key === "Cache-Control" && /no-store/.test(header.value)
    ));
  }

  for (const source of ["/mise-a-jour", "/update-3b", "/repair-3b"]) {
    const redirect = vercel.redirects.find((item) => item.source === source);
    assert.equal(redirect?.destination, "/mettre-a-jour-3b.html");
  }
});
