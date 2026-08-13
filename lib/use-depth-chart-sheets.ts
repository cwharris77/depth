'use client';

import { useState } from 'react';
import type { TeamFormation, Unit, Uniform } from './types';
import type { TeamUniformDefinition } from './uniforms/teams/types';

// Open/closed state for the field's three overflow-menu sheets (uniform/season/
// formations), plus the ready-to-spread prop bundles DepthChartSheets and FieldHeader's
// menu need -- the same "hook owns state, returns what the section needs" shape as
// useKit/useTeamOverride. Selecting a season or formation closes its sheet in the same
// action (no separate close call at the callsite), mirroring the original inline
// onSelect wiring.
export function useDepthChartSheets({
  kitUniforms,
  activeKitId,
  kitDefinition,
  onSelectKit,
  currentSeason,
  activeSeason,
  onSelectSeason,
  activeUnit,
  unitFormations,
  activeFormation,
  onSelectFormation,
}: {
  kitUniforms: Uniform[];
  activeKitId: string;
  kitDefinition: TeamUniformDefinition | undefined;
  onSelectKit: (id: string) => void;
  currentSeason: number;
  activeSeason: number | null;
  onSelectSeason: (season: number | null) => void;
  activeUnit: Unit;
  unitFormations: TeamFormation[];
  activeFormation: TeamFormation | null;
  onSelectFormation: (formation: TeamFormation | null) => void;
}) {
  const [kitOpen, setKitOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [formationsOpen, setFormationsOpen] = useState(false);

  const sheets = {
    kit: {
      open: kitOpen,
      onClose: () => setKitOpen(false),
      uniforms: kitUniforms,
      activeId: activeKitId,
      definition: kitDefinition,
      onSelect: onSelectKit,
    },
    season: {
      open: seasonOpen,
      onClose: () => setSeasonOpen(false),
      currentSeason,
      active: activeSeason,
      onSelect: (next: number | null) => {
        onSelectSeason(next);
        setSeasonOpen(false);
      },
    },
    formations: {
      open: formationsOpen,
      onClose: () => setFormationsOpen(false),
      unit: activeUnit,
      list: unitFormations,
      active: activeFormation,
      onSelect: (formation: TeamFormation | null) => {
        onSelectFormation(formation);
        setFormationsOpen(false);
      },
    },
  };

  return {
    sheets,
    openKitSheet: () => setKitOpen(true),
    openSeasonSheet: () => setSeasonOpen(true),
    openFormationsSheet: () => setFormationsOpen(true),
  };
}
