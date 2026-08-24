import { describe, expect, it } from 'vitest';
import type { TeamColors, Uniform } from '@/lib/types';
import { formatUniformYears } from '@/lib/utils/uniforms';

const COLORS: TeamColors = {
  primary: '#000000',
  secondary: '#ffffff',
  accent: '#888888',
  uiAccent: '#ffffff',
  onAccent: '#000000',
};

function u(partial: Partial<Uniform>): Uniform {
  return {
    id: 't-x',
    teamId: 't',
    kind: 'home',
    name: 'X',
    yearStart: 2020,
    yearEnd: null,
    isCurrent: false,
    colors: COLORS,
    ...partial,
  };
}

describe('formatUniformYears', () => {
  it('shows a closed range for a retired kit', () => {
    expect(formatUniformYears(u({ yearStart: 1976, yearEnd: 2001 }))).toBe('1976–2001');
  });

  it('shows the era range for a reintroduced throwback', () => {
    expect(formatUniformYears(u({ yearStart: 1976, yearEnd: 1996, isCurrent: true }))).toBe(
      '1976–1996'
    );
  });

  it('shows present when there is no end year', () => {
    expect(formatUniformYears(u({ yearStart: 2020, yearEnd: null }))).toBe('2020–present');
  });

  it('shows a single year when start equals end', () => {
    expect(formatUniformYears(u({ yearStart: 1994, yearEnd: 1994 }))).toBe('1994');
  });
});
