'use client';

import { useMemo, useState } from 'react';
import {
  alignmentLabel,
  buildRealDefenseFormation,
  buildRealFormation,
} from '@/lib/utils/depth-chart/formations';
import type { TeamFormation, Unit } from '@/lib/types';

// A team's default formation pick is its most-used real formation for that unit, not
// the generic "Base" look -- users should never see "Base" as something they picked.
// Falls back to null (Base, internal-only) only when the unit has no real-formation
// rows at all.
function topFormationFor(unit: Unit, formations: TeamFormation[]): TeamFormation | null {
  if (unit === 'special') return null;
  const unitFormations = formations.filter((f) => f.unit === unit);
  if (unitFormations.length === 0) return null;
  return unitFormations.reduce((top, f) => (f.rank < top.rank ? f : top));
}

// Real-formation selection for DepthChartField (Phase E offense, DEP-141 defense):
// which formation chip is active for the current unit, the unit-filtered lists
// FormationsSheet lists from, and the resolved on-field layout. The chip choice is
// ephemeral -- not persisted, not in the URL (locked decision) -- and resets to the
// team's top formation on team change (render-time, mirroring useKit's team-change
// reset) or whenever the caller switches units (resetToTopForUnit).
export function useFormations(
  teamId: string,
  unit: Unit,
  formations: TeamFormation[],
  historicalMode: boolean
) {
  const [activeFormation, setActiveFormation] = useState<TeamFormation | null>(() =>
    topFormationFor(unit, formations)
  );
  const [formationTeamId, setFormationTeamId] = useState(teamId);
  if (formationTeamId !== teamId) {
    setFormationTeamId(teamId);
    setActiveFormation(topFormationFor(unit, formations));
  }

  const offenseFormations = useMemo(
    () => (formations ?? []).filter((f) => f.unit === 'offense'),
    [formations]
  );
  const defenseFormations = useMemo(
    () => (formations ?? []).filter((f) => f.unit === 'defense'),
    [formations]
  );
  const unitFormations =
    unit === 'offense' ? offenseFormations : unit === 'defense' ? defenseFormations : [];

  // Real formations are about the latest ingested season's live participation data --
  // meaningless overlaid on a past season's roster, so only applied outside historical
  // mode. Special teams has no real-formation data (see FormationsSheet's empty
  // state), so it always falls back to the static layout.
  const realFormation = useMemo(() => {
    if (historicalMode || !activeFormation) return undefined;
    if (unit === 'offense') {
      return buildRealFormation(activeFormation.alignment, activeFormation.personnel);
    }
    if (unit === 'defense') {
      return buildRealDefenseFormation(activeFormation.personnel);
    }
    return undefined;
  }, [historicalMode, unit, activeFormation]);

  // The ••• menu's "Formations" row shows the current pick inline instead of a separate
  // on-field control (DEP-142/option 2a).
  const formationsMeta = !activeFormation
    ? 'Base'
    : unit === 'offense'
      ? `${alignmentLabel(activeFormation.alignment)} ${activeFormation.personnel}`
      : `${activeFormation.alignment} (${activeFormation.personnel})`;

  // A selected formation is unit-specific (offense/defense each have their own list) --
  // switching units always resets to that unit's top formation rather than carrying a
  // stale pick across.
  const resetToTopForUnit = (nextUnit: Unit) => {
    setActiveFormation(topFormationFor(nextUnit, formations));
  };

  return {
    activeFormation,
    setActiveFormation,
    unitFormations,
    realFormation,
    formationsMeta,
    resetToTopForUnit,
  };
}
