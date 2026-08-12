import { describe, it, expect } from 'vitest';
import { positionGroupPositions, rankByNameMatch, unitForPosition } from '../search';

describe('unitForPosition', () => {
  it('maps offense, defense, and special positions', () => {
    expect(unitForPosition('QB')).toBe('offense');
    expect(unitForPosition('WR')).toBe('offense');
    expect(unitForPosition('RT')).toBe('offense');
    expect(unitForPosition('CB')).toBe('defense');
    expect(unitForPosition('S')).toBe('defense');
    expect(unitForPosition('DE')).toBe('defense');
    expect(unitForPosition('K')).toBe('special');
    expect(unitForPosition('P')).toBe('special');
  });

  it('maps every granular position to the same unit as its collapsed group', () => {
    expect(unitForPosition('FB')).toBe('offense');
    expect(unitForPosition('LDE')).toBe('defense');
    expect(unitForPosition('RDE')).toBe('defense');
    expect(unitForPosition('NT')).toBe('defense');
    expect(unitForPosition('WLB')).toBe('defense');
    expect(unitForPosition('LILB')).toBe('defense');
    expect(unitForPosition('RILB')).toBe('defense');
    expect(unitForPosition('SLB')).toBe('defense');
    expect(unitForPosition('LCB')).toBe('defense');
    expect(unitForPosition('RCB')).toBe('defense');
    expect(unitForPosition('NB')).toBe('defense');
    expect(unitForPosition('SS')).toBe('defense');
    expect(unitForPosition('FS')).toBe('defense');
  });
});

describe('positionGroupPositions', () => {
  it('resolves the offensive and defensive line groups', () => {
    expect(positionGroupPositions('OL')).toEqual(['LT', 'LG', 'C', 'RG', 'RT']);
    expect(positionGroupPositions('dl')).toEqual(['DE', 'LDE', 'RDE', 'DT', 'NT']);
  });

  it('resolves the secondary and accepts spacing/hyphen variants', () => {
    expect(positionGroupPositions('secondary')).toEqual([
      'CB',
      'LCB',
      'RCB',
      'NB',
      'S',
      'SS',
      'FS',
    ]);
    expect(positionGroupPositions('D-Line')).toEqual(['DE', 'LDE', 'RDE', 'DT', 'NT']);
    expect(positionGroupPositions('  o line  ')).toEqual(['LT', 'LG', 'C', 'RG', 'RT']);
  });

  it('returns null for a non-group query', () => {
    expect(positionGroupPositions('geno')).toBeNull();
    expect(positionGroupPositions('QB')).toBeNull();
  });
});

describe('rankByNameMatch', () => {
  // Shared with searchAllPlayers (lib/roster-source.db.ts),
  // which merges several separately-filtered DB queries and needs this same
  // prefix-first-then-alphabetical ordering applied after the merge.
  it('ranks prefix matches ahead of mid-string matches, then alphabetically', () => {
    const hits = [{ name: 'Jaxon Smith-Njigba' }, { name: 'Smith Jones' }, { name: 'Adam Smith' }];
    expect(rankByNameMatch(hits, 'smith').map((h) => h.name)).toEqual([
      'Smith Jones',
      'Adam Smith',
      'Jaxon Smith-Njigba',
    ]);
  });

  it('does not mutate the input array', () => {
    const hits = [{ name: 'B' }, { name: 'A' }];
    rankByNameMatch(hits, '');
    expect(hits.map((h) => h.name)).toEqual(['B', 'A']);
  });
});
