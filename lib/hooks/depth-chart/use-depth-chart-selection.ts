'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { buildTeamSelectionUrl } from '@/lib/utils/depth-chart/team-selection';
import type { Player, Unit } from '@/lib/types';

// Player/unit selection for DepthChartField, kept in sync with the URL
// (`?player=&unit=`, mirroring Compare's `?a=&b=&pos=` pattern, DEP-130). Opening a
// player from a closed state pushes a new history entry so Back can close it;
// everything else -- swapping to another player while one's already open, or changing
// unit tabs -- replaces in place, so browsing around doesn't pile up a Back stop per
// click. `season` is threaded through so the URL always carries whichever season is
// active. `changeUnit` only owns unit/selection state and the URL -- resetting
// unit-scoped state elsewhere (the active real formation, lib/hooks/depth-chart/use-formations.ts) is the
// caller's job to compose, since this hook has no knowledge of formations.
export function useDepthChartSelection(season: number | null) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeUnit, setActiveUnit] = useState<Unit>('offense');
  const router = useRouter();
  const pathname = usePathname();
  // Whether the currently-open card was reached by pushing a fresh history entry (a real
  // "open" from a closed state) rather than a mount-time URL restore or swapping to a
  // different player while one was already open. Only a pushed-open card gets undone with
  // router.back() on close (see closePlayer) -- closing anything else just replaces the
  // URL, so it can't pop the user to whatever page happened to precede this load.
  const openedViaPushRef = useRef(false);

  const selectPlayer = (player: Player, unit: Unit) => {
    const wasOpen = selectedPlayer !== null;
    setActiveUnit(unit);
    setSelectedPlayer(player);
    const url = buildTeamSelectionUrl(pathname, { unit, playerId: player.id, season });
    if (wasOpen) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
      openedViaPushRef.current = true;
    }
  };

  const closePlayer = () => {
    setSelectedPlayer(null);
    if (openedViaPushRef.current) {
      openedViaPushRef.current = false;
      router.back();
    } else {
      router.replace(
        buildTeamSelectionUrl(pathname, { unit: activeUnit, playerId: null, season }),
        { scroll: false }
      );
    }
  };

  const changeUnit = (unit: Unit) => {
    setActiveUnit(unit);
    setSelectedPlayer(null);
    openedViaPushRef.current = false;
    router.replace(buildTeamSelectionUrl(pathname, { unit, playerId: null, season }), {
      scroll: false,
    });
  };

  // Used when a season change closes any open card -- the season hook owns writing the
  // new `?season=` URL itself, so this only resets local selection state, no URL write.
  const resetForSeasonChange = () => {
    setSelectedPlayer(null);
    openedViaPushRef.current = false;
  };

  // SyncSelectionWithQuery drives this when the URL changes out from under us -- mount-
  // time restore, browser Back/Forward, or a manual URL edit. The URL already matches by
  // the time this fires, so no router call here; leaving openedViaPushRef false means a
  // later close replaces/strips the param instead of calling router.back() into whatever
  // happened to precede this load.
  const restoreSelectionFromUrl = (player: Player | null, unit: Unit | null) => {
    openedViaPushRef.current = false;
    setSelectedPlayer(player);
    if (unit) setActiveUnit(unit);
  };

  const handlePlayerClick = (player: Player) => {
    if (selectedPlayer?.id === player.id) {
      closePlayer();
    } else {
      selectPlayer(player, activeUnit);
    }
  };

  return {
    selectedPlayer,
    activeUnit,
    selectPlayer,
    closePlayer,
    changeUnit,
    resetForSeasonChange,
    restoreSelectionFromUrl,
    handlePlayerClick,
  };
}
