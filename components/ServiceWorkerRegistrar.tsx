"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) so the app works offline and launches
// instantly on repeat visits once added to the home screen. Production only: a service
// worker in dev fights Turbopack's HMR. Rendered from the root layout so it covers
// every route, and failures are swallowed — the app is fully functional without it.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
