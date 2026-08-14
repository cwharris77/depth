'use client';

import { useMemo } from 'react';
import { applyTeamOverride, type TeamDepthOverride } from '@/lib/utils/depth-chart/depth-overrides';
import { resolveUnit } from '@/lib/utils/depth-chart/formations';
import type { FormationSlot, Player, TeamColors, TeamRoster, Unit } from '@/lib/types';

// The roster-resolution pipeline for DepthChartField's field: override → kit-themed →
// (if historical) swapped for the historical roster → resolved into render-ready dots
// for the active unit/formation. Each step re-skins or re-slices the SAME roster/players
// data rather than fetching separately, so kit colors and override edits stay visible
// whichever season is showing (colors) or disappear correctly when they shouldn't apply
// (overrides never touch a historical roster -- a past season is a fact, not something
// the user's live overlay edits).
export function useDepthChartRoster({
  roster,
  effectiveOverride,
  activeColors,
  historicalRoster,
  historicalMode,
  activeUnit,
  realFormation,
  selectedPlayer,
}: {
  roster: TeamRoster;
  effectiveOverride: TeamDepthOverride;
  activeColors: TeamColors;
  historicalRoster: TeamRoster | null;
  historicalMode: boolean;
  activeUnit: Unit;
  realFormation: FormationSlot[] | undefined;
  selectedPlayer: Player | null;
}) {
  const displayRoster = useMemo(
    () => applyTeamOverride(roster, effectiveOverride),
    [roster, effectiveOverride]
  );
  // Same roster (players/override), re-skinned in the selected kit's colors. One lever:
  // every child that reads team colors (dots via props, PlayerCard/NavSwitcher via
  // roster.team.colors) follows the kit through this.
  const themedRoster = useMemo(
    () => ({ ...displayRoster, team: { ...displayRoster.team, colors: activeColors } }),
    [displayRoster, activeColors]
  );
  // Historical roster, re-skinned the same way. Kit selection stays live (colors are
  // orthogonal to which season is showing, locked decision) but reorder overrides never
  // apply to it -- a past season is a fact, not something the user's live overlay edits.
  const themedHistoricalRoster = useMemo(
    () =>
      historicalRoster
        ? { ...historicalRoster, team: { ...historicalRoster.team, colors: activeColors } }
        : null,
    [historicalRoster, activeColors]
  );
  // While viewing history, the field renders ONLY the historical roster -- never falling
  // back to the live one mid-fetch, or a stale live frame would flash before the real
  // season's data lands (AGENTS.md invariant 16).
  const fieldRoster = historicalMode ? themedHistoricalRoster : themedRoster;

  const slots = fieldRoster ? resolveUnit(fieldRoster, activeUnit, realFormation) : [];

  // Keep the open card's player in sync with the reordered roster (fresh depthRank/status).
  const displaySelected = selectedPlayer
    ? (displayRoster.players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  return { displayRoster, themedRoster, fieldRoster, slots, displaySelected };
}
