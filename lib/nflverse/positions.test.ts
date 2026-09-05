import { describe, expect, it } from 'vitest';
import { mapRosterPosition } from './positions';

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

  it('preserves collapsed OL codes as generic positions until a depth chart establishes a side', () => {
    expect(mapRosterPosition('T')).toBe('OT');
    expect(mapRosterPosition('OT')).toBe('OT');
    expect(mapRosterPosition('G')).toBe('G');
    expect(mapRosterPosition('OG')).toBe('G');
  });

  it('returns null for an unknown code rather than guessing', () => {
    expect(mapRosterPosition('LONGSNAPPER')).toBeNull();
    expect(mapRosterPosition('')).toBeNull();
    expect(mapRosterPosition('  ')).toBeNull();
  });
});
