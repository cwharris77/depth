'use client';

import { Suspense } from 'react';
import type { Player } from '@/lib/types';
import { useApplyQueryParam } from '@/lib/use-apply-query-param';

// Selecting a search hit on a *different* team (NavSwitcher) navigates here via
// `?player=<id>` since the destination page hasn't loaded that player's roster yet.
// Isolated into its own Suspense boundary (useApplyQueryParam's useSearchParams requires one
// during static generation) so the rest of DepthChartField's tree still prerenders statically.
function Inner({ players, onOpen }: { players: Player[]; onOpen: (player: Player) => void }) {
  useApplyQueryParam('player', (id) => {
    const player = players.find((p) => p.id === id);
    if (player) onOpen(player);
  });
  return null;
}

export default function OpenPlayerFromQuery(props: {
  players: Player[];
  onOpen: (player: Player) => void;
}) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}
