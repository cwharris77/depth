import type { Position } from '../types';
import { resolveOlSide, type RosterPosition } from './positions';

// Historical rosters (nflverse's roster_<season>.csv) carry no real depth order, so
// depth_rank is computed at ingest from that season's usage stats
// (stats_player_reg_<season>.csv), joined by gsis_id. Usage score by position group is
// the locked decision from docs/superpowers/specs/2026-07-07-phase-d-history-and-boards-
// design.md: the best available proxy for who actually played, without needing a real
// depth-chart feed for seasons nflverse never published one for. Pure -- no fetch, no DB.

export interface UsageStatsRow {
  attempts: number | null;
  carries: number | null;
  targets: number | null;
  games: number | null;
  defTacklesSolo: number | null;
  defSacks: number | null;
  defInterceptions: number | null;
  fgAtt: number | null;
}

function n(v: number | null | undefined): number {
  return v ?? 0;
}

export function usageScore(position: RosterPosition, stats: UsageStatsRow | undefined): number {
  if (!stats) return 0;
  switch (position) {
    case 'QB':
      return n(stats.attempts);
    case 'RB':
      return n(stats.carries) + n(stats.targets);
    case 'WR':
    case 'TE':
      return n(stats.targets);
    case 'LT':
    case 'LG':
    case 'C':
    case 'RG':
    case 'RT':
    case 'OL_TACKLE':
    case 'OL_GUARD':
      return n(stats.games);
    case 'DE':
    case 'DT':
    case 'LB':
    case 'CB':
    case 'S':
      return n(stats.defTacklesSolo) + 3 * (n(stats.defSacks) + n(stats.defInterceptions));
    case 'K':
      return n(stats.fgAtt);
    case 'P':
    case 'LS':
    case 'KR':
    case 'PR':
      return n(stats.games);
    default:
      return 0;
  }
}

export interface UsageEntry<T> {
  item: T;
  position: RosterPosition;
  number: number;
  usage: number;
}

export interface RankedEntry<T> {
  item: T;
  position: Position;
  depthRank: 1 | 2 | 3;
  // Full-precision 1-based rank within (team, position) -- kept even past the
  // depthRank-3 cap so a future "show the whole roster" view isn't blocked by it.
  playerOrder: number;
}

// Ranks a group of same-team entries by usage (desc), ties broken by jersey number
// (asc, locked decision). depthRank caps at 3; playerOrder keeps the full order. OL
// tackle/guard groups additionally get their real side assigned here, by rank order
// (see resolveOlSide) -- entries must already be scoped to one team before calling this
// (it does not group by team itself, only by position within whatever it's given).
export function rankByUsage<T>(entries: UsageEntry<T>[]): RankedEntry<T>[] {
  const byPosition = new Map<RosterPosition, UsageEntry<T>[]>();
  for (const entry of entries) {
    const group = byPosition.get(entry.position) ?? [];
    group.push(entry);
    byPosition.set(entry.position, group);
  }

  const ranked: RankedEntry<T>[] = [];
  for (const [position, group] of byPosition) {
    const sorted = [...group].sort((a, b) => b.usage - a.usage || a.number - b.number);
    sorted.forEach((entry, i) => {
      ranked.push({
        item: entry.item,
        position: resolveOlSide(position, i),
        depthRank: Math.min(i + 1, 3) as 1 | 2 | 3,
        playerOrder: i + 1,
      });
    });
  }
  return ranked;
}
