'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { TeamRoster } from '@/lib/types';
import { getKitId, setKitId as persistKitId } from '@/lib/kit-selection';

// useSyncExternalStore never notifies us of a change on its own (localStorage writes in
// this tab go through setKitId below, not through the store's subscription) — it's used
// here purely for its getServerSnapshot contract, which is what keeps SSR and the initial
// client hydration render byte-for-byte identical. A plain lazy useState initializer
// can't do that: it would read localStorage during the client's first render, producing
// DOM (kit colors) that differs from what the server sent and triggering a hydration
// mismatch.
const noSubscription = () => () => {};

// Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
// kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
// kit swaps the colors the whole view renders with (dots, card, header), so the field
// "wears" the uniform. Reset to Home whenever the team (and therefore roster.uniforms)
// changes.
//
// Kit choice is persisted per team to localStorage (lib/kit-selection.ts) so it survives
// route changes (ROSTER/STATS/SCHEDULE are separate routes that unmount DepthChartField).
// Both server and client render the default kit first (see noSubscription above); once
// React resolves the real localStorage value post-hydration, it's applied during render
// (not in an effect) so the swap lands before that render commits.
export function useKit(roster: TeamRoster) {
  const defaultKitId = roster.uniforms[0]?.id;

  // undefined on the server and during the initial hydration render; the real persisted
  // value (or still undefined, if nothing is stored) once React re-checks post-hydration.
  const persistedKitId = useSyncExternalStore(
    noSubscription,
    () => getKitId(roster.team.id),
    () => undefined
  );

  const [kitId, setKitIdState] = useState(defaultKitId);
  // Tracks which (team, persisted-value) pair `kitId` currently reflects, so we know when
  // to re-derive it: once when the team changes, and once more when persistedKitId
  // resolves from "not yet read" to its real localStorage value after hydration.
  const [applied, setApplied] = useState({ teamId: roster.team.id, persistedKitId });

  const teamChanged = applied.teamId !== roster.team.id;
  const persistenceResolved = !teamChanged && applied.persistedKitId !== persistedKitId;
  if (teamChanged || persistenceResolved) {
    setApplied({ teamId: roster.team.id, persistedKitId });
    setKitIdState(persistedKitId ?? defaultKitId);
  }

  // Persist to localStorage whenever the user picks a new kit.
  const setKitId = useCallback(
    (id: string) => {
      setKitIdState(id);
      persistKitId(roster.team.id, id);
    },
    [roster.team.id]
  );

  const activeUniform = roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? roster.team.colors;

  return { kitId, setKitId, activeUniform, activeColors };
}
