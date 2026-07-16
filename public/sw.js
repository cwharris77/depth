// Service worker for the Depth PWA.
//
// Caches:
//   - PRECACHE: at install, the home route + all 32 team pages. Team pages are
//     statically prerendered, so their roster data is baked into the HTML — precaching
//     the documents means any team opens offline, not just ones already visited. The
//     URL list comes from /sitemap.xml so no team ids are hardcoded here.
//   - RUNTIME: everything else (JS/CSS chunks, RSC payloads) cached lazily from real
//     responses as it's requested.
//   - IMAGES: any other same-origin image (team logos, UI icons) cached first, since
//     they're immutable — served instantly and kept offline. Capped so the cache can't
//     grow without bound as you browse rosters.
//   - ESPN_HEADSHOTS: player headshots served from ESPN's headshot CDN
//     (a.espncdn.com), cached first in their own capped bucket. In this app they're
//     normally requested through next/image's same-origin /_next/image proxy (its
//     `url` search param carries the original ESPN URL), but a direct cross-origin hit
//     is handled too — see isEspnHeadshotRequest. Kept separate from IMAGES so a
//     roster-heavy browsing session can't evict headshots to make room for logos, or
//     vice versa.
//
// Strategy is network-first for same-origin GETs: online visitors always get the fresh
// response; the caches are only a fallback when the network is unavailable. That keeps
// the "my update won't show up" problem away while still working fully offline.
//
// Passed straight through, never intercepted:
//   - non-GET requests
//   - other cross-origin requests (Supabase, etc.) — ESPN headshots are the one
//     cross-origin exception, handled by isEspnHeadshotRequest below
//   - /api/* (dynamic data — a cached search result would be misleading)
//
// Bump VERSION to invalidate all caches on the next SW update.

const VERSION = 'v3';
const PRECACHE = `depth-precache-${VERSION}`;
const RUNTIME = `depth-runtime-${VERSION}`;
const IMAGES = `depth-images-${VERSION}`;
const ESPN_HEADSHOTS = `depth-espn-headshots-${VERSION}`;
const MAX_IMAGES = 80;
// One roster's worth of headshots (~53 active + practice-squad players) plus a
// handful of search hits from other teams, with headroom. Headshots are small at
// avatar size (a few KB each), so this stays well under a few MB even when full.
const MAX_ESPN_HEADSHOTS = 150;
const ESPN_HEADSHOT_HOST = 'a.espncdn.com';

// Cache-first for images: they're content-addressed (same /_next/image URL always
// returns the same bytes), so a cached copy is served immediately with no revalidation,
// and survives offline. FIFO-trimmed to MAX_IMAGES so browsing many rosters can't grow
// the cache without bound.
async function handleImage(request) {
  const cache = await caches.open(IMAGES);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok && fresh.status === 200) {
    await cache.put(request, fresh.clone());
    const keys = await cache.keys();
    if (keys.length > MAX_IMAGES) await cache.delete(keys[0]);
  }
  return fresh;
}

// True when `url` is an ESPN headshot request — either hit directly
// (a.espncdn.com, cross-origin) or wrapped by next/image's same-origin
// /_next/image proxy (its `url` search param carries the original ESPN URL).
function isEspnHeadshotRequest(url) {
  if (url.hostname === ESPN_HEADSHOT_HOST) return true;
  if (url.pathname === '/_next/image') {
    const inner = url.searchParams.get('url');
    if (!inner) return false;
    try {
      return new URL(inner, url.origin).hostname === ESPN_HEADSHOT_HOST;
    } catch {
      return false;
    }
  }
  return false;
}

// Cache-first for ESPN headshots, same shape as handleImage but in the dedicated
// ESPN_HEADSHOTS bucket. A direct cross-origin fetch to a.espncdn.com resolves as an
// opaque response (no-cors, status 0) — still cacheable and servable, just not
// inspectable — so opaque responses are accepted alongside normal 200s.
async function handleEspnHeadshot(request) {
  const cache = await caches.open(ESPN_HEADSHOTS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok || fresh.type === 'opaque') {
    await cache.put(request, fresh.clone());
    const keys = await cache.keys();
    if (keys.length > MAX_ESPN_HEADSHOTS) await cache.delete(keys[0]);
  }
  return fresh;
}

async function precacheTeamPages() {
  const cache = await caches.open(PRECACHE);
  try {
    const res = await fetch('/sitemap.xml', { cache: 'no-store' });
    if (!res.ok) return;
    const xml = await res.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    // Put each individually via allSettled so one failed page doesn't abort the whole
    // precache (and, with it, the service worker install).
    await Promise.allSettled(
      urls.map(async (u) => {
        const r = await fetch(u, { cache: 'no-store' });
        if (r.ok && r.status === 200) await cache.put(u, r.clone());
      })
    );
  } catch {
    // No sitemap / offline during install → skip precache; runtime caching still works.
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheTeamPages().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const keep = new Set([PRECACHE, RUNTIME, IMAGES, ESPN_HEADSHOTS]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ESPN headshots: cache-first regardless of origin (direct a.espncdn.com hits, or
  // the same-origin /_next/image proxy wrapping an ESPN URL). Checked before the
  // same-origin gate below since a direct ESPN request is cross-origin and would
  // otherwise be passed through untouched.
  if (isEspnHeadshotRequest(url)) {
    event.respondWith(handleEspnHeadshot(request));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Images: cache-first (immutable), separate capped cache. On an offline cache-miss
  // this rejects, which surfaces as the avatar components' onError silhouette fallback.
  if (request.destination === 'image') {
    event.respondWith(handleImage(request));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok && fresh.status === 200) {
          const cache = await caches.open(RUNTIME);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        // Offline: runtime cache → precache (exact) → for a page navigation, the
        // precached document for that path (ignoring any query string).
        const runtimeHit = await caches.match(request, { cacheName: RUNTIME });
        if (runtimeHit) return runtimeHit;
        const exact = await caches.match(request, { cacheName: PRECACHE });
        if (exact) return exact;
        if (request.mode === 'navigate') {
          const doc = await caches.match(url.origin + url.pathname, { cacheName: PRECACHE });
          if (doc) return doc;
        }
        throw err;
      }
    })()
  );
});
