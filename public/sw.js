const CACHE_NAME = "3b-shell-20260924-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/3b-icon-20260912-180.png",
  "/icons/3b-icon-20260912-192.png",
  "/icons/3b-icon-20260912-512.png",
  "/icons/3b-icon-20260912-maskable-192.png",
  "/icons/3b-icon-20260912-maskable-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/");
        return cached || Response.error();
      })
    );
  }
});
