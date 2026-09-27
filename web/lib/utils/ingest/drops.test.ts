import { describe, expect, it } from 'vitest';
import { addCounts, assertConserved, countByReason, countValues, type Drop } from './drops';

const DROPS: Drop[] = [
  { reason: 'unknown_team', key: 'a', value: 'XXX' },
  { reason: 'invalid_season', key: 'b', value: '' },
  { reason: 'unknown_team', key: 'c', value: 'YYY' },
  { reason: 'unknown_team', key: 'd', value: 'XXX' },
];

describe('countByReason', () => {
  it('counts per reason with sorted keys', () => {
    expect(Object.entries(countByReason(DROPS))).toEqual([
      ['invalid_season', 1],
      ['unknown_team', 3],
    ]);
  });
});

describe('countValues', () => {
  it('counts the values of one reason', () => {
    expect(countValues(DROPS, 'unknown_team')).toEqual({ XXX: 2, YYY: 1 });
  });
});

describe('addCounts', () => {
  it('merges a batch into a running total', () => {
    const total = addCounts({ unknown_team: 1, missing_key: 2 }, DROPS);
    expect(total).toEqual({ unknown_team: 4, missing_key: 2, invalid_season: 1 });
  });
});

describe('assertConserved', () => {
  it('passes when kept + dropped equals input', () => {
    expect(() => assertConserved('x', 6, 2, DROPS)).not.toThrow();
  });

  it('throws with the counts when a row is unaccounted for', () => {
    expect(() => assertConserved('games', 7, 2, DROPS)).toThrow(
      'games: conservation check failed (2 kept + 4 dropped != 7 input)'
    );
  });
});
