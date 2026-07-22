// Pure derivations for the desktop schedule context panel (components/SchedulePanel.tsx):
// season record, home/road splits, win streak, recent form, and the next unplayed game —
// all computed from the one team's already-resolved schedule prop. The schedule page
// already ships every played result, so the panel adds no second data dependency (no
// team_stats fetch, AGENTS.md invariant 5). Kept out of the component so the record/streak
// wording is unit-tested rather than buried in JSX.
import type { TeamScheduleGame } from '@/lib/types';

export interface ScheduleSummary {
  // "12-5", with a ties suffix only when there is one ("12-4-1") — same shape
  // TeamStatsView renders for the season record.
  record: string;
  homeRecord: string;
  roadRecord: string;
  // "W3" / "L1" for the current run of identical results; null before any game has
  // been played (degrade, don't fake a streak — invariant 6).
  streak: string | null;
  // Up to the last five played results, oldest first.
  recentForm: ('W' | 'L' | 'T')[];
  // First unplayed non-bye game with a resolved opponent; null once the season is done
  // (or the opponent reference dangles — skip, don't throw).
  nextGame: TeamScheduleGame | null;
}

function formatRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function scheduleSummary(games: TeamScheduleGame[]): ScheduleSummary {
  const played = games.filter((g) => !g.isBye && g.result !== null);

  const count = (results: TeamScheduleGame[], r: 'W' | 'L' | 'T') =>
    results.filter((g) => g.result === r).length;
  const home = played.filter((g) => g.isHome);
  const road = played.filter((g) => !g.isHome);

  // Current streak: the run of identical results at the tail of the played list.
  let streak: string | null = null;
  const last = played[played.length - 1];
  if (last?.result) {
    let run = 0;
    for (let i = played.length - 1; i >= 0 && played[i].result === last.result; i--) {
      run++;
    }
    streak = `${last.result}${run}`;
  }

  return {
    record: formatRecord(count(played, 'W'), count(played, 'L'), count(played, 'T')),
    homeRecord: formatRecord(count(home, 'W'), count(home, 'L'), count(home, 'T')),
    roadRecord: formatRecord(count(road, 'W'), count(road, 'L'), count(road, 'T')),
    streak,
    recentForm: played.slice(-5).map((g) => g.result as 'W' | 'L' | 'T'),
    nextGame: games.find((g) => !g.isBye && g.result === null && g.opponent !== null) ?? null,
  };
}
