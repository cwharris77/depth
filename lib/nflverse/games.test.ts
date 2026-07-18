import { describe, expect, it } from 'vitest';
import { toScheduleAndGameRows } from './games';
import { resolveTeamCode } from './team-codes';

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
    ...over,
  };
}

describe('toScheduleAndGameRows', () => {
  it('turns one shared game into one game row + a schedule row for each team', () => {
    const { games, schedules, skipped } = toScheduleAndGameRows([row({})], resolveTeamCode);
    expect(skipped).toBe(0);
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

  it('skips and counts a game with an unresolvable team code', () => {
    const { games, schedules, skipped } = toScheduleAndGameRows(
      [row({ away_team: 'XXX' })],
      resolveTeamCode
    );
    expect(games).toHaveLength(0);
    expect(schedules).toHaveLength(0);
    expect(skipped).toBe(1);
  });

  it('maps a historic relocation code (STL) to the current franchise', () => {
    const { games } = toScheduleAndGameRows(
      [row({ season: '2015', game_id: '2015_01_STL_SEA', away_team: 'STL', home_team: 'SEA' })],
      resolveTeamCode
    );
    expect(games[0].away_team_id).toBe('rams');
  });

  it('skips a row whose season is not a number', () => {
    const { skipped, games } = toScheduleAndGameRows([row({ season: '' })], resolveTeamCode);
    expect(games).toHaveLength(0);
    expect(skipped).toBe(1);
  });
});
