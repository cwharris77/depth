import { describe, expect, it } from 'vitest';
import { mapRosterPosition, resolveOlSide } from './positions';

describe('mapRosterPosition', () => {
  it('maps every listed nflverse code', () => {
    expect(mapRosterPosition('QB')).toBe('QB');
    expect(mapRosterPosition('RB')).toBe('RB');
    expect(mapRosterPosition('FB')).toBe('RB');
    expect(mapRosterPosition('WR')).toBe('WR');
    expect(mapRosterPosition('TE')).toBe('TE');
    expect(mapRosterPosition('C')).toBe('C');
    expect(mapRosterPosition('DE')).toBe('DE');
    expect(mapRosterPosition('EDGE')).toBe('DE');
    expect(mapRosterPosition('DT')).toBe('DT');
    expect(mapRosterPosition('NT')).toBe('DT');
    expect(mapRosterPosition('OLB')).toBe('LB');
    expect(mapRosterPosition('ILB')).toBe('LB');
    expect(mapRosterPosition('MLB')).toBe('LB');
    expect(mapRosterPosition('LB')).toBe('LB');
    expect(mapRosterPosition('CB')).toBe('CB');
    expect(mapRosterPosition('FS')).toBe('S');
    expect(mapRosterPosition('SS')).toBe('S');
    expect(mapRosterPosition('DB')).toBe('S');
    expect(mapRosterPosition('S')).toBe('S');
    expect(mapRosterPosition('K')).toBe('K');
    expect(mapRosterPosition('P')).toBe('P');
    expect(mapRosterPosition('LS')).toBe('LS');
    expect(mapRosterPosition('KR')).toBe('KR');
    expect(mapRosterPosition('PR')).toBe('PR');
  });

  it('is case-insensitive', () => {
    expect(mapRosterPosition('qb')).toBe('QB');
  });

  it('maps collapsed OL codes to a pseudo-position, not a real Position', () => {
    expect(mapRosterPosition('T')).toBe('OL_TACKLE');
    expect(mapRosterPosition('OT')).toBe('OL_TACKLE');
    expect(mapRosterPosition('G')).toBe('OL_GUARD');
    expect(mapRosterPosition('OG')).toBe('OL_GUARD');
  });

  it('returns null for an unknown code rather than guessing', () => {
    expect(mapRosterPosition('LONGSNAPPER')).toBeNull();
    expect(mapRosterPosition('')).toBeNull();
    expect(mapRosterPosition('  ')).toBeNull();
  });
});

describe('resolveOlSide', () => {
  it('alternates tackles left/right by rank order', () => {
    expect(resolveOlSide('OL_TACKLE', 0)).toBe('LT');
    expect(resolveOlSide('OL_TACKLE', 1)).toBe('RT');
    expect(resolveOlSide('OL_TACKLE', 2)).toBe('LT');
    expect(resolveOlSide('OL_TACKLE', 3)).toBe('RT');
  });

  it('alternates guards left/right by rank order', () => {
    expect(resolveOlSide('OL_GUARD', 0)).toBe('LG');
    expect(resolveOlSide('OL_GUARD', 1)).toBe('RG');
    expect(resolveOlSide('OL_GUARD', 2)).toBe('LG');
  });

  it('passes real positions through unchanged', () => {
    expect(resolveOlSide('QB', 0)).toBe('QB');
    expect(resolveOlSide('C', 5)).toBe('C');
  });
});
