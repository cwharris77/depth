import { describe, expect, it } from 'vitest';
import { toCoachSeasonRows } from './coach-history';

const codes: Record<string, string> = { SEA: 'seahawks', SF: '49ers', PIT: 'steelers' };
const resolve = (code: string) => codes[code] ?? null;

// One games.csv row: SEA hosting SF in a regular-season game unless overridden.
function game(over: Record<string, string>): Record<string, string> {
  return {
    season: '2010',
    game_type: 'REG',
    week: '1',
    home_team: 'SEA',
    away_team: 'SF',
    home_coach: 'Pete Carroll',
    away_coach: 'Mike Singletary',
    home_score: '24',
    away_score: '17',
    ...over,
  };
}

const range = { fromSeason: 1999, throughSeason: 2022 };

describe('toCoachSeasonRows', () => {
  it('credits the coach of most regular-season games, ignoring the postseason', () => {
    const rows = toCoachSeasonRows(
      [
        game({ week: '1', away_coach: 'Mike Singletary' }),
        game({ week: '2', away_coach: 'Mike Singletary' }),
        game({ week: '3', away_coach: 'Jim Tomsula' }),
        game({ week: '19', game_type: 'WC', away_coach: 'Jim Tomsula' }),
        game({ week: '20', game_type: 'DIV', away_coach: 'Jim Tomsula' }),
      ],
      resolve,
      range
    );
    expect(rows.find((r) => r.team_id === '49ers')?.coach_name).toBe('Mike Singletary');
  });

  it('breaks a tie toward the coach of the final regular-season game', () => {
    const rows = toCoachSeasonRows(
      [
        game({ week: '2', away_coach: 'Mike Singletary' }),
        game({ week: '1', away_coach: 'Mike Singletary' }),
        game({ week: '4', away_coach: 'Jim Tomsula' }),
        game({ week: '3', away_coach: 'Jim Tomsula' }),
      ],
      resolve,
      range
    );
    expect(rows.find((r) => r.team_id === '49ers')?.coach_name).toBe('Jim Tomsula');
  });

  it('counts consecutive seasons with the team and resets on a change', () => {
    const rows = toCoachSeasonRows(
      [
        game({ season: '2010' }),
        game({ season: '2011' }),
        game({ season: '2012', home_coach: 'Someone Else' }),
        game({ season: '2013' }),
      ],
      resolve,
      range
    );
    expect(rows.filter((r) => r.team_id === 'seahawks').map((r) => r.coach_experience)).toEqual([
      1, 2, 1, 1,
    ]);
  });

  it('starts a pre-1999 tenure at its real first season', () => {
    const rows = toCoachSeasonRows(
      [
        game({ season: '1999', home_team: 'PIT', home_coach: 'Bill Cowher' }),
        game({ season: '2000', home_team: 'PIT', home_coach: 'Bill Cowher' }),
      ],
      resolve,
      range
    );
    expect(rows.filter((r) => r.team_id === 'steelers').map((r) => r.coach_experience)).toEqual([
      8, 9,
    ]);
  });

  it('keeps tenure from earlier seasons when the output starts later', () => {
    const rows = toCoachSeasonRows(
      [game({ season: '2020' }), game({ season: '2021' }), game({ season: '2023' })],
      resolve,
      { fromSeason: 2021, throughSeason: 2022 }
    );
    expect(rows.filter((r) => r.team_id === 'seahawks')).toEqual([
      {
        team_id: 'seahawks',
        season: 2021,
        coach_name: 'Pete Carroll',
        coach_experience: 2,
        source: 'nflverse',
      },
    ]);
  });

  it('leaves a season with an unplayed regular-season game to the live ingest', () => {
    const rows = toCoachSeasonRows(
      [game({ season: '2022', week: '1' }), game({ season: '2022', week: '2', home_score: '' })],
      resolve,
      range
    );
    expect(rows).toEqual([]);
  });

  it('skips unresolved team codes and blank coaches', () => {
    const rows = toCoachSeasonRows([game({ home_team: 'XXX', away_coach: '' })], resolve, range);
    expect(rows).toEqual([]);
  });
});
