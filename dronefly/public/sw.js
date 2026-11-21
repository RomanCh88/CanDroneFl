// Bump CACHE_NAME when the caching strategy changes; old caches are deleted on activate.
const CACHE_NAME = 'dronefly-v2';
const WEATHER_CACHE = 'dronefly-weather-v2';
const WEATHER_MAX_ENTRIES = 20;

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

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
          if (response.ok) {
            caches.open(WEATHER_CACHE)
              .then((cache) => cache.put(request, clone))
              .then(() => trimCache(WEATHER_CACHE, WEATHER_MAX_ENTRIES));
          }
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

  // Navigation (HTML) — network first so a new deploy is picked up immediately;
  // keep a fresh copy of the shell for offline, fall back to it when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === '/') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Only GET can be cached; let everything else (Firestore, auth) pass through untouched.
  if (request.method !== 'GET') return;

  // Static assets (_next/static, fonts, icons) — cache first (content-hashed, safe to keep)
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/fonts') ||
    (STATIC_ASSETS.includes(url.pathname) && url.pathname !== '/')
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

  // Everything else — browser default (network)
});
