const CACHE = '1rstbank-v2';
const OFFLINE_URL = '/offline';

// Only precache truly static files — never HTML pages or redirects
const PRECACHE = [
  '/offline',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never touch API calls or cross-origin requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // Next.js immutable static chunks are content-hashed — safe to cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Navigation (HTML pages): always network-first — never cache, banking needs fresh auth
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request)
          .then((cached) => cached || caches.match(OFFLINE_URL))
      )
    );
    return;
  }

  // Public static assets (icons, manifest): network-first, cache as fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
