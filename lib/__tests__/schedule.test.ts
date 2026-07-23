import { describe, expect, it } from 'vitest';
import { nextGame, postseasonRoundLabel, resolvePostseason, resolveSchedule } from '../schedule';
import type { Game } from '../types';

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
