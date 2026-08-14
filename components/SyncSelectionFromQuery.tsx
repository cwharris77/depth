'use client';

import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Player, Unit } from '@/lib/types';
import { isUnit } from '@/lib/utils/depth-chart/team-selection';
import { unitForPosition } from '@/lib/utils/search/search';
import { useApplyQueryParam } from '@/lib/hooks/use-apply-query-param';

// Consolidates the depth chart page's four selection-related URL params — `?player=`,
// `?unit=`, `?season=`, `?kit=` — into one reader (DEP-184, replaces SyncSelectionWithQuery
// + ApplySeasonFromQuery + ApplyKitFromQuery). Each param keeps its own prior semantics:
//   - player/unit: persistent, loop-guarded against DepthChartField's own state→URL writes.
//   - season: persistent, resets to null on removal (Back/Forward out of a shared link).
//   - kit: one-shot — applied once, then stripped so a reload/reshare is clean.
// `?board=` (SharedBoardBanner) and `?order=` (ApplySharedOrder) stay separate — both do
// their own data-fetch/decode work unrelated to plain selection state.
//
// Isolated into its own Suspense boundary (useSearchParams requires one during static
// generation) so the rest of DepthChartField's tree still prerenders statically.
function Inner({
  players,
  selectedPlayerId,
  onChangeSelection,
  onApplySeason,
  validKitIds,
  onApplyKit,
}: {
  players: Player[];
  selectedPlayerId: string | null;
  onChangeSelection: (player: Player | null, unit: Unit | null) => void;
  onApplySeason: (season: number | null) => void;
  validKitIds: string[];
  onApplyKit: (id: string) => void;
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
  // never to DepthChartField's own writes.
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
      onChangeSelection(null, null);
      return;
    }
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    onChangeSelection(player, isUnit(rawUnit) ? rawUnit : unitForPosition(player.position));
  }, [playerId, rawUnit, players, onChangeSelection]);

  // Unlike player/unit, `season` is not stripped after applying — season links stay
  // shareable through reload and re-share, and DepthChartField keeps the param alive
  // through player/unit changes (see lib/utils/depth-chart/team-selection.ts). `apply(null)`
  // fires when the param is absent so Back/Forward clearing `?season=` resets to the
  // current season.
  useApplyQueryParam(
    'season',
    (raw) => {
      const season = raw ? Number(raw) : null;
      onApplySeason(Number.isInteger(season) ? season : null);
    },
    { strip: false }
  );

  // A shared/bookmarked `/team/[id]?kit=<uniformId>` link opens the page already wearing
  // that kit. One-shot: applied once, then stripped.
  useApplyQueryParam('kit', (kit) => {
    if (kit && validKitIds.includes(kit)) onApplyKit(kit);
  });

  return null;
}

export default function SyncSelectionFromQuery(props: {
  players: Player[];
  selectedPlayerId: string | null;
  onChangeSelection: (player: Player | null, unit: Unit | null) => void;
  onApplySeason: (season: number | null) => void;
  validKitIds: string[];
  onApplyKit: (id: string) => void;
}) {
  // Stable identity so Inner's player/unit effect deps don't churn on every
  // DepthChartField render.
  const onChangeSelection = useCallback(props.onChangeSelection, []);
  return (
    <Suspense fallback={null}>
      <Inner
        players={props.players}
        selectedPlayerId={props.selectedPlayerId}
        onChangeSelection={onChangeSelection}
        onApplySeason={props.onApplySeason}
        validKitIds={props.validKitIds}
        onApplyKit={props.onApplyKit}
      />
    </Suspense>
  );
}
