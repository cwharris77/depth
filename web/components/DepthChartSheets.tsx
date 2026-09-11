'use client';

import { SEASONS_MIN } from '@/lib/nflverse/roster-history';
import type { TeamFormation, Unit, Uniform } from '@/lib/types';
import type { TeamUniformDefinition } from '@/lib/uniforms/teams/types';
import BottomSheet from './BottomSheet';
import FormationsSheet from './FormationsSheet';
import SeasonSheet from './SeasonSheet';
import UniformSheet from './UniformSheet';

type Props = {
  accent: string;
  kit: {
    open: boolean;
    onClose: () => void;
    uniforms: Uniform[];
    activeId: string;
    definition?: TeamUniformDefinition;
    onSelect: (id: string) => void;
  };
  season: {
    open: boolean;
    onClose: () => void;
    currentSeason: number;
    active: number | null;
    onSelect: (season: number | null) => void;
  };
  formations: {
    open: boolean;
    onClose: () => void;
    unit: Unit;
    list: TeamFormation[];
    active: TeamFormation | null;
    onSelect: (formation: TeamFormation | null) => void;
  };
};

// The field's three overflow-menu sheets — uniform picker, season picker, formations
// picker — each already presentational; this just owns their BottomSheet wrappers so
// DepthChartField composes one section instead of three inline blocks (DEP-179).
export default function DepthChartSheets({ accent, kit, season, formations }: Props) {
  return (
    <>
      <BottomSheet isOpen={kit.open} onClose={kit.onClose}>
        <UniformSheet
          uniforms={kit.uniforms}
          activeId={kit.activeId}
          accent={accent}
          definition={kit.definition}
          onSelect={kit.onSelect}
          onClose={kit.onClose}
        />
      </BottomSheet>

      <BottomSheet isOpen={season.open} onClose={season.onClose}>
        <SeasonSheet
          currentSeason={season.currentSeason}
          minSeason={SEASONS_MIN}
          activeSeason={season.active}
          accent={accent}
          onSelect={season.onSelect}
          onClose={season.onClose}
        />
      </BottomSheet>

      <BottomSheet isOpen={formations.open} onClose={formations.onClose}>
        <FormationsSheet
          unit={formations.unit}
          formations={formations.list}
          activeFormation={formations.active}
          onSelect={formations.onSelect}
          onClose={formations.onClose}
          accent={accent}
        />
      </BottomSheet>
    </>
  );
}
