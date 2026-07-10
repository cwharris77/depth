import { describe, it, expect } from 'vitest';
import { eraBucket, eraOptions, matchesFilters, groupByDivision } from '../uniforms/filter';
import type { UniformListing } from '../roster-source';

const kit = (over: Partial<UniformListing>): UniformListing => ({
  teamId: 'bills',
  teamName: 'Buffalo Bills',
  conference: 'AFC',
  division: 'East',
  id: 'bills-x',
  kind: 'alternate',
  name: 'X',
  colors: {
    primary: '#000',
    secondary: '#111',
    accent: '#222',
    uiAccent: '#5B9BFF',
    onAccent: '#0a0e1a',
  },
  yearStart: null,
  yearEnd: null,
  isCurrent: true,
  ...over,
});

describe('eraBucket', () => {
  it('maps a year to its decade', () => {
    expect(eraBucket(1976)).toBe('1970s');
    expect(eraBucket(2009)).toBe('2000s');
  });
  it('maps a null year to Undated', () => {
    expect(eraBucket(null)).toBe('Undated');
  });
});

describe('eraOptions', () => {
  it('returns distinct buckets sorted with Undated last', () => {
    const kits = [
      kit({ yearStart: 1976 }),
      kit({ yearStart: null }),
      kit({ yearStart: 1995 }),
      kit({ yearStart: 1976 }),
    ];
    expect(eraOptions(kits)).toEqual(['1970s', '1990s', 'Undated']);
  });
});

describe('matchesFilters', () => {
  const k = kit({ kind: 'throwback', yearStart: 1976, isCurrent: false });
  it('passes when all filters are all/false', () => {
    expect(matchesFilters(k, { kind: 'all', era: 'all', currentOnly: false })).toBe(true);
  });
  it('filters by kind', () => {
    expect(matchesFilters(k, { kind: 'away', era: 'all', currentOnly: false })).toBe(false);
    expect(matchesFilters(k, { kind: 'throwback', era: 'all', currentOnly: false })).toBe(true);
  });
  it('filters by era bucket', () => {
    expect(matchesFilters(k, { kind: 'all', era: '1970s', currentOnly: false })).toBe(true);
    expect(matchesFilters(k, { kind: 'all', era: '1990s', currentOnly: false })).toBe(false);
  });
  it('filters current-only against isCurrent', () => {
    expect(matchesFilters(k, { kind: 'all', era: 'all', currentOnly: true })).toBe(false);
    expect(
      matchesFilters(kit({ isCurrent: true }), { kind: 'all', era: 'all', currentOnly: true })
    ).toBe(true);
  });
});

describe('groupByDivision', () => {
  it('nests kits under conference/division/team, teams alpha by name', () => {
    const kits = [
      kit({
        teamId: 'rams',
        teamName: 'Los Angeles Rams',
        conference: 'NFC',
        division: 'West',
        id: 'rams-a',
      }),
      kit({
        teamId: '49ers',
        teamName: 'San Francisco 49ers',
        conference: 'NFC',
        division: 'West',
        id: 'niners-a',
      }),
      kit({
        teamId: 'rams',
        teamName: 'Los Angeles Rams',
        conference: 'NFC',
        division: 'West',
        id: 'rams-b',
      }),
    ];
    const groups = groupByDivision(kits);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ conference: 'NFC', division: 'West' });
    expect(groups[0].teams.map((t) => t.teamName)).toEqual([
      'Los Angeles Rams',
      'San Francisco 49ers',
    ]);
    expect(groups[0].teams[0].kits.map((k) => k.id)).toEqual(['rams-a', 'rams-b']);
  });
  it('orders each team home, away, then the rest by name', () => {
    const kits = [
      kit({ id: 'x-throw', kind: 'throwback', name: 'Zebra' }),
      kit({ id: 'x-away', kind: 'away', name: 'Away' }),
      kit({ id: 'x-alt', kind: 'alternate', name: 'Alpha' }),
      kit({ id: 'x-home', kind: 'home', name: 'Home' }),
    ];
    const [group] = groupByDivision(kits);
    expect(group.teams[0].kits.map((k) => k.id)).toEqual(['x-home', 'x-away', 'x-alt', 'x-throw']);
  });
  it('returns an empty array for no kits', () => {
    expect(groupByDivision([])).toEqual([]);
  });
});
