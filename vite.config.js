import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import react from "@vitejs/plugin-react";

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
const buildId = commitSha ? commitSha.slice(0, 12) : `local-${Date.now().toString(36)}`;
const appVersion = process.env.THREEB_APP_VERSION || "1.0.0";
const mandatoryUpdate = /^(1|true|yes)$/i.test(process.env.THREEB_FORCE_UPDATE || "");

// Emit documentary sources and licensed museum images beside the preserved library.
const religionAssets = () => [
  ...['histories.js', 'research.js', 'premium.js', 'premium.css'].map(name => ({name, path: new URL('./src/religion/'+name, import.meta.url)})),
  ...readdirSync(new URL('./src/religion/media/', import.meta.url)).filter(name => /\.(jpg|png|svg)$/.test(name)).map(name => ({name:'museum/'+name,path:new URL('./src/religion/media/'+name,import.meta.url)})),
];
function religionHistoryPlugin() {
  return {
    name: 'threeb-religion-documents',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const asset = religionAssets().find(asset => '/religion/'+asset.name === req.url?.split('?')[0]);
        if (!asset) return next();
        const mime = asset.name.endsWith('.css') ? 'text/css' : asset.name.endsWith('.jpg') ? 'image/jpeg' : asset.name.endsWith('.png') ? 'image/png' : asset.name.endsWith('.svg') ? 'image/svg+xml' : 'application/javascript';
        res.setHeader('Content-Type', mime+'; charset=utf-8');
        res.end(readFileSync(asset.path));
      });
    },
    generateBundle() {
      for (const asset of religionAssets()) this.emitFile({type:'asset',fileName:'religion/'+asset.name,source:readFileSync(asset.path)});
    },
  };
}
function threeBReleasePlugin() {
  return {
    name: "threeb-release-artifacts",
    apply: "build",
    generateBundle() {
      const release = {
        buildId,
        version: appVersion,
        mandatory: mandatoryUpdate,
        generatedAt: new Date().toISOString(),
      };
      const serviceWorker = `const BUILD_ID = ${JSON.stringify(buildId)};\nself.addEventListener("install", () => {});\nself.addEventListener("message", (event) => {\n  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();\n});\nself.addEventListener("activate", (event) => {\n  event.waitUntil(self.clients.claim());\n});\nself.addEventListener("fetch", () => {});\n`;
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify(release, null, 2) });
      this.emitFile({ type: "asset", fileName: "sw.js", source: serviceWorker });
      const legacyRecoveryWorker = `self.addEventListener("install", (event) => { event.waitUntil(self.skipWaiting()); });\nself.addEventListener("activate", (event) => {\n  event.waitUntil((async () => {\n    const names = await caches.keys();\n    await Promise.all(names.map((name) => caches.delete(name)));\n    await self.registration.unregister();\n    const windows = await self.clients.matchAll({ type: "window" });\n    await Promise.all(windows.map((client) => client.navigate(client.url)));\n  })());\n});\nself.addEventListener("fetch", () => {});\n`;
      this.emitFile({ type: "asset", fileName: "service-worker.js", source: legacyRecoveryWorker });
      this.emitFile({ type: "asset", fileName: "pwa-sw.js", source: legacyRecoveryWorker });
    },
  };
}

export default defineConfig({
  plugins: [react(), religionHistoryPlugin(), threeBReleasePlugin()],
  define: {
    __THREEB_BUILD_ID__: JSON.stringify(buildId),
    __THREEB_APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
      input: { main: "index.html", religionTree: "religion-tree.html" },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/@supabase/")) return "vendor-supabase";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "vendor-react";
          if (id.includes("/lucide-react/")) return "vendor-icons";
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
