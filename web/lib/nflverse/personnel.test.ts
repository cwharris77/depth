import { describe, expect, it } from 'vitest';
import { parsePersonnel, personnelCode } from './personnel';

describe('parsePersonnel', () => {
  it('parses a standard 11-personnel row, ignoring OL/QB noise', () => {
    expect(parsePersonnel('1 C, 2 G, 1 QB, 1 RB, 2 T, 1 TE, 3 WR')).toEqual({
      rb: 1,
      te: 1,
      wr: 3,
    });
  });

  it('counts FB toward rb', () => {
    expect(parsePersonnel('1 C, 1 FB, 1 G, 1 QB, 1 RB, 3 T, 1 TE, 2 WR')).toEqual({
      rb: 2,
      te: 1,
      wr: 2,
    });
  });

  it('ignores OL detail variance (3 G, 4 T, etc.)', () => {
    expect(parsePersonnel('1 C, 3 G, 1 QB, 1 RB, 2 T, 2 TE, 1 WR')).toEqual({
      rb: 1,
      te: 2,
      wr: 1,
    });
    expect(parsePersonnel('1 C, 1 QB, 1 RB, 4 T, 2 TE, 1 WR')).toEqual({ rb: 1, te: 2, wr: 1 });
  });

  it('returns null for a blank string (kneel-downs / no-charting)', () => {
    expect(parsePersonnel('')).toBeNull();
    expect(parsePersonnel('   ')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(parsePersonnel('garbage')).toBeNull();
  });

  it('ignores stray special-teams position codes on a mislabeled ST row', () => {
    expect(
      parsePersonnel('1 C, 1 CB, 1 FB, 1 FS, 1 ILB, 1 LS, 1 OLB, 1 P, 1 SS, 1 TE, 1 WR')
    ).toEqual({ rb: 1, te: 1, wr: 1 });
  });
});

describe('personnelCode', () => {
  it('formats rb/te counts as the standard shorthand', () => {
    expect(personnelCode({ rb: 1, te: 1 })).toBe('11');
    expect(personnelCode({ rb: 2, te: 1 })).toBe('21');
    expect(personnelCode({ rb: 0, te: 2 })).toBe('02');
  });
});
