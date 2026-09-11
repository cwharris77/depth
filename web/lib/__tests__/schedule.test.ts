import { describe, expect, it } from 'vitest';
import {
  nextGame,
  normalizeViewedSeason,
  postseasonRoundLabel,
  resolvePostseason,
  resolveSchedule,
} from '@/lib/utils/schedule/schedule';
import type { Game } from '@/lib/types';

// Minimal Game fixture; only the fields a case exercises need to be set.
function game(over: Partial<Game>): Game {
  return {
    gameId: 'g',
    season: 2025,
    gameType: 'REG',
    week: 1,
    gameday: '2025-09-07',
    gametime: null,
    homeTeamId: 'seahawks',
    awayTeamId: 'rams',
    homeScore: null,
    awayScore: null,
    location: 'Home',
    homeMoneyline: null,
    awayMoneyline: null,
    spreadLine: null,
    homeSpreadOdds: null,
    awaySpreadOdds: null,
    totalLine: null,
    underOdds: null,
    overOdds: null,
    marketUpdatedAt: null,
    ...over,
  };
}

describe('resolveSchedule', () => {
  it('resolves a home win from the team perspective', () => {
    const [g] = resolveSchedule(
      [game({ week: 1, homeTeamId: 'seahawks', awayTeamId: 'rams', homeScore: 27, awayScore: 13 })],
      'seahawks'
    );
    expect(g).toMatchObject({
      week: 1,
      isBye: false,
      isHome: true,
      opponentTeamId: 'rams',
      teamScore: 27,
      oppScore: 13,
      result: 'W',
    });
  });

  it('resolves an away loss from the team perspective', () => {
    const [g] = resolveSchedule(
      [game({ week: 1, homeTeamId: 'rams', awayTeamId: 'seahawks', homeScore: 24, awayScore: 10 })],
      'seahawks'
    );
    expect(g).toMatchObject({
      isHome: false,
      opponentTeamId: 'rams',
      teamScore: 10,
      oppScore: 24,
      result: 'L',
    });
  });

  it('resolves a tie', () => {
    const [g] = resolveSchedule([game({ homeScore: 20, awayScore: 20 })], 'seahawks');
    expect(g.result).toBe('T');
  });

  it('leaves result null for an unplayed (upcoming) game', () => {
    const [g] = resolveSchedule([game({ homeScore: null, awayScore: null })], 'seahawks');
    expect(g.result).toBeNull();
    expect(g.isBye).toBe(false);
  });

  it('carries the market snapshot from the selected team’s perspective', () => {
    const [g] = resolveSchedule(
      [
        game({
          homeTeamId: 'rams',
          awayTeamId: 'seahawks',
          location: 'Neutral',
          homeMoneyline: -130,
          awayMoneyline: 110,
          spreadLine: 2.5,
          homeSpreadOdds: -112,
          awaySpreadOdds: -108,
          totalLine: 44.5,
          underOdds: -105,
          overOdds: -115,
          marketUpdatedAt: '2026-08-24T20:00:00.000Z',
        }),
      ],
      'seahawks'
    );

    expect(g.market).toMatchObject({
      teamMoneyline: 110,
      opponentMoneyline: -130,
      teamSpread: 2.5,
      teamSpreadOdds: -108,
      opponentSpreadOdds: -112,
      totalLine: 44.5,
      isNeutralSite: true,
      source: 'nflverse',
      updatedAt: '2026-08-24T20:00:00.000Z',
    });
  });

  it('inserts a bye for a missing regular-season week', () => {
    const schedule = resolveSchedule(
      [game({ week: 1 }), game({ week: 2 }), game({ week: 4 })],
      'seahawks'
    );
    expect(schedule.map((g) => g.week)).toEqual([1, 2, 3, 4]);
    const bye = schedule.find((g) => g.week === 3);
    expect(bye?.isBye).toBe(true);
    expect(bye?.opponentTeamId).toBeNull();
  });

  it('excludes postseason games and games the team is not in', () => {
    const schedule = resolveSchedule(
      [
        game({ week: 1, gameType: 'REG' }),
        game({ week: 20, gameType: 'WC', homeTeamId: 'seahawks', awayTeamId: 'cowboys' }),
        game({ week: 1, gameType: 'REG', homeTeamId: 'jets', awayTeamId: 'bills' }),
      ],
      'seahawks'
    );
    expect(schedule).toHaveLength(1);
    expect(schedule[0].gameType).toBe('REG');
  });
});

describe('nextGame', () => {
  it('picks the earliest unplayed game, skipping byes and played games', () => {
    const schedule = resolveSchedule(
      [
        game({ week: 1, homeScore: 27, awayScore: 13 }), // played
        game({ week: 3, homeScore: null, awayScore: null }), // upcoming
        game({ week: 4, homeScore: null, awayScore: null }), // upcoming, later
      ],
      'seahawks'
    );
    // week 2 is a bye (missing). next unplayed should be week 3, not the bye.
    expect(nextGame(schedule)?.week).toBe(3);
  });

  it('returns null when every game has been played', () => {
    const schedule = resolveSchedule([game({ week: 1, homeScore: 27, awayScore: 13 })], 'seahawks');
    expect(nextGame(schedule)).toBeNull();
  });
});

describe('resolvePostseason', () => {
  it('resolves a postseason win from the team perspective', () => {
    const [g] = resolvePostseason(
      [
        game({
          week: 20,
          gameType: 'WC',
          homeTeamId: 'seahawks',
          awayTeamId: 'cowboys',
          homeScore: 24,
          awayScore: 17,
        }),
      ],
      'seahawks'
    );
    expect(g).toMatchObject({
      gameType: 'WC',
      isHome: true,
      opponentTeamId: 'cowboys',
      teamScore: 24,
      oppScore: 17,
      result: 'W',
    });
  });

  it('excludes regular-season games and games the team is not in', () => {
    const resolved = resolvePostseason(
      [
        game({ week: 1, gameType: 'REG' }),
        game({ week: 21, gameType: 'DIV', homeTeamId: 'jets', awayTeamId: 'bills' }),
      ],
      'seahawks'
    );
    expect(resolved).toHaveLength(0);
  });

  it('returns an empty array for a team that missed the postseason', () => {
    const resolved = resolvePostseason([game({ week: 1, gameType: 'REG' })], 'seahawks');
    expect(resolved).toEqual([]);
  });

  // Guards the filter against the DEP-204 preseason ingest: 'PRE' is not REG, so a
  // negated filter treated it as a postseason round and would have rendered it under
  // POSTSEASON labelled "PRE".
  it('excludes preseason games, not just regular-season ones', () => {
    const resolved = resolvePostseason(
      [game({ week: 1, gameType: 'PRE', homeTeamId: 'seahawks', awayTeamId: 'cowboys' })],
      'seahawks'
    );
    expect(resolved).toEqual([]);
  });

  it('sorts multiple postseason games by round order (week ascending)', () => {
    const resolved = resolvePostseason(
      [
        game({ week: 22, gameType: 'SB', homeTeamId: 'seahawks', awayTeamId: 'chiefs' }),
        game({ week: 20, gameType: 'WC', homeTeamId: 'seahawks', awayTeamId: 'cowboys' }),
        game({ week: 21, gameType: 'DIV', homeTeamId: 'seahawks', awayTeamId: '49ers' }),
      ],
      'seahawks'
    );
    expect(resolved.map((g) => g.gameType)).toEqual(['WC', 'DIV', 'SB']);
  });

  it('skips a postseason game with no week', () => {
    const resolved = resolvePostseason(
      [game({ week: null, gameType: 'WC', homeTeamId: 'seahawks', awayTeamId: 'cowboys' })],
      'seahawks'
    );
    expect(resolved).toEqual([]);
  });
});

describe('postseasonRoundLabel', () => {
  it('maps known nflverse postseason codes to fan-facing labels', () => {
    expect(postseasonRoundLabel('WC')).toBe('Wild Card');
    expect(postseasonRoundLabel('DIV')).toBe('Divisional');
    expect(postseasonRoundLabel('CON')).toBe('Conference');
    expect(postseasonRoundLabel('SB')).toBe('Super Bowl');
  });

  it('degrades to the raw code for an unrecognized value', () => {
    expect(postseasonRoundLabel('XYZ')).toBe('XYZ');
  });
});

describe('normalizeViewedSeason', () => {
  // 2026 as current, 1999 as the coverage floor — the schedule page's real bounds.
  const CURRENT = 2026;
  const MIN = 1999;

  it('null means the default view', () => {
    expect(normalizeViewedSeason(null, CURRENT, MIN)).toBeNull();
  });

  it('keeps a season within the covered range below current', () => {
    expect(normalizeViewedSeason(2010, CURRENT, MIN)).toBe(2010);
  });

  it('keeps the floor season', () => {
    expect(normalizeViewedSeason(1999, CURRENT, MIN)).toBe(1999);
  });

  it('normalizes the current season to the default view (no double fetch)', () => {
    expect(normalizeViewedSeason(2026, CURRENT, MIN)).toBeNull();
  });

  it('clamps a season below coverage to the default view', () => {
    expect(normalizeViewedSeason(1998, CURRENT, MIN)).toBeNull();
  });

  it('clamps a future season to the default view', () => {
    expect(normalizeViewedSeason(2027, CURRENT, MIN)).toBeNull();
  });
});
