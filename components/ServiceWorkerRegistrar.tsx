'use client';

import { useEffect } from 'react';

// Registers the service worker (public/sw.js) so the app works offline and launches
// instantly on repeat visits once added to the home screen. Production only: a service
// worker in dev fights Turbopack's HMR. Rendered from the root layout so it covers
// every route, and failures are swallowed — the app is fully functional without it.
//
// Registration is deferred until after the window load event so the service worker's
// install/precache work (downloading sw.js and caching the home route + all 32 team
// pages) does not compete with the initial page's critical rendering path on slow mobile
// networks. This keeps first-load LCP/TTI focused on the actual page resources; the
// worker can warm its caches once the user is already seeing content.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };

    // Defer registration until the page is fully loaded so the worker's install/precache
    // does not contend with first-paint resources on mobile connections.
    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw, { once: true });
    }

    return () => {
      window.removeEventListener('load', registerSw);
    };
  }, []);

  return null;
}
