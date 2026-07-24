'use client';

import { useCallback, useState } from 'react';
import type { TeamRoster } from '@/lib/types';
import { getKitId, setKitId as persistKitId } from '@/lib/kit-selection';

// Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
// kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
// kit swaps the colors the whole view renders with (dots, card, header), so the field
// "wears" the uniform. Reset to Home whenever the team (and therefore roster.uniforms)
// changes.
//
// Kit choice is persisted per team to localStorage (lib/kit-selection.ts) so it survives
// route changes (ROSTER/STATS/SCHEDULE are separate routes that unmount DepthChartField).
// On mount, the persisted value for this team is read; on change, the new value is written.
export function useKit(roster: TeamRoster) {
  // Initialize from localStorage if available, falling back to the default Home kit.
  // This runs only once per mount (lazy initializer), so it's SSR-safe: the server render
  // always gets uniforms[0]?.id, and the client hydration picks up the persisted value
  // without a mismatch because the initializer runs during the first client render too.
  const [kitId, setKitIdState] = useState(() => {
    const persisted = getKitId(roster.team.id);
    return persisted ?? roster.uniforms[0]?.id;
  });

  // Persist to localStorage whenever the user picks a new kit.
  const setKitId = useCallback(
    (id: string) => {
      setKitIdState(id);
      persistKitId(roster.team.id, id);
    },
    [roster.team.id]
  );

  // roster.uniforms is server-provided data (new array reference each time DepthChartField
  // gets a new team's roster prop) — no browser API involved, so it's safe to compare and
  // reset during render rather than in an effect: the reset lands before this render commits
  // instead of flashing the previous team's kit for a frame.
  const [prevUniforms, setPrevUniforms] = useState(roster.uniforms);
  if (roster.uniforms !== prevUniforms) {
    setPrevUniforms(roster.uniforms);
    const persisted = getKitId(roster.team.id);
    setKitIdState(persisted ?? roster.uniforms[0]?.id);
  }

  const activeUniform = roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? roster.team.colors;

  return { kitId, setKitId, activeUniform, activeColors };
}
