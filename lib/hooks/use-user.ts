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
// rather than re-subscribed per component instance. subscribe/getSnapshot are exported as the
// store's own interface — useUser() binds them to React, and the tests drive them directly.
type AuthState = { user: User | null; loading: boolean };

// A single stable reference — useSyncExternalStore compares snapshots with Object.is, so
// getServerSnapshot (and getSnapshot before the first auth event) must return the same object
// every call, not a fresh literal, or React treats every render as a change and loops.
const INITIAL_STATE: AuthState = { user: null, loading: true };

let state: AuthState = INITIAL_STATE;
const listeners = new Set<() => void>();
let started = false;
// Monotonic guard for the async getUser() read: every auth event increments it, and getUser()
// snapshots it before the server round-trip so it only publishes its result if no fresher
// event has fired since — a slow read can never clobber a newer sign-in/sign-out.
let authGeneration = 0;
// The onAuthStateChange unsubscribe, held so the singleton's subscription lifecycle is explicit
// rather than dropped. It is deliberately never called: this store is module-scoped, so its
// subscription is meant to live for the app's lifetime — re-subscribing per component (the
// alternative) is what would leak, not keeping this one.
let _unsubscribeAuth: (() => void) | undefined;

function notify() {
  listeners.forEach((listener) => listener());
}

function ensureStarted() {
  if (started) return;
  started = true;
  const supabase = getBrowserClient();
  const getUserGeneration = authGeneration;
  // getUser() revalidates against the auth server (unlike onAuthStateChange's initial event,
  // which only reflects local storage) — kept as the authoritative first read. A failed read
  // resolves loading to the safe "unauthenticated" state instead of leaving it stuck true.
  supabase.auth
    .getUser()
    .then(({ data }) => {
      if (authGeneration !== getUserGeneration) return;
      state = { user: data.user ?? null, loading: false };
      notify();
    })
    .catch(() => {
      if (authGeneration !== getUserGeneration) return;
      state = { user: null, loading: false };
      notify();
    });
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    authGeneration += 1;
    state = { user: session?.user ?? null, loading: false };
    notify();
  });
  _unsubscribeAuth = subscription.unsubscribe;
}

export function subscribe(listener: () => void) {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): AuthState {
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
