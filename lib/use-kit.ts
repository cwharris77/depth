'use client';

import { useEffect, useState } from 'react';
import type { TeamRoster } from '@/lib/types';

// Selected uniform (roadmap Phase 7). Defaults to uniforms[0] — the synthesized Home
// kit, i.e. the team's real colors — so the page opens exactly as before. Picking a
// kit swaps the colors the whole view renders with (dots, card, header), so the field
// "wears" the uniform. Reset to Home whenever the team (and therefore roster.uniforms)
// changes.
export function useKit(roster: TeamRoster) {
  const [kitId, setKitId] = useState(roster.uniforms[0]?.id);
  useEffect(() => {
    setKitId(roster.uniforms[0]?.id);
  }, [roster.uniforms]);

  const activeUniform = roster.uniforms.find((u) => u.id === kitId) ?? roster.uniforms[0];
  const activeColors = activeUniform?.colors ?? roster.team.colors;

  return { kitId, setKitId, activeUniform, activeColors };
}
