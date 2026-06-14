const CACHE = '1rstbank-v1';
const OFFLINE_URL = '/offline';

const PRECACHE = [
  '/',
  '/login',
  '/offline',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // API routes: network-only, no caching
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful navigation and static asset responses
        if (res.ok && (e.request.mode === 'navigate' || url.pathname.startsWith('/_next/'))) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(e.request) || caches.match(OFFLINE_URL);
      })
  );
});
