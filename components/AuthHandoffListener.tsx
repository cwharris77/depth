'use client';

import { useEffect } from 'react';
import { consumeAuthHandoff } from '@/lib/auth-handoff';

// Standalone-mode counterpart to components/AuthConfirm.tsx's Safari-side write (see
// lib/auth-handoff.ts for why this exists — iOS home-screen web apps don't share cookies with
// Safari). If a magic-link sign-in happened in Safari and left a fresh handoff entry, replays it
// through the same set-session endpoint and reloads so this app instance picks up its own
// session. A no-op on every other check (nothing to consume, or not running standalone).
//
// Checks on mount AND on visibility/focus regain, not just mount: the usual path is switching
// back to an already-running home-screen icon (app switcher), which iOS resumes from a suspended
// WKWebView rather than remounting the page — a mount-only effect would never see it.
export default function AuthHandoffListener() {
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (!isStandalone) return;

    let checking = false;
    const check = () => {
      if (checking) return;
      checking = true;
      consumeAuthHandoff()
        .then((tokens) => {
          if (!tokens) return;
          return fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokens),
          }).then((res) => {
            if (res.ok) window.location.reload();
          });
        })
        .finally(() => {
          checking = false;
        });
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', check);
    window.addEventListener('focus', check);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return null;
}
