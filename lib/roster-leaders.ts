// Picks a team's single passing/rushing/receiving leader for its latest season and
// formats each into the one-line summary the stats page renders (design spec 5a's
// ROSTER LEADERS block). Pure: no fetch, no DB — the read layer (lib/roster-source.db.ts
// getRosterLeaders) hands it every player's season rows and this decides the leaders.
// A category with no positive yardage degrades to null rather than a zeroed row (the
// repo's "show nothing, not zeros" posture, cf. lib/stat-lines.ts).

import type { Leader, PlayerSeasonStats, RosterLeaders } from './types';

export interface LeaderEntry {
  playerId: string;
  name: string;
  stats: PlayerSeasonStats;
}

function n(value: number | null): number {
  return value ?? 0;
}

// Thousands separators without depending on Intl/ICU locale data — hand-rolled to keep
// output identical across environments (prerender vs. dev vs. test).
function grp(value: number | null): string {
  return String(n(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Highest `yards` wins; strictly-greater comparison from a 0 floor means a category with
// no positive yardage yields no leader, and ties keep the first entry seen.
function topBy(
  entries: LeaderEntry[],
  yards: (s: PlayerSeasonStats) => number | null,
  line: (s: PlayerSeasonStats) => string
): Leader | null {
  let best: LeaderEntry | null = null;
  let bestYards = 0;
  for (const e of entries) {
    const y = n(yards(e.stats));
    if (y > bestYards) {
      bestYards = y;
      best = e;
    }
  }
  return best ? { playerId: best.playerId, name: best.name, line: line(best.stats) } : null;
}

export function rosterLeaders(entries: LeaderEntry[]): RosterLeaders | null {
  if (entries.length === 0) return null;
  // Leaders describe the current roster's most recent production, so scope to the newest
  // season present and ignore older rows (a player's prior-team seasons, backfilled history).
  const season = Math.max(...entries.map((e) => e.stats.season));
  const inSeason = entries.filter((e) => e.stats.season === season);

  return {
    season,
    passing: topBy(
      inSeason,
      (s) => s.passingYards,
      (s) =>
        `${n(s.completions)}/${n(s.attempts)} · ${grp(s.passingYards)} yds · ${n(s.passingTds)} TD`
    ),
    rushing: topBy(
      inSeason,
      (s) => s.rushingYards,
      (s) => `${n(s.carries)} car · ${grp(s.rushingYards)} yds · ${n(s.rushingTds)} TD`
    ),
    receiving: topBy(
      inSeason,
      (s) => s.receivingYards,
      (s) => `${n(s.receptions)} rec · ${grp(s.receivingYards)} yds · ${n(s.receivingTds)} TD`
    ),
  };
}
