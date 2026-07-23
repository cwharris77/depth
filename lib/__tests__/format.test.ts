import { describe, it, expect } from 'vitest';
import { experienceLabel, formatLastName, ordinal } from '../format';

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

describe('ordinal', () => {
  it('formats the standard cardinals', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
  });

  it('handles the teens exception (11th/12th/13th, not 11st/12nd/13rd)', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('resumes 1st/2nd/3rd rules past the teens', () => {
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(23)).toBe('23rd');
  });
});

describe('formatLastName', () => {
  it('returns the final word for a plain two-word name', () => {
    expect(formatLastName('Russell Wilson')).toBe('Wilson');
  });

  it('keeps a hyphenated last name whole', () => {
    expect(formatLastName('Jaxon Smith-Njigba')).toBe('Smith-Njigba');
  });

  it('treats a multi-word surname as the last name', () => {
    expect(formatLastName('Amon-Ra St. Brown')).toBe('Brown');
  });

  it('strips a generational suffix so it is not mistaken for the last name', () => {
    expect(formatLastName('Odell Beckham Jr.')).toBe('Beckham');
    expect(formatLastName('Odell Beckham Jr')).toBe('Beckham');
    expect(formatLastName('Michael Pittman III')).toBe('Pittman');
  });

  it('falls back to the full string for a single-word name', () => {
    expect(formatLastName('Prime')).toBe('Prime');
  });
});
