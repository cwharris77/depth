// Auth-state hook (Phase C, auth pass 1). Exposes the signed-in user (or null) to client
// components and keeps it live via onAuthStateChange, so the sign-in UI and RememberTeam
// react to sign in/out without a reload. `loading` distinguishes "not signed in" from
// "haven't checked yet" so the UI doesn't flash the signed-out state on first paint.
'use client';

import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';

// Module-scoped, not per-component: the Supabase subscription is a genuine external system
// (useSyncExternalStore's textbook case), started once and shared by every useUser() call
// rather than re-subscribed per component instance.
type AuthState = { user: User | null; loading: boolean };

// A single stable reference — useSyncExternalStore compares snapshots with Object.is, so
// getServerSnapshot (and getSnapshot before the first auth event) must return the same object
// every call, not a fresh literal, or React treats every render as a change and loops.
const INITIAL_STATE: AuthState = { user: null, loading: true };

let state: AuthState = INITIAL_STATE;
const listeners = new Set<() => void>();
let started = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function ensureStarted() {
  if (started) return;
  started = true;
  const supabase = getBrowserClient();
  // getUser() revalidates against the auth server (unlike onAuthStateChange's initial event,
  // which only reflects local storage) — kept as the authoritative first read.
  supabase.auth.getUser().then(({ data }) => {
    state = { user: data.user ?? null, loading: false };
    notify();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    state = { user: session?.user ?? null, loading: false };
    notify();
  });
}

function subscribe(listener: () => void) {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// Server snapshot matches the pre-subscription client state (`loading: true`), so hydration
// never mismatches — the real value arrives via the subscription right after mount, same
// timing as the effect this replaced.
function getServerSnapshot(): AuthState {
  return INITIAL_STATE;
}

export function useUser() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
