import { describe, it, expect } from 'vitest';
import { statLine } from '../stat-lines';
import type { PlayerSeasonStats } from '../types';

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

describe('statLine', () => {
  it('QB: completions/attempts, yards, TD, INT', () => {
    const line = statLine('QB', {
      ...BASE,
      completions: 392,
      attempts: 597,
      passingYards: 4183,
      passingTds: 26,
      passingInterceptions: 11,
    });
    expect(line).toBe('392/597 · 4183 yds · 26 TD · 11 INT');
  });

  it('RB: carries, yards, TD, no receptions segment when receptions is 0', () => {
    const line = statLine('RB', {
      ...BASE,
      carries: 206,
      rushingYards: 876,
      rushingTds: 5,
      receptions: 0,
    });
    expect(line).toBe('206 car · 876 yds · 5 TD');
  });

  it('RB: appends receptions segment when receptions > 0', () => {
    const line = statLine('RB', {
      ...BASE,
      carries: 206,
      rushingYards: 876,
      rushingTds: 5,
      receptions: 49,
    });
    expect(line).toBe('206 car · 876 yds · 5 TD · 49 rec');
  });

  it('WR/TE: receptions, yards, TD', () => {
    expect(statLine('WR', { ...BASE, receptions: 67, receivingYards: 1079, receivingTds: 7 })).toBe(
      '67 rec · 1079 yds · 7 TD'
    );
    expect(statLine('TE', { ...BASE, receptions: 40, receivingYards: 500, receivingTds: 3 })).toBe(
      '40 rec · 500 yds · 3 TD'
    );
  });

  it('OL positions: games only', () => {
    for (const pos of ['LT', 'LG', 'C', 'RG', 'RT'] as const) {
      expect(statLine(pos, { ...BASE, games: 17 })).toBe('17 games');
    }
  });

  it('defense: tackles, sacks, INT, omitting zero segments', () => {
    expect(
      statLine('LB', { ...BASE, defTacklesSolo: 85, defSacks: 1.5, defInterceptions: 2 })
    ).toBe('85 tkl · 1.5 sk · 2 INT');
    expect(statLine('DE', { ...BASE, defTacklesSolo: 10, defSacks: 0, defInterceptions: 0 })).toBe(
      '10 tkl'
    );
  });

  it('K: FG made/attempted', () => {
    expect(statLine('K', { ...BASE, fgMade: 30, fgAtt: 35 })).toBe('30/35 FG');
  });

  it('P/LS/KR/PR: games only', () => {
    for (const pos of ['P', 'LS', 'KR', 'PR'] as const) {
      expect(statLine(pos, { ...BASE, games: 16 })).toBe('16 games');
    }
  });

  it('returns null when games is null or 0', () => {
    expect(statLine('QB', { ...BASE, games: null })).toBeNull();
    expect(statLine('QB', { ...BASE, games: 0 })).toBeNull();
  });
});
