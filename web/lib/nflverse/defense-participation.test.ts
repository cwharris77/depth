import { describe, expect, it } from 'vitest';
import { deriveDefenseTeamCode, tallyDefenseFormations } from './defense-participation';
import type { ParticipationRow } from './participation';
import { assertConserved, countByReason } from '../utils/ingest/drops';

const resolve = (code: string) =>
  code === 'SEA' ? 'seahawks' : code === 'DEN' ? 'broncos' : code === 'SF' ? '49ers' : null;

function row(over: Partial<ParticipationRow>): ParticipationRow {
  return {
    nflverse_game_id: '2024_01_SEA_DEN',
    possession_team: 'SEA',
    offense_formation: 'SHOTGUN',
    offense_personnel: '1 RB, 1 TE, 3 WR',
    defense_personnel: '3 CB, 2 DE, 2 DT, 1 FS, 2 ILB, 1 SS', // 4-2-5, Nickel
    ...over,
  };
}

describe('deriveDefenseTeamCode', () => {
  it('returns the other team in the game id', () => {
    expect(deriveDefenseTeamCode('2024_01_SEA_DEN', 'SEA')).toBe('DEN');
    expect(deriveDefenseTeamCode('2024_01_SEA_DEN', 'DEN')).toBe('SEA');
  });

  it('returns null when possessionTeam matches neither team in the id', () => {
    expect(deriveDefenseTeamCode('2024_01_SEA_DEN', 'SF')).toBeNull();
  });

  it('returns null for a malformed game id', () => {
    expect(deriveDefenseTeamCode('garbage', 'SEA')).toBeNull();
  });
});

describe('tallyDefenseFormations', () => {
  it('tallies the DEFENDING team, not the possession team', () => {
    const rows = [row({})];
    const { tallies, skippedTeams } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 1]])
    );
    expect(skippedTeams).toEqual([]);
    expect(tallies).toEqual([
      {
        team_id: 'broncos',
        season: 2024,
        rank: 1,
        alignment: 'Nickel',
        personnel: '4-2-5',
        pct: 100,
      },
    ]);
  });

  it('counts fronts into ranked (dl-lb-db) combos with pct and a derived alignment label', () => {
    const rows = [
      ...Array.from({ length: 6 }, () => row({})), // 4-2-5 Nickel
      ...Array.from(
        { length: 3 },
        () => row({ defense_personnel: '2 DE, 2 DT, 3 LB, 2 CB, 2 S' }) // 4-3-4 Base
      ),
      ...Array.from(
        { length: 1 },
        () => row({ defense_personnel: '3 DE, 2 DT, 1 LB, 3 CB, 2 S' }) // 5-1-5 Nickel-ish front
      ),
    ];
    const { tallies } = tallyDefenseFormations(rows, 2024, resolve, new Map([['broncos', 1]]));
    expect(tallies).toEqual([
      {
        team_id: 'broncos',
        season: 2024,
        rank: 1,
        alignment: 'Nickel',
        personnel: '4-2-5',
        pct: 60,
      },
      { team_id: 'broncos', season: 2024, rank: 2, alignment: 'Base', personnel: '4-3-4', pct: 30 },
      {
        team_id: 'broncos',
        season: 2024,
        rank: 3,
        alignment: 'Nickel',
        personnel: '5-1-5',
        pct: 10,
      },
    ]);
  });

  it('keeps every front uncapped (DEP-141), not just the top 3', () => {
    const fronts = [
      '3 CB, 2 DE, 2 DT, 1 FS, 2 ILB, 1 SS', // 4-2-5 Nickel
      '2 DE, 2 DT, 3 LB, 2 CB, 2 S', // 4-3-4 Base
      '3 DE, 2 DT, 1 LB, 3 CB, 2 S', // 5-1-5 Nickel-ish
      '2 DE, 1 DT, 3 LB, 3 CB, 2 S', // 3-3-5 Nickel
    ];
    const rows = fronts.map((defense_personnel) => row({ defense_personnel }));
    const { tallies } = tallyDefenseFormations(rows, 2024, resolve, new Map([['broncos', 1]]));
    expect(tallies).toHaveLength(4);
  });

  it('excludes rows with a blank offense_formation (kneel-downs / non-charted plays)', () => {
    const rows = [
      row({}),
      row({
        offense_formation: '',
        defense_personnel: '4 CB, 1 FS, 2 ILB, 1 K, 1 OLB, 1 RB, 1 WR',
      }),
    ];
    const { tallies, dropped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 1]])
    );
    expect(dropped).toEqual([{ reason: 'blank_formation', key: '2024_01_SEA_DEN#1' }]);
    expect(tallies).toHaveLength(1);
    expect(tallies[0].pct).toBe(100);
  });

  it('drops a row whose defense personnel does not total 11 (malformed/noisy)', () => {
    const noisy = '4 CB, 1 FS, 2 ILB, 1 K, 1 RB, 1 WR';
    const rows = [row({}), row({ defense_personnel: noisy })];
    const { tallies, dropped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 1]])
    );
    expect(dropped).toEqual([
      { reason: 'invalid_personnel', key: '2024_01_SEA_DEN#1', value: noisy },
    ]);
    expect(tallies).toHaveLength(1);
  });

  it('drops a row whose defending team code is unresolvable, naming the code', () => {
    const rows = [row({ nflverse_game_id: '2024_01_SEA_XXX' })];
    const { tallies, dropped } = tallyDefenseFormations(rows, 2024, resolve, new Map());
    expect(tallies).toEqual([]);
    expect(dropped).toEqual([{ reason: 'unknown_team', key: '2024_01_SEA_XXX#0', value: 'XXX' }]);
  });

  it('drops a row whose defending team cannot be derived from the game id', () => {
    const rows = [row({ possession_team: 'SF' }), row({ nflverse_game_id: 'garbage' })];
    const { tallies, dropped } = tallyDefenseFormations(rows, 2024, resolve, new Map());
    expect(tallies).toEqual([]);
    expect(dropped).toEqual([
      { reason: 'underivable_defense_team', key: '2024_01_SEA_DEN#0', value: 'SF' },
      { reason: 'underivable_defense_team', key: 'garbage#1', value: 'SEA' },
    ]);
  });

  it('treats a team below the coverage threshold as no data', () => {
    const rows = [row({})];
    const { tallies, skippedTeams, consumed, dropped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 4]])
    );
    expect(tallies).toEqual([]);
    expect(skippedTeams).toEqual(['broncos']);
    expect(consumed).toBe(0);
    expect(dropped).toEqual([
      { reason: 'below_coverage', key: '2024_01_SEA_DEN#0', value: 'broncos' },
    ]);
  });

  it('aggregates multiple defending teams independently', () => {
    const rows = [
      row({}), // SEA possession, DEN defends
      row({ possession_team: 'DEN', nflverse_game_id: '2024_02_DEN_SF' }), // DEN possession, SF defends
    ];
    const { tallies } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([
        ['broncos', 1],
        ['49ers', 1],
      ])
    );
    expect(tallies.map((t) => t.team_id).sort()).toEqual(['49ers', 'broncos']);
  });

  it('accounts for every row seen as consumed or dropped', () => {
    const rows = [
      row({}),
      row({}),
      row({ offense_formation: '' }),
      row({ nflverse_game_id: '2024_01_SEA_XXX' }),
      row({ possession_team: 'SF' }),
      row({ defense_personnel: 'garbage' }),
      // SF defends in one charted game of four played -- below coverage.
      row({ possession_team: 'DEN', nflverse_game_id: '2024_02_DEN_SF' }),
    ];
    const { consumed, dropped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([
        ['broncos', 1],
        ['49ers', 4],
      ])
    );
    expect(consumed).toBe(2);
    expect(() => assertConserved('defense', rows.length, consumed, dropped)).not.toThrow();
    expect(countByReason(dropped)).toEqual({
      below_coverage: 1,
      blank_formation: 1,
      invalid_personnel: 1,
      underivable_defense_team: 1,
      unknown_team: 1,
    });
  });
});
