import { describe, expect, it } from 'vitest';
import { rankByUsage, usageScore, type UsageEntry, type UsageStatsRow } from './depth-heuristic';

const NO_STATS: UsageStatsRow = {
  attempts: null,
  carries: null,
  targets: null,
  games: null,
  defTacklesSolo: null,
  defSacks: null,
  defInterceptions: null,
  fgAtt: null,
};

describe('usageScore', () => {
  it('scores QB by attempts', () => {
    expect(usageScore('QB', { ...NO_STATS, attempts: 500 })).toBe(500);
  });

  it('scores RB by carries + targets', () => {
    expect(usageScore('RB', { ...NO_STATS, carries: 200, targets: 40 })).toBe(240);
  });

  it('scores WR/TE by targets', () => {
    expect(usageScore('WR', { ...NO_STATS, targets: 90 })).toBe(90);
    expect(usageScore('TE', { ...NO_STATS, targets: 60 })).toBe(60);
  });

  it('scores OL (real and collapsed) by games', () => {
    expect(usageScore('LT', { ...NO_STATS, games: 16 })).toBe(16);
    expect(usageScore('OL_TACKLE', { ...NO_STATS, games: 16 })).toBe(16);
    expect(usageScore('OL_GUARD', { ...NO_STATS, games: 12 })).toBe(12);
  });

  it('scores defense by tackles + 3x(sacks + interceptions)', () => {
    expect(
      usageScore('LB', { ...NO_STATS, defTacklesSolo: 80, defSacks: 2, defInterceptions: 1 })
    ).toBe(80 + 3 * 3);
  });

  it('scores K by fg attempts, P/LS/KR/PR by games', () => {
    expect(usageScore('K', { ...NO_STATS, fgAtt: 30 })).toBe(30);
    expect(usageScore('P', { ...NO_STATS, games: 17 })).toBe(17);
    expect(usageScore('LS', { ...NO_STATS, games: 17 })).toBe(17);
  });

  it('degrades to 0 with no stats row', () => {
    expect(usageScore('QB', undefined)).toBe(0);
  });
});

describe('rankByUsage', () => {
  it('ranks a position group by usage desc', () => {
    const entries: UsageEntry<string>[] = [
      { item: 'backup', position: 'QB', number: 10, usage: 50 },
      { item: 'starter', position: 'QB', number: 3, usage: 500 },
    ];
    const ranked = rankByUsage(entries);
    expect(ranked.map((r) => r.item)).toEqual(['starter', 'backup']);
    expect(ranked[0]).toMatchObject({ position: 'QB', depthRank: 1, playerOrder: 1 });
    expect(ranked[1]).toMatchObject({ position: 'QB', depthRank: 2, playerOrder: 2 });
  });

  it('breaks ties by jersey number ascending', () => {
    const entries: UsageEntry<string>[] = [
      { item: 'jersey-88', position: 'WR', number: 88, usage: 40 },
      { item: 'jersey-11', position: 'WR', number: 11, usage: 40 },
    ];
    const ranked = rankByUsage(entries);
    expect(ranked.map((r) => r.item)).toEqual(['jersey-11', 'jersey-88']);
  });

  it('caps depthRank at 3 but keeps full playerOrder', () => {
    const entries: UsageEntry<string>[] = [4, 3, 2, 1, 0].map((usage, i) => ({
      item: `p${i}`,
      position: 'WR',
      number: i,
      usage,
    }));
    const ranked = rankByUsage(entries);
    expect(ranked.map((r) => r.depthRank)).toEqual([1, 2, 3, 3, 3]);
    expect(ranked.map((r) => r.playerOrder)).toEqual([1, 2, 3, 4, 5]);
  });

  it('alternates OL side by rank order within the group and ranks each side independently', () => {
    const entries: UsageEntry<string>[] = [
      { item: 'best-tackle', position: 'OL_TACKLE', number: 70, usage: 16 },
      { item: 'second-tackle', position: 'OL_TACKLE', number: 71, usage: 12 },
      { item: 'third-tackle', position: 'OL_TACKLE', number: 72, usage: 4 },
    ];
    const ranked = rankByUsage(entries);
    expect(ranked.map((r) => r.position)).toEqual(['LT', 'RT', 'LT']);
    // The side split must not leave one side without a starter: RT's best player is
    // rank 1 within RT, and LT's second player is rank 2 within LT (regression for the
    // RG/RT "no depth_rank=1" bug -- every side needs its own STARTER row).
    expect(ranked.map((r) => r.depthRank)).toEqual([1, 1, 2]);
    expect(ranked.map((r) => r.playerOrder)).toEqual([1, 1, 2]);
  });

  it('gives every non-empty position group a depth_rank=1 starter', () => {
    // Property test across OL collapses (the bug shape): alternating sides must not
    // produce a group that starts at depth_rank 2.
    const entries: UsageEntry<string>[] = [
      { item: 'g1', position: 'OL_GUARD', number: 60, usage: 16 },
      { item: 'g2', position: 'OL_GUARD', number: 61, usage: 12 },
      { item: 'g3', position: 'OL_GUARD', number: 62, usage: 8 },
      { item: 'g4', position: 'OL_GUARD', number: 63, usage: 4 },
      { item: 't1', position: 'OL_TACKLE', number: 70, usage: 16 },
      { item: 't2', position: 'OL_TACKLE', number: 71, usage: 12 },
    ];
    const ranked = rankByUsage(entries);
    const byPosition = new Map<string, typeof ranked>();
    for (const r of ranked) {
      const group = byPosition.get(r.position) ?? [];
      group.push(r);
      byPosition.set(r.position, group);
    }
    for (const group of byPosition.values()) {
      expect(Math.min(...group.map((r) => r.depthRank))).toBe(1);
    }
  });

  it('ranks distinct positions independently', () => {
    const entries: UsageEntry<string>[] = [
      { item: 'qb1', position: 'QB', number: 1, usage: 400 },
      { item: 'wr1', position: 'WR', number: 2, usage: 100 },
    ];
    const ranked = rankByUsage(entries);
    expect(ranked.every((r) => r.depthRank === 1)).toBe(true);
  });
});
