'use client';

import { usePathname, useRouter } from 'next/navigation';
import { unitForPosition } from '@/lib/utils/search/search';
import { buildTeamSelectionUrl } from '@/lib/utils/depth-chart/team-selection';
import type { Player, Unit } from '@/lib/types';

// Composed command handlers for DepthChartField that cross two or more of its other
// hooks (selection, formations, season) plus the URL. Each of those hooks only knows
// its own slice of state -- e.g. use-depth-chart-selection.ts has no idea formations
// exist -- so the composition (what should ALSO happen when a command fires) lives
// here rather than inline in the coordinator.
export function useDepthChartCommands({
  activeUnit,
  changeSelectionUnit,
  resetToTopForUnit,
  selectPlayer,
  setSeason,
  resetForSeasonChange,
}: {
  activeUnit: Unit;
  changeSelectionUnit: (unit: Unit) => void;
  resetToTopForUnit: (unit: Unit) => void;
  selectPlayer: (player: Player, unit: Unit) => void;
  setSeason: (season: number | null) => void;
  resetForSeasonChange: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // A selected formation is unit-specific (offense/defense each have their own list) --
  // switching units always resets to that unit's top formation rather than carrying a
  // stale pick across. use-depth-chart-selection.ts owns the selection/URL side; this
  // composes in the formation reset the selection hook has no knowledge of.
  const changeUnit = (unit: Unit) => {
    changeSelectionUnit(unit);
    resetToTopForUnit(unit);
  };

  // Selecting a season (SeasonSheet, or the "Back to today" chip with `next: null`)
  // closes any open card -- a live-roster selection doesn't necessarily exist in a past
  // season's data -- and writes `?season=` into the URL (kept, never stripped, so the
  // link stays shareable). The query-driven mount/Back-Forward path (SyncSelectionFromQuery's
  // season read) only updates local state via setSeason directly; the URL is already
  // correct in that case, so it doesn't re-push it.
  const changeSeason = (next: number | null) => {
    setSeason(next);
    resetForSeasonChange();
    router.replace(
      buildTeamSelectionUrl(pathname, { unit: activeUnit, playerId: null, season: next }),
      { scroll: false }
    );
  };

  // A player picked from the nav's player search jumps the field to their unit, then
  // opens them -- same behavior the old header search had.
  const handleNavSelectPlayer = (player: Player) => {
    selectPlayer(player, unitForPosition(player.position));
  };

  return { changeUnit, changeSeason, handleNavSelectPlayer };
}
