'use client';

import { useState } from 'react';
import type { TeamRoster } from '@/lib/types';

// Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
// kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
// kit swaps the colors the whole view renders with (dots, card, header), so the field
// "wears" the uniform. Reset to Home whenever the team (and therefore roster.uniforms)
// changes.
export function useKit(roster: TeamRoster) {
  const [kitId, setKitId] = useState(roster.uniforms[0]?.id);
  // roster.uniforms is server-provided data (new array reference each time DepthChartField
  // gets a new team's roster prop) — no browser API involved, so it's safe to compare and
  // reset during render rather than in an effect: the reset lands before this render commits
  // instead of flashing the previous team's kit for a frame.
  const [prevUniforms, setPrevUniforms] = useState(roster.uniforms);
  if (roster.uniforms !== prevUniforms) {
    setPrevUniforms(roster.uniforms);
    setKitId(roster.uniforms[0]?.id);
  }

  const activeUniform = roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? roster.team.colors;

  return { kitId, setKitId, activeUniform, activeColors };
}
