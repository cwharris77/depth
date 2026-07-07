import { describe, it, expect } from 'vitest';
import { experienceLabel } from '../format';

describe('experienceLabel', () => {
  it('calls a player with 0 seasons a rookie', () => {
    expect(experienceLabel(0)).toBe('Rookie');
  });

  it('uses the singular for one year', () => {
    expect(experienceLabel(1)).toBe('1 yr');
  });

  it('uses the plural for multiple years', () => {
    expect(experienceLabel(2)).toBe('2 yrs');
    expect(experienceLabel(12)).toBe('12 yrs');
  });

  it('treats missing/negative data as rookie rather than showing junk', () => {
    expect(experienceLabel(-1)).toBe('Rookie');
    expect(experienceLabel(NaN)).toBe('Rookie');
  });
});
