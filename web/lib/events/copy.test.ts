import { describe, expect, it } from 'vitest';
import {
  formatCount,
  historicWeekCopy,
  ordinal,
  recordChaseCopy,
  starterChangeCopy,
  tradeCopy,
} from './copy';

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [102, '102nd'],
  ])('%i -> %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(2105)).toBe('2,105');
    expect(formatCount(7)).toBe('7');
  });
});

describe('starterChangeCopy', () => {
  it('names the new starter, the position and who he replaces', () => {
    expect(
      starterChangeCopy({
        teamName: 'Seahawks',
        position: 'QB',
        playerName: 'Sam Darnold',
        previousName: 'Geno Smith',
      })
    ).toEqual({
      headline: 'Seahawks: Sam Darnold is the new starter at QB',
      detail: 'Replaces Geno Smith.',
    });
  });
});

describe('tradeCopy', () => {
  it('says traded for an outgoing player and acquired for an incoming one', () => {
    const base = { teamName: 'Eagles', position: 'G', playerName: 'Cam Jurgens' };
    expect(tradeCopy({ ...base, direction: 'out' })).toEqual({
      headline: 'Eagles traded G Cam Jurgens',
      detail: null,
    });
    expect(tradeCopy({ ...base, teamName: 'Ravens', direction: 'in' })).toEqual({
      headline: 'Ravens acquired G Cam Jurgens',
      detail: null,
    });
  });
});

describe('recordChaseCopy', () => {
  const base = {
    playerName: 'Saquon Barkley',
    stat: 'rushing_yards' as const,
    record: 2097,
    fromSeason: 1999,
  };

  it('states the gap while the mark still stands', () => {
    expect(recordChaseCopy({ ...base, value: 1900 })).toEqual({
      headline:
        'Saquon Barkley has 1,900 rushing yards, 197 short of the most in a season since 1999',
      detail: 'Previous best: 2,097.',
    });
  });

  it('says tied at exactly the mark', () => {
    expect(recordChaseCopy({ ...base, value: 2097 }).headline).toBe(
      'Saquon Barkley has 2,097 rushing yards, tied for the most in a season since 1999'
    );
  });

  it('says the most once the mark is passed', () => {
    expect(recordChaseCopy({ ...base, value: 2110 }).headline).toBe(
      'Saquon Barkley has 2,110 rushing yards, the most in a season since 1999'
    );
  });

  it('states the coverage season it is given, never a wider claim', () => {
    const copy = recordChaseCopy({ ...base, value: 2110, fromSeason: 2003 });
    expect(copy.headline).toContain('since 2003');
    expect(copy.headline).not.toMatch(/history|all[- ]time/i);
  });
});

describe('historicWeekCopy', () => {
  const base = {
    playerName: "Ja'Marr Chase",
    stat: 'receiving_yards' as const,
    value: 264,
    week: 10,
    fromSeason: 1999,
  };

  it('uses an ordinal below rank 1', () => {
    expect(historicWeekCopy({ ...base, rank: 7 })).toEqual({
      headline:
        "Ja'Marr Chase had 264 receiving yards in Week 10, the 7th-most in a game since 1999",
      detail: null,
    });
  });

  it('drops the ordinal at rank 1', () => {
    expect(historicWeekCopy({ ...base, rank: 1 }).headline).toBe(
      "Ja'Marr Chase had 264 receiving yards in Week 10, the most in a game since 1999"
    );
  });

  it('labels touchdowns', () => {
    expect(
      historicWeekCopy({ ...base, stat: 'passing_tds', value: 7, rank: 1 }).headline
    ).toContain('7 passing touchdowns');
  });
});
