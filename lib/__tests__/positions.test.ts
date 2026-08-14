import { describe, it, expect } from 'vitest';
import { POSITION_FULL_NAMES, positionFullName } from '@/lib/utils/team/positions';
import type { Position } from '@/lib/types';

const ALL_POSITIONS: Position[] = [
  'QB',
  'RB',
  'FB',
  'WR',
  'TE',
  'LT',
  'LG',
  'C',
  'RG',
  'RT',
  'DE',
  'LDE',
  'RDE',
  'DT',
  'NT',
  'LB',
  'WLB',
  'LILB',
  'RILB',
  'SLB',
  'CB',
  'LCB',
  'RCB',
  'NB',
  'S',
  'SS',
  'FS',
  'K',
  'P',
  'LS',
  'KR',
  'PR',
];

describe('positionFullName', () => {
  it('expands a few representative codes', () => {
    expect(positionFullName('QB')).toBe('Quarterback');
    expect(positionFullName('C')).toBe('Center');
    expect(positionFullName('CB')).toBe('Cornerback');
    expect(positionFullName('KR')).toBe('Kick Returner');
  });

  it('has a non-empty name for every Position', () => {
    for (const pos of ALL_POSITIONS) {
      const name = positionFullName(pos);
      expect(name.length).toBeGreaterThan(0);
      expect(name).toBe(POSITION_FULL_NAMES[pos]);
    }
  });

  it('covers exactly the Position union with no extras', () => {
    expect(Object.keys(POSITION_FULL_NAMES).sort()).toEqual([...ALL_POSITIONS].sort());
  });
});
