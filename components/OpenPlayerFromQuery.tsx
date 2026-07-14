'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/lib/types';

// Selecting a search hit on a *different* team (NavSwitcher) navigates here via
// `?player=<id>` since the destination page hasn't loaded that player's roster yet.
// Isolated into its own Suspense boundary (useSearchParams requires one during static
// generation) so the rest of DepthChartField's tree still prerenders statically.
function Inner({ players, onOpen }: { players: Player[]; onOpen: (player: Player) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const id = searchParams.get('player');
    if (!id) return;
    const player = players.find((p) => p.id === id);
    if (player) onOpen(player);
    router.replace(pathname, { scroll: false });
    // Runs once per navigation that carries a `?player=` param; `players`/`onOpen` are
    // stable for the page's lifetime.
  }, [searchParams]);

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
