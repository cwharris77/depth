'use client';

import type { Player, Unit } from '@/lib/types';
import type { TeamDepthOverride } from '@/lib/utils/depth-chart/depth-overrides';
import ApplySharedOrder from './ApplySharedOrder';
import SyncSelectionFromQuery from './SyncSelectionFromQuery';

type Props = {
  selection: {
    players: Player[];
    selectedPlayerId: string | null;
    onChange: (player: Player | null, unit: Unit | null) => void;
  };
  season: { onApply: (season: number | null) => void };
  kit: { validIds: string[]; onApply: (id: string) => void };
  sharedOrder: { onApply: (override: TeamDepthOverride) => void };
};

// DEP-179 slice 4: bundles DepthChartField's URL-reading children -- selection/season/kit
// (SyncSelectionFromQuery, DEP-184) plus the one-shot ?order= apply (ApplySharedOrder) --
// into one section, the same "hook/section owns a cohesive prop bundle" shape as
// DepthChartSheets and FieldHeader's menu/override/sharedBoard props. Neither child
// renders visible UI; grouping them still keeps DepthChartField's JSX to one tag per
// concern instead of two loose ones with their own flat prop lists.
export default function DepthChartUrlSync({ selection, season, kit, sharedOrder }: Props) {
  return (
    <>
      <SyncSelectionFromQuery
        players={selection.players}
        selectedPlayerId={selection.selectedPlayerId}
        onChangeSelection={selection.onChange}
        onApplySeason={season.onApply}
        validKitIds={kit.validIds}
        onApplyKit={kit.onApply}
      />
      <ApplySharedOrder onApply={sharedOrder.onApply} />
    </>
  );
}
