'use client';

import { useEffect } from 'react';
import { consumeAuthHandoff } from '@/lib/auth-handoff';

// Standalone-mode counterpart to components/AuthConfirm.tsx's Safari-side write (see
// lib/auth-handoff.ts for why this exists — iOS home-screen web apps don't share cookies with
// Safari). Runs once per launch, only in standalone display mode: if a magic-link sign-in
// happened in Safari and left a fresh handoff entry, replays it through the same set-session
// endpoint and reloads so this app instance picks up its own session. A no-op on every other
// launch (nothing to consume, or not running standalone).
export default function AuthHandoffListener() {
  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
    if (!isStandalone) return;

    consumeAuthHandoff().then((tokens) => {
      if (!tokens) return;
      fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens),
      }).then((res) => {
        if (res.ok) window.location.reload();
      });
    });
  }, []);

  return null;
}
