import { describe, expect, it } from 'vitest';
import { deriveDefenseTeamCode, tallyDefenseFormations } from './defense-participation';
import type { ParticipationRow } from './participation';

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

  it('counts fronts into the top-3 (dl-lb-db) combos with pct and a derived alignment label', () => {
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

  it('excludes rows with a blank offense_formation (kneel-downs / non-charted plays)', () => {
    const rows = [
      row({}),
      row({
        offense_formation: '',
        defense_personnel: '4 CB, 1 FS, 2 ILB, 1 K, 1 OLB, 1 RB, 1 WR',
      }),
    ];
    const { tallies, skipped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 1]])
    );
    expect(skipped).toBe(1);
    expect(tallies).toHaveLength(1);
    expect(tallies[0].pct).toBe(100);
  });

  it('skips a row whose defense personnel does not total 11 (malformed/noisy)', () => {
    const rows = [row({}), row({ defense_personnel: '4 CB, 1 FS, 2 ILB, 1 K, 1 RB, 1 WR' })];
    const { tallies, skipped } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 1]])
    );
    expect(skipped).toBe(1);
    expect(tallies).toHaveLength(1);
  });

  it('skips a row whose defending team code is unresolvable', () => {
    const rows = [row({ nflverse_game_id: '2024_01_SEA_XXX' })];
    const { tallies, skipped } = tallyDefenseFormations(rows, 2024, resolve, new Map());
    expect(tallies).toEqual([]);
    expect(skipped).toBe(1);
  });

  it('treats a team below the coverage threshold as no data', () => {
    const rows = [row({})];
    const { tallies, skippedTeams } = tallyDefenseFormations(
      rows,
      2024,
      resolve,
      new Map([['broncos', 4]])
    );
    expect(tallies).toEqual([]);
    expect(skippedTeams).toEqual(['broncos']);
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
});
