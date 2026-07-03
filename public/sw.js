// Service worker for the Depth PWA.
//
// Strategy: network-first for same-origin GET requests. Online visitors always get
// the fresh response from the network; the cache is only ever used as a fallback when
// the network is unavailable (offline / flaky connection). That deliberately avoids
// the classic "my update won't show up" stale-content problem — nothing is precached,
// and the cache is populated lazily from real responses as pages are visited.
//
// Passed straight through, never intercepted:
//   - non-GET requests (nothing to safely replay)
//   - cross-origin requests (ESPN headshots on a.espncdn.com, Supabase, etc.)
//   - /api/* (dynamic data — a cached search result would be misleading)

const CACHE = 'depth-runtime-v1';

self.addEventListener('install', () => {
  // Take over as soon as installed instead of waiting for all tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions so a bumped CACHE name fully replaces them.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        // Only cache complete, successful responses (skip 206/opaque/errors).
        if (fresh.ok && fresh.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});
