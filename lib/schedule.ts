// Turns the raw `games` for a team into its regular-season schedule from that team's
// perspective, and finds its next unplayed game (design spec 5a). Pure: no fetch, no DB —
// the read layer (lib/roster-source.db.ts) hands it Game rows and enriches the resolved
// opponent ids into full team metadata for the UI. resolveSchedule is regular-season only;
// postseason games (game_type WC/DIV/CON/SB) are resolved separately by resolvePostseason
// below, for the stats page's postseason section. A bye week is derived (nflverse
// has no bye row): any REG week with no game is the team's bye.

import type { Game } from './types';

// Pure-layer schedule entry: opponent is an id (the DB layer resolves it to abbrev/colors
// for the UI's TeamScheduleGame). `result` is null for an upcoming game or a bye.
export interface ResolvedScheduleGame {
  week: number;
  gameType: string;
  isBye: boolean;
  date: string | null;
  isHome: boolean;
  opponentTeamId: string | null;
  teamScore: number | null;
  oppScore: number | null;
  result: 'W' | 'L' | 'T' | null;
}

function outcome(teamScore: number | null, oppScore: number | null): 'W' | 'L' | 'T' | null {
  if (teamScore === null || oppScore === null) return null; // not played yet
  if (teamScore > oppScore) return 'W';
  if (teamScore < oppScore) return 'L';
  return 'T';
}

export function resolveSchedule(games: Game[], teamId: string): ResolvedScheduleGame[] {
  // Regular season only, and only this team's games (a game names two teams).
  const mine = games.filter(
    (g) => g.gameType === 'REG' && (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  const byWeek = new Map<number, ResolvedScheduleGame>();
  for (const g of mine) {
    if (g.week === null) continue; // a REG game with no week can't be placed on the grid
    const isHome = g.homeTeamId === teamId;
    const teamScore = isHome ? g.homeScore : g.awayScore;
    const oppScore = isHome ? g.awayScore : g.homeScore;
    byWeek.set(g.week, {
      week: g.week,
      gameType: g.gameType,
      isBye: false,
      date: g.gameday,
      isHome,
      opponentTeamId: isHome ? g.awayTeamId : g.homeTeamId,
      teamScore,
      oppScore,
      result: outcome(teamScore, oppScore),
    });
  }

  if (byWeek.size === 0) return [];

  // Fill 1..maxWeek so any gap surfaces as the bye. Deriving maxWeek from the games (not a
  // hardcoded 17/18) makes the era length self-adjusting.
  const maxWeek = Math.max(...byWeek.keys());
  const schedule: ResolvedScheduleGame[] = [];
  for (let week = 1; week <= maxWeek; week++) {
    schedule.push(
      byWeek.get(week) ?? {
        week,
        gameType: 'REG',
        isBye: true,
        date: null,
        isHome: false,
        opponentTeamId: null,
        teamScore: null,
        oppScore: null,
        result: null,
      }
    );
  }
  return schedule;
}

// The earliest unplayed game (an upcoming game the stats page's NEXT GAME card points at),
// skipping byes and already-played games. Null once the regular season is complete.
export function nextGame(schedule: ResolvedScheduleGame[]): ResolvedScheduleGame | null {
  return schedule.find((g) => !g.isBye && g.result === null) ?? null;
}

// A team's postseason games for one season, from that team's perspective, sorted by round
// order (week ascends WC -> DIV -> CON -> SB in nflverse's numbering, so a plain week sort
// suffices). No bye-filling here — a missed round is just an absent row, not a placeholder
// (invariant 6: a team that missed the postseason gets an empty array, not empty rows).
export function resolvePostseason(games: Game[], teamId: string): ResolvedScheduleGame[] {
  const mine = games.filter(
    (g) =>
      g.gameType !== 'REG' &&
      g.week !== null &&
      (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  return mine
    .map((g) => {
      const isHome = g.homeTeamId === teamId;
      const teamScore = isHome ? g.homeScore : g.awayScore;
      const oppScore = isHome ? g.awayScore : g.homeScore;
      return {
        week: g.week as number,
        gameType: g.gameType,
        isBye: false,
        date: g.gameday,
        isHome,
        opponentTeamId: isHome ? g.awayTeamId : g.homeTeamId,
        teamScore,
        oppScore,
        result: outcome(teamScore, oppScore),
      };
    })
    .sort((a, b) => a.week - b.week);
}

// nflverse's raw postseason game_type -> a fan-facing round label for the stats page.
// An unrecognized code degrades to itself rather than throwing (invariant 6).
const POSTSEASON_ROUND_LABELS: Record<string, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CON: 'Conference',
  SB: 'Super Bowl',
};

export function postseasonRoundLabel(gameType: string): string {
  return POSTSEASON_ROUND_LABELS[gameType] ?? gameType;
}
