// wttr.app Service Worker — Offline Support & Asset Caching
const STATIC_CACHE = 'wttr-static-v1';
const API_CACHE = 'wttr-api-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/logo.jpg',
  '/logo-light.jpg',
  '/logo-dark.jpg',
];

// Install: pre-cache application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache failed:', err);
        return self.skipWaiting();
      }),
  );
});

// Activate: clean up outdated caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch: intercept requests for offline resilience
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 1. Navigation requests (HTML pages) — Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        }),
    );
    return;
  }

  // 2. Weather API requests (wttr.in / wttr.is) — Network first with API Cache fallback
  if (url.hostname.includes('wttr.in') || url.hostname.includes('wttr.is')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return new Response(
            JSON.stringify({ error: 'offline', message: 'No internet connection and no cached data' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }),
    );
    return;
  }

  // 3. Static assets & Google Fonts — Stale-While-Revalidate or Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            // Only cache valid http/https responses
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, let caller handle error
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
