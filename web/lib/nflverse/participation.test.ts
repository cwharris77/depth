import { describe, expect, it } from 'vitest';
import { tallyFormations, type ParticipationRow } from './participation';
import { assertConserved, countByReason } from '../utils/ingest/drops';

const resolve = (code: string) => (code === 'SEA' ? 'seahawks' : code === 'SF' ? '49ers' : null);

function row(over: Partial<ParticipationRow>): ParticipationRow {
  return {
    nflverse_game_id: '2024_01_SEA_DEN',
    possession_team: 'SEA',
    offense_formation: 'SHOTGUN',
    offense_personnel: '1 RB, 1 TE, 3 WR',
    ...over,
  };
}

describe('tallyFormations', () => {
  it('counts plays into ranked (alignment, personnelCode) combos with pct', () => {
    const rows = [
      ...Array.from({ length: 6 }, () => row({})), // SHOTGUN 11
      ...Array.from({ length: 3 }, () =>
        row({ offense_formation: 'UNDER CENTER', offense_personnel: '2 RB, 1 TE, 2 WR' })
      ), // UNDER CENTER 21
      ...Array.from({ length: 1 }, () =>
        row({ offense_formation: 'PISTOL', offense_personnel: '1 RB, 2 TE, 2 WR' })
      ), // PISTOL 12
    ];
    const { tallies, skippedTeams } = tallyFormations(
      rows,
      2024,
      resolve,
      new Map([['seahawks', 1]])
    );
    expect(skippedTeams).toEqual([]);
    expect(tallies).toEqual([
      {
        team_id: 'seahawks',
        season: 2024,
        rank: 1,
        alignment: 'SHOTGUN',
        personnel: '11',
        pct: 60,
      },
      {
        team_id: 'seahawks',
        season: 2024,
        rank: 2,
        alignment: 'UNDER CENTER',
        personnel: '21',
        pct: 30,
      },
      { team_id: 'seahawks', season: 2024, rank: 3, alignment: 'PISTOL', personnel: '12', pct: 10 },
    ]);
  });

  it('excludes blank-alignment rows from aggregation and totals', () => {
    const rows = [row({}), row({ offense_formation: '' }), row({ offense_formation: '' })];
    const { tallies, dropped, consumed } = tallyFormations(
      rows,
      2024,
      resolve,
      new Map([['seahawks', 1]])
    );
    expect(consumed).toBe(1);
    expect(dropped).toEqual([
      { reason: 'blank_formation', key: '2024_01_SEA_DEN#1' },
      { reason: 'blank_formation', key: '2024_01_SEA_DEN#2' },
    ]);
    expect(tallies).toEqual([
      {
        team_id: 'seahawks',
        season: 2024,
        rank: 1,
        alignment: 'SHOTGUN',
        personnel: '11',
        pct: 100,
      },
    ]);
  });

  it('keeps every combo uncapped (DEP-141), breaking ties by count then alphabetically', () => {
    const rows = [
      row({ offense_personnel: '1 RB, 1 TE, 3 WR' }), // SHOTGUN 11 x1
      row({ offense_formation: 'UNDER CENTER', offense_personnel: '1 RB, 1 TE, 3 WR' }), // UNDER CENTER 11 x1
      row({ offense_formation: 'PISTOL', offense_personnel: '1 RB, 1 TE, 3 WR' }), // PISTOL 11 x1
      row({ offense_formation: 'SHOTGUN', offense_personnel: '2 RB, 1 TE, 2 WR' }), // SHOTGUN 21 x1
    ];
    const { tallies } = tallyFormations(rows, 2024, resolve, new Map([['seahawks', 1]]));
    expect(tallies).toHaveLength(4);
    expect(tallies.map((t) => `${t.alignment} ${t.personnel}`)).toEqual([
      'PISTOL 11',
      'SHOTGUN 11',
      'SHOTGUN 21',
      'UNDER CENTER 11',
    ]);
  });

  it('treats a team below the coverage threshold as no data (excluded entirely)', () => {
    // 1 charted game out of 4 actual games played -- 25% coverage, below the 50% bar.
    const rows = [row({}), row({})];
    const { tallies, skippedTeams, consumed, dropped } = tallyFormations(
      rows,
      2024,
      resolve,
      new Map([['seahawks', 4]])
    );
    expect(tallies).toEqual([]);
    expect(skippedTeams).toEqual(['seahawks']);
    expect(consumed).toBe(0);
    expect(dropped).toEqual([
      { reason: 'below_coverage', key: '2024_01_SEA_DEN#0', value: 'seahawks' },
      { reason: 'below_coverage', key: '2024_01_SEA_DEN#1', value: 'seahawks' },
    ]);
  });

  it('includes a team with unknown total games rather than guessing it out', () => {
    const rows = [row({})];
    const { tallies, skippedTeams } = tallyFormations(rows, 2024, resolve, new Map());
    expect(skippedTeams).toEqual([]);
    expect(tallies).toHaveLength(1);
  });

  it('drops rows with an unresolvable team code, naming the code', () => {
    const rows = [row({ possession_team: 'XXX' })];
    const { tallies, dropped } = tallyFormations(rows, 2024, resolve, new Map());
    expect(tallies).toEqual([]);
    expect(dropped).toEqual([{ reason: 'unknown_team', key: '2024_01_SEA_DEN#0', value: 'XXX' }]);
  });

  it('drops a row whose personnel does not total 5 skill players (mislabeled ST snap)', () => {
    const stPersonnel = '1 C, 1 CB, 1 FB, 1 FS, 1 ILB, 1 LS, 1 OLB, 1 P, 1 SS, 1 TE, 1 WR';
    const rows = [row({}), row({ offense_formation: 'SHOTGUN', offense_personnel: stPersonnel })];
    const { tallies, dropped } = tallyFormations(rows, 2024, resolve, new Map([['seahawks', 1]]));
    expect(dropped).toEqual([
      { reason: 'invalid_personnel', key: '2024_01_SEA_DEN#1', value: stPersonnel },
    ]);
    expect(tallies).toHaveLength(1);
    expect(tallies[0].pct).toBe(100);
  });

  it('aggregates multiple teams independently', () => {
    const rows = [
      row({ possession_team: 'SEA' }),
      row({ possession_team: 'SF', nflverse_game_id: '2024_01_SEA_SF' }),
    ];
    const { tallies } = tallyFormations(
      rows,
      2024,
      resolve,
      new Map([
        ['seahawks', 1],
        ['49ers', 1],
      ])
    );
    expect(tallies.map((t) => t.team_id).sort()).toEqual(['49ers', 'seahawks']);
  });

  it('accounts for every row seen as consumed or dropped', () => {
    const rows = [
      row({}),
      row({}),
      row({ offense_formation: '' }),
      row({ possession_team: 'XXX' }),
      row({ possession_team: '' }),
      row({ offense_personnel: 'garbage' }),
      // SF: one charted game of four played -- below coverage.
      row({ possession_team: 'SF', nflverse_game_id: '2024_01_SEA_SF' }),
    ];
    const { consumed, dropped } = tallyFormations(
      rows,
      2024,
      resolve,
      new Map([
        ['seahawks', 1],
        ['49ers', 4],
      ])
    );
    expect(consumed).toBe(2);
    expect(() => assertConserved('formations', rows.length, consumed, dropped)).not.toThrow();
    expect(countByReason(dropped)).toEqual({
      below_coverage: 1,
      blank_formation: 1,
      invalid_personnel: 1,
      missing_possession_team: 1,
      unknown_team: 1,
    });
  });
});
