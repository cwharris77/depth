'use client';

import { useSyncExternalStore } from 'react';
import { colors as uiTokens } from '@/components/ui/tokens';

// Remembers the uiAccent of the last team page visited, so pages with no current team
// (uniform archive, compare) tint their nav with that team's color instead of resetting to
// the neutral chrome default (components/ui/tokens.ts's `accent`) every time you navigate
// away from a team page. Session-scoped (sessionStorage), not a database/user preference —
// closing the tab forgets it, same as before this existed. Module-scope external store (not
// React context) so `setLastAccent` can be called from TeamPageShell without needing a
// provider mounted above every route.
const STORAGE_KEY = STORAGE_KEY_DEPTH_LAST_ACCENT;

import { STORAGE_KEY_DEPTH_LAST_ACCENT } from '@/lib/utils/storage-keys';

let cached: string = uiTokens.accent;
let hydrated = false;
const listeners = new Set<() => void>();

function readStorage(): string {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY_DEPTH_LAST_ACCENT) ?? uiTokens.accent;
  } catch {
    // Storage can throw in private-browsing/blocked-cookie contexts; the neutral
    // default is a safe fallback in that case.
    return uiTokens.accent;
  }
}

export function setLastAccent(accent: string) {
  cached = accent;
  hydrated = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // Non-fatal — the in-memory `cached` value still updates the current session.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (!hydrated) {
    cached = readStorage();
    hydrated = true;
  }
  return cached;
}

function getServerSnapshot() {
  return uiTokens.accent;
}

export function useLastAccent() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
