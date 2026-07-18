import { describe, expect, it } from 'vitest';
import { hasSeasonStats, seasonStatColumns } from '../stat-table';
import type { PlayerSeasonStats, Position } from '../types';

const BASE: PlayerSeasonStats = {
  season: 2024,
  seasonType: 'REG',
  games: 16,
  completions: null,
  attempts: null,
  passingYards: null,
  passingTds: null,
  passingInterceptions: null,
  carries: null,
  rushingYards: null,
  rushingTds: null,
  receptions: null,
  targets: null,
  receivingYards: null,
  receivingTds: null,
  defTacklesSolo: null,
  defSacks: null,
  defInterceptions: null,
  fgMade: null,
  fgAtt: null,
};

// Render one position's columns against a stats row into a header->value map.
function render(position: Position, over: Partial<PlayerSeasonStats>): Record<string, string> {
  const s = { ...BASE, ...over };
  return Object.fromEntries(seasonStatColumns(position).map((c) => [c.header, c.value(s)]));
}

describe('seasonStatColumns', () => {
  it('QB: CMP/ATT, thousands-grouped YDS, TD, INT, and YPA', () => {
    expect(
      render('QB', {
        completions: 312,
        attempts: 478,
        passingYards: 3624,
        passingTds: 26,
        passingInterceptions: 9,
      })
    ).toEqual({
      'CMP/ATT': '312/478',
      YDS: '3,624',
      TD: '26',
      INT: '9',
      YPA: '7.6',
    });
  });

  it('QB: INT column flags danger only above 12', () => {
    const int = seasonStatColumns('QB').find((c) => c.header === 'INT');
    expect(int?.danger?.({ ...BASE, passingInterceptions: 14 })).toBe(true);
    expect(int?.danger?.({ ...BASE, passingInterceptions: 12 })).toBe(false);
  });

  it('QB: YPA is "—" when attempts are zero, not a divide-by-zero', () => {
    expect(render('QB', { passingYards: 300, attempts: 0 }).YPA).toBe('—');
  });

  it('RB: carries, yards, TD, receptions, YPC', () => {
    expect(
      render('RB', { carries: 223, rushingYards: 1041, rushingTds: 9, receptions: 40 })
    ).toEqual({
      CAR: '223',
      YDS: '1,041',
      TD: '9',
      REC: '40',
      YPC: '4.7',
    });
  });

  it('WR/TE share the receiving columns', () => {
    const wr = seasonStatColumns('WR').map((c) => c.header);
    const te = seasonStatColumns('TE').map((c) => c.header);
    expect(wr).toEqual(['REC', 'TGT', 'YDS', 'TD', 'YPR']);
    expect(te).toEqual(wr);
  });

  it('defense: solo tackles, fractional sacks, INT', () => {
    expect(render('LB', { defTacklesSolo: 85, defSacks: 1.5, defInterceptions: 2 })).toEqual({
      TKL: '85',
      SK: '1.5',
      INT: '2',
    });
  });

  it('K: made, attempted, and FG%', () => {
    expect(render('K', { fgMade: 30, fgAtt: 35 })).toEqual({ FGM: '30', FGA: '35', 'FG%': '86' });
  });

  it('positions with no box-score stats show a single games-played column', () => {
    for (const pos of ['LT', 'C', 'P', 'LS', 'KR', 'PR'] as Position[]) {
      const cols = seasonStatColumns(pos);
      expect(cols).toHaveLength(1);
      expect(cols[0].header).toBe('GP');
      expect(cols[0].value({ ...BASE, games: 17 })).toBe('17');
    }
  });
});

describe('hasSeasonStats', () => {
  it('is false for a season with no games played (show nothing, not zeros)', () => {
    expect(hasSeasonStats({ ...BASE, games: null })).toBe(false);
    expect(hasSeasonStats({ ...BASE, games: 0 })).toBe(false);
    expect(hasSeasonStats({ ...BASE, games: 1 })).toBe(true);
  });
});
