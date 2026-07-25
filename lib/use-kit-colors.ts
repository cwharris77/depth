'use client';

import { useLayoutEffect, useState } from 'react';
import type { TeamMeta } from '@/lib/roster-source';
import type { TeamColors } from '@/lib/types';

const STORAGE_PREFIX = 'depth:kit-colors:';

function readStoredColors(teamId: string): TeamColors | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + teamId);
    return raw ? (JSON.parse(raw) as TeamColors) : undefined;
  } catch {
    return undefined;
  }
}

// Written by lib/use-kit.ts whenever the roster page's active kit (Home/Away/throwback/…)
// resolves, so the pick is available outside DepthChartField too.
export function writeKitColors(teamId: string, colors: TeamColors) {
  try {
    window.sessionStorage.setItem(STORAGE_PREFIX + teamId, JSON.stringify(colors));
  } catch {
    // Storage can throw in private-browsing/blocked-cookie contexts — non-fatal, see
    // lib/use-kit.ts's writeStoredKit for the same reasoning.
  }
}

// Schedule and stats (TeamScheduleView, TeamStatsView) only fetch lightweight team
// metadata — no uniforms, no player data (invariant 5) — so they can't resolve a picked
// kit id into colors the way DepthChartField/useKit does. Instead they read whichever
// colors the roster page last resolved for this team, falling back to the team's real
// colors when nothing was ever picked. Without this, picking Away on roster then
// switching to SCHEDULE/STATS showed the roster in Away but the other tabs still in
// Home — the same "global state" expectation as lib/use-last-accent.ts's nav-wide
// accent, just scoped per team instead of "whichever team was last viewed".
export function useKitColors(team: TeamMeta): TeamColors {
  const [colors, setColors] = useState(team.colors);
  // team.colors is server-provided data (new object each time a page gets a new team),
  // so it's safe to compare and reset during render rather than in an effect — see
  // lib/use-kit.ts's identical roster.uniforms reset for the reasoning.
  const [prevTeamId, setPrevTeamId] = useState(team.id);
  if (team.id !== prevTeamId) {
    setPrevTeamId(team.id);
    setColors(team.colors);
  }

  // sessionStorage doesn't exist during the server render, so reading it in a lazy
  // useState initializer would render the default colors on the server and the stored
  // pick on the client's first paint — a hydration mismatch. useLayoutEffect (not
  // useEffect) restores it before the browser paints, so there's no flash of the
  // default colors first — same reasoning as lib/use-kit.ts's kit restoration.
  useLayoutEffect(() => {
    const stored = readStoredColors(team.id);
    if (stored) setColors(stored);
  }, [team.id]);

  return colors;
}
