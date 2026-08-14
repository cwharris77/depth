'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Player, Unit } from '@/lib/types';
import { isUnit } from '@/lib/utils/depth-chart/team-selection';
import { unitForPosition } from '@/lib/utils/search/search';

// Keeps DepthChartField's selection state following `?player=&unit=` whenever the URL
// changes out from under it — not just at mount. That covers three cases with one
// mechanism: the initial load (reload, a shared link, or the cross-team `?player=`
// handoff from NavSwitcher/TeamRail), the browser's own Back/Forward buttons (a same-page
// history pop that doesn't remount this component), and manual URL edits. DepthChartField
// itself owns the *other* direction (state -> URL) via router.push/replace in
// selectPlayer/closePlayer/changeUnit; the `selectedPlayerId` comparison below is what
// keeps those two directions from fighting — a change this component's own last write
// already applied is a no-op here, so nothing loops.
//
// Isolated into its own Suspense boundary (useSearchParams requires one during static
// generation) so the rest of DepthChartField's tree still prerenders statically.
function Inner({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: Player[];
  selectedPlayerId: string | null;
  onChange: (player: Player | null, unit: Unit | null) => void;
}) {
  const searchParams = useSearchParams();
  const playerId = searchParams.get('player');
  const rawUnit = searchParams.get('unit');

  // Read via a ref, not a dependency: closePlayer's own setSelectedPlayer(null) commits
  // (and this component re-renders with a new selectedPlayerId) a tick before
  // router.back()'s URL change actually lands. If selectedPlayerId were a dependency,
  // that local-state-driven re-render would re-run this effect against the still-stale
  // URL, find the just-closed player still in `?player=`, and reopen the card out from
  // under the very close that triggered it (reported bug: swipe-to-close/the X button
  // silently reverted). Depending only on the URL-derived values means this effect only
  // ever reacts to a genuine URL change (Back/Forward, initial load, a manual edit),
  // never to DepthChartField's own writes -- exactly the "not just at mount" cases in
  // the comment above, no more.
  const selectedPlayerIdRef = useRef(selectedPlayerId);
  selectedPlayerIdRef.current = selectedPlayerId;

  // Genuine effect, not a derived-render value: DepthChartField's selection state lives
  // in a sibling component, so reacting to a URL change (in particular the browser's own
  // Back/Forward, which nothing in this tree initiates) means calling that sibling's
  // setState imperatively — React doesn't allow setting another component's state during
  // render. There's no lazy-init or useSyncExternalStore substitute either: this needs to
  // re-run on every navigation the *browser* drives, not just once at mount.
  useEffect(() => {
    if (playerId === selectedPlayerIdRef.current) return;
    if (!playerId) {
      onChange(null, null);
      return;
    }
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    onChange(player, isUnit(rawUnit) ? rawUnit : unitForPosition(player.position));
  }, [playerId, rawUnit, players, onChange]);

  return null;
}

export default function SyncSelectionWithQuery(props: {
  players: Player[];
  selectedPlayerId: string | null;
  onChange: (player: Player | null, unit: Unit | null) => void;
}) {
  // Stable identity so Inner's effect deps don't churn on every DepthChartField render.
  const onChange = useCallback(props.onChange, []);
  return (
    <Suspense fallback={null}>
      <Inner
        players={props.players}
        selectedPlayerId={props.selectedPlayerId}
        onChange={onChange}
      />
    </Suspense>
  );
}
