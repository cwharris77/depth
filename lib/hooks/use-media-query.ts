'use client';

// SSR-safe media-query hook for the desktop layout switch (components/TeamPageShell.tsx).
// The structural columns (rail, context panel) are shown/hidden with CSS `xl:` classes so
// prerendered HTML is correct at every width; this hook exists only for interaction-time
// decisions that must not double-render — e.g. whether a selected player opens the docked
// panel card or the mobile bottom sheet (mounting both would double the per-player stats
// fetch in PlayerCard). The server snapshot is `false`: selection state is always null at
// SSR, so nothing user-visible depends on the pre-hydration value.
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// Tailwind's `xl` breakpoint — the app's one mobile↔desktop layout boundary. Must stay in
// sync with the `xl:` classes in TeamPageShell/TeamPageHeader/PlayerCard call sites; a
// drift here means the docked card and the CSS columns disagree about which mode is live.
export const DESKTOP_MEDIA_QUERY = '(min-width: 1280px)';
