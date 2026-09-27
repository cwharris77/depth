import { describe, expect, it } from 'vitest';
import { toScheduleAndGameRows } from './games';
import { resolveTeamCode } from './team-codes';
import { assertConserved, countByReason } from '../utils/ingest/drops';

// One nflverse games.csv row (only the columns the transform reads need to be present).
function row(over: Record<string, string>): Record<string, string> {
  return {
    game_id: '2025_01_LA_SEA',
    season: '2025',
    game_type: 'REG',
    week: '1',
    gameday: '2025-09-07',
    gametime: '13:00',
    away_team: 'LA',
    away_score: '',
    home_team: 'SEA',
    home_score: '',
    location: 'Home',
    away_moneyline: '',
    home_moneyline: '',
    spread_line: '',
    away_spread_odds: '',
    home_spread_odds: '',
    total_line: '',
    under_odds: '',
    over_odds: '',
    ...over,
  };
}

describe('toScheduleAndGameRows', () => {
  it('turns one shared game into one game row + a schedule row for each team', () => {
    const { games, schedules, dropped } = toScheduleAndGameRows([row({})], resolveTeamCode);
    expect(dropped).toEqual([]);
    expect(games).toEqual([
      {
        game_id: '2025_01_LA_SEA',
        season: 2025,
        game_type: 'REG',
        week: 1,
        gameday: '2025-09-07',
        gametime: '13:00',
        home_team_id: 'seahawks',
        away_team_id: 'rams',
        home_score: null,
        away_score: null,
        location: 'Home',
        away_moneyline: null,
        home_moneyline: null,
        spread_line: null,
        away_spread_odds: null,
        home_spread_odds: null,
        total_line: null,
        under_odds: null,
        over_odds: null,
        market_updated_at: null,
      },
    ]);
    expect(schedules).toEqual([
      { team_id: 'rams', season: 2025 },
      { team_id: 'seahawks', season: 2025 },
    ]);
  });

  it('parses played scores as numbers and blank scores as null', () => {
    const { games } = toScheduleAndGameRows(
      [row({ home_score: '27', away_score: '13' })],
      resolveTeamCode
    );
    expect(games[0].home_score).toBe(27);
    expect(games[0].away_score).toBe(13);
  });

  it('retains posted pregame market fields with their observation time', () => {
    const { games } = toScheduleAndGameRows(
      [
        row({
          away_moneyline: '+154',
          home_moneyline: '-185',
          spread_line: '3.5',
          away_spread_odds: '-110',
          home_spread_odds: '-110',
          total_line: '45.5',
          under_odds: '-105',
          over_odds: '-115',
        }),
      ],
      resolveTeamCode,
      undefined,
      '2026-08-24T20:00:00.000Z'
    );

    expect(games[0]).toMatchObject({
      away_moneyline: 154,
      home_moneyline: -185,
      spread_line: 3.5,
      away_spread_odds: -110,
      home_spread_odds: -110,
      total_line: 45.5,
      under_odds: -105,
      over_odds: -115,
      market_updated_at: '2026-08-24T20:00:00.000Z',
    });
  });

  it('preserves neutral-site designation for the designated home and away teams', () => {
    const { games } = toScheduleAndGameRows(
      [row({ location: 'Neutral', spread_line: '0' })],
      resolveTeamCode,
      undefined,
      '2026-08-24T20:00:00.000Z'
    );

    expect(games[0].location).toBe('Neutral');
    expect(games[0].spread_line).toBe(0);
  });

  it('degrades malformed market numbers to null without dropping the game', () => {
    const { games, dropped } = toScheduleAndGameRows(
      [row({ home_moneyline: 'favorite', spread_line: 'three', total_line: 'NaN' })],
      resolveTeamCode,
      undefined,
      '2026-08-24T20:00:00.000Z'
    );

    expect(dropped).toEqual([]);
    expect(games[0]).toMatchObject({
      home_moneyline: null,
      spread_line: null,
      total_line: null,
      market_updated_at: null,
    });
  });

  it('replaces a moved line and its observation time on the next transform', () => {
    const first = toScheduleAndGameRows(
      [row({ spread_line: '2.5' })],
      resolveTeamCode,
      undefined,
      '2026-08-24T18:00:00.000Z'
    ).games[0];
    const moved = toScheduleAndGameRows(
      [row({ spread_line: '3.5' })],
      resolveTeamCode,
      undefined,
      '2026-08-24T20:00:00.000Z'
    ).games[0];

    expect(first.spread_line).toBe(2.5);
    expect(first.market_updated_at).toBe('2026-08-24T18:00:00.000Z');
    expect(moved.spread_line).toBe(3.5);
    expect(moved.market_updated_at).toBe('2026-08-24T20:00:00.000Z');
  });

  it('dedupes a team-season across its many games', () => {
    const { schedules } = toScheduleAndGameRows(
      [
        row({ game_id: '2025_01_LA_SEA', week: '1', home_team: 'SEA', away_team: 'LA' }),
        row({ game_id: '2025_02_SEA_SF', week: '2', home_team: 'SF', away_team: 'SEA' }),
      ],
      resolveTeamCode
    );
    const seahawksRows = schedules.filter((s) => s.team_id === 'seahawks');
    expect(seahawksRows).toEqual([{ team_id: 'seahawks', season: 2025 }]);
  });

  it('drops a game with an unresolvable team code, naming the code', () => {
    const { games, schedules, dropped } = toScheduleAndGameRows(
      [row({ away_team: 'XXX' }), row({ game_id: '2025_01_SEA_YYY', home_team: 'YYY' })],
      resolveTeamCode
    );
    expect(games).toHaveLength(0);
    expect(schedules).toHaveLength(0);
    expect(dropped).toEqual([
      { reason: 'unknown_team', key: '2025_01_LA_SEA', value: 'XXX' },
      { reason: 'unknown_team', key: '2025_01_SEA_YYY', value: 'YYY' },
    ]);
  });

  it('drops a row with no game_id', () => {
    const { games, dropped } = toScheduleAndGameRows([row({ game_id: ' ' })], resolveTeamCode);
    expect(games).toHaveLength(0);
    expect(dropped).toEqual([{ reason: 'missing_game_id', key: 'row:0' }]);
  });

  it('maps a historic relocation code (STL) to the current franchise', () => {
    const { games } = toScheduleAndGameRows(
      [row({ season: '2015', game_id: '2015_01_STL_SEA', away_team: 'STL', home_team: 'SEA' })],
      resolveTeamCode
    );
    expect(games[0].away_team_id).toBe('rams');
  });

  it('drops a row whose season is not a number', () => {
    const { dropped, games } = toScheduleAndGameRows(
      [row({ season: '' }), row({ season: '2025.5' })],
      resolveTeamCode
    );
    expect(games).toHaveLength(0);
    expect(dropped).toEqual([
      { reason: 'invalid_season', key: '2025_01_LA_SEA', value: '' },
      { reason: 'invalid_season', key: '2025_01_LA_SEA', value: '2025.5' },
    ]);
  });

  it('only keeps the two most recent seasons found in the file', () => {
    const { games, schedules } = toScheduleAndGameRows(
      [
        row({ game_id: '1999_01_LA_SEA', season: '1999' }),
        row({ game_id: '2024_01_LA_SEA', season: '2024' }),
        row({ game_id: '2025_01_LA_SEA', season: '2025' }),
      ],
      resolveTeamCode
    );
    expect(games.map((g) => g.season).sort()).toEqual([2024, 2025]);
    expect(schedules.every((s) => s.season === 2024 || s.season === 2025)).toBe(true);
  });

  it('drops out-of-range seasons with their own reason', () => {
    const { dropped } = toScheduleAndGameRows(
      [
        row({ game_id: '1999_01_LA_SEA', season: '1999' }),
        row({ game_id: '2025_01_LA_SEA', season: '2025' }),
      ],
      resolveTeamCode
    );
    expect(dropped).toEqual([
      { reason: 'out_of_scope_season', key: '1999_01_LA_SEA', value: '1999' },
    ]);
  });

  it('accounts for every input row as a game or a drop', () => {
    const input = [
      row({ game_id: '1999_01_LA_SEA', season: '1999' }),
      row({ game_id: '2024_01_LA_SEA', season: '2024' }),
      row({ game_id: '2025_01_LA_SEA', season: '2025' }),
      row({ game_id: '2025_02_LA_SEA', away_team: 'XXX' }),
      row({ game_id: '', season: '2025' }),
      row({ season: 'x' }),
    ];
    const { games, dropped } = toScheduleAndGameRows(input, resolveTeamCode);
    expect(() => assertConserved('games', input.length, games.length, dropped)).not.toThrow();
    expect(countByReason(dropped)).toEqual({
      invalid_season: 1,
      missing_game_id: 1,
      out_of_scope_season: 1,
      unknown_team: 1,
    });
  });

  it('keeps every season from an explicit minSeason on, not just the two most recent', () => {
    const { games, schedules } = toScheduleAndGameRows(
      [
        row({ game_id: '1999_01_LA_SEA', season: '1999' }),
        row({ game_id: '2010_01_LA_SEA', season: '2010' }),
        row({ game_id: '2025_01_LA_SEA', season: '2025' }),
      ],
      resolveTeamCode,
      2000
    );
    expect(games.map((g) => g.season).sort()).toEqual([2010, 2025]);
    expect(schedules.every((s) => s.season >= 2000)).toBe(true);
  });

  it('an explicit minSeason below every row in the file keeps everything', () => {
    const { games } = toScheduleAndGameRows(
      [
        row({ game_id: '1999_01_LA_SEA', season: '1999' }),
        row({ game_id: '2025_01_LA_SEA', season: '2025' }),
      ],
      resolveTeamCode,
      1999
    );
    expect(games.map((g) => g.season).sort()).toEqual([1999, 2025]);
  });
});
