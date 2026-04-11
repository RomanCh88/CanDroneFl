const CACHE_NAME = 'dronefly-v1';
const WEATHER_CACHE = 'dronefly-weather-v1';

const STATIC_ASSETS = [
  '/',
  '/icon.svg',
  '/favicon.ico',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== WEATHER_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Weather API — network first, fall back to cache (show last known data offline)
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(WEATHER_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Next.js HMR / dev server — skip caching entirely
  if (
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.pathname.startsWith('/__nextjs')
  ) {
    return;
  }

  // Static assets (_next/static, fonts, icons) — cache first
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/fonts') ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests — network first, fall back to cached '/'
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Everything else — network only
  event.respondWith(fetch(request));
});
