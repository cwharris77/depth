// Resolves the season stats PlayerCard renders. Team pages prefetch every roster
// player's stats server-side (`playerStatsMap`) — when that's present, stats are
// derived directly during render with no state or effect (avoids mirroring a prop
// into state). Only the legacy fallback (no map) needs real fetch state, aborted on
// player change so a slow response for a since-dismissed player can't clobber the
// next player's stats.
import { useEffect, useState } from 'react';
import type { Player, PlayerSeasonStats } from '@/lib/types';

export function usePlayerCardStats(
  player: Player | null,
  playerStatsMap?: Map<string, PlayerSeasonStats[]>
): { seasonStats: PlayerSeasonStats[]; statsLoading: boolean } {
  const [fetchedStats, setFetchedStats] = useState<PlayerSeasonStats[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (playerStatsMap) return;
    setFetchedStats([]);
    setFetchLoading(true);
    if (!player) return;
    const controller = new AbortController();
    fetch(`/api/players/${player.id}/stats`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { stats: [] }))
      .then((data: { stats: PlayerSeasonStats[] }) => {
        setFetchedStats(data.stats);
        setFetchLoading(false);
      })
      .catch(() => {
        // aborted, or the fetch failed -- render nothing (no error state)
        setFetchLoading(false);
      });
    return () => controller.abort();
  }, [player?.id, playerStatsMap]);

  if (playerStatsMap) {
    return {
      seasonStats: player ? (playerStatsMap.get(player.id) ?? []) : [],
      statsLoading: false,
    };
  }
  return { seasonStats: fetchedStats, statsLoading: fetchLoading };
}
