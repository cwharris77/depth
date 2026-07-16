'use client';

import { useEffect, useState } from 'react';

// Registers the service worker (public/sw.js) so the app works offline and launches
// instantly on repeat visits once added to the home screen. Production only: a service
// worker in dev fights Turbopack's HMR. Rendered from the root layout so it covers
// every route, and failures are swallowed — the app is fully functional without it.
//
// Also owns the update prompt: sw.js holds an updated worker in the "waiting" state
// instead of activating it out from under an open tab (see sw.js's install handler).
// This component notices that worker via registration.waiting / the updatefound event
// and surfaces a "reload to update" banner; the reload only happens after the user
// confirms, via a SKIP_WAITING message to the waiting worker and a controllerchange
// listener that reloads once it takes over.
export default function ServiceWorkerRegistrar() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // Reload once the new worker actually takes control, not on the SKIP_WAITING send —
    // activation (and clients.claim()) is what makes the fresh cache take effect.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // A worker was already waiting when this tab loaded (e.g. it opened between a
        // previous tab's update and this one registering).
        if (registration.waiting) setWaitingWorker(registration.waiting);

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            // "installed" with an existing controller means this is an update sitting in
            // "waiting", not the page's first-ever install.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl px-4 py-3 text-[13px] shadow-lg"
      style={{ background: '#131a2b', color: '#f0f4ff', border: '1px solid #4fc3f755' }}>
      <span>Update available</span>
      <button
        type="button"
        onClick={() => waitingWorker.postMessage('SKIP_WAITING')}
        className="shrink-0 rounded-full px-3 py-1 text-[12px] font-bold"
        style={{ background: '#4fc3f7', color: '#0a0e1a' }}>
        Reload
      </button>
    </div>
  );
}
