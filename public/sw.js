// wttr.hub PWA Service Worker
// Satisfies Chromium PWA installability criteria while allowing all network traffic to pass through natively.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch event handler required for Chromium PWA installability
self.addEventListener('fetch', () => {
  // Intentionally no event.respondWith - native network routing is preserved without caching interference
});
