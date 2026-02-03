self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// REQUIRED for Chrome installability: a fetch handler must exist
self.addEventListener("fetch", (event) => {
  // passthrough to network
  event.respondWith(fetch(event.request));
});
