// Turns the raw `games` for a team into its regular-season schedule from that team's
// perspective, and finds its next unplayed game (design spec 5a). Pure: no fetch, no DB —
// the read layer (lib/roster-source.db.ts) hands it Game rows and enriches the resolved
// opponent ids into full team metadata for the UI. v1 is regular-season only (postseason
// games are stored but excluded here — spec Out of scope). A bye week is derived (nflverse
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
