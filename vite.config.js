import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
const buildId = commitSha ? commitSha.slice(0, 12) : `local-${Date.now().toString(36)}`;
const appVersion = process.env.THREEB_APP_VERSION || "1.0.0";
const mandatoryUpdate = /^(1|true|yes)$/i.test(process.env.THREEB_FORCE_UPDATE || "");

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
    },
  };
}

export default defineConfig({
  plugins: [react(), threeBReleasePlugin()],
  define: {
    __THREEB_BUILD_ID__: JSON.stringify(buildId),
    __THREEB_APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rollupOptions: {
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
