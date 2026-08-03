import { describe, expect, it } from 'vitest';
import {
  defenseAlignmentLabel,
  defensePersonnelCode,
  parseDefensePersonnel,
} from './defense-personnel';

describe('parseDefensePersonnel', () => {
  it('parses a real sampled row into DL/LB/DB counts (2024 CSV, 2026-08-03)', () => {
    expect(parseDefensePersonnel('3 CB, 2 DE, 2 DT, 1 FS, 2 ILB, 1 SS')).toEqual({
      dl: 4,
      lb: 2,
      db: 5,
    });
  });

  it('collapses ILB/OLB/MLB into lb and CB/FS/SS/S into db', () => {
    expect(parseDefensePersonnel('2 DE, 2 DT, 1 ILB, 1 OLB, 1 MLB, 2 CB, 1 FS, 1 SS')).toEqual({
      dl: 4,
      lb: 3,
      db: 4,
    });
  });

  it('ignores stray special-teams position codes (K, P, RB, WR)', () => {
    expect(parseDefensePersonnel('4 CB, 1 FS, 2 ILB, 1 K, 1 OLB, 1 RB, 1 WR')).toEqual({
      dl: 0,
      lb: 3,
      db: 5,
    });
  });

  it('returns null for blank input', () => {
    expect(parseDefensePersonnel('')).toBeNull();
    expect(parseDefensePersonnel('   ')).toBeNull();
  });

  it('returns null when nothing matches the "<n> <POS>" shape', () => {
    expect(parseDefensePersonnel('garbage')).toBeNull();
  });
});

describe('defensePersonnelCode', () => {
  it('formats as "{dl}-{lb}-{db}"', () => {
    expect(defensePersonnelCode({ dl: 4, lb: 2, db: 5 })).toBe('4-2-5');
  });
});

describe('defenseAlignmentLabel', () => {
  it('names the front by DB count', () => {
    expect(defenseAlignmentLabel(4)).toBe('Base');
    expect(defenseAlignmentLabel(5)).toBe('Nickel');
    expect(defenseAlignmentLabel(6)).toBe('Dime');
    expect(defenseAlignmentLabel(7)).toBe('Quarter');
    expect(defenseAlignmentLabel(8)).toBe('Quarter');
    expect(defenseAlignmentLabel(3)).toBe('Goal Line');
    expect(defenseAlignmentLabel(0)).toBe('Goal Line');
  });
});
