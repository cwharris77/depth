import { describe, it, expect } from 'vitest';
import {
  mapDepthchartPosition,
  mapSpecialPosition,
  mapBioPosition,
  classifyItem,
} from './positions';

describe('mapDepthchartPosition', () => {
  it('maps offense keys', () => {
    expect(mapDepthchartPosition('lt')).toBe('LT');
    expect(mapDepthchartPosition('rt')).toBe('RT');
    expect(mapDepthchartPosition('qb')).toBe('QB');
  });
  it('maps every granular defensive/FB key to its own Position, not a collapsed group', () => {
    expect(mapDepthchartPosition('lde')).toBe('LDE');
    expect(mapDepthchartPosition('rde')).toBe('RDE');
    expect(mapDepthchartPosition('nt')).toBe('NT');
    expect(mapDepthchartPosition('wlb')).toBe('WLB');
    expect(mapDepthchartPosition('lilb')).toBe('LILB');
    expect(mapDepthchartPosition('rilb')).toBe('RILB');
    expect(mapDepthchartPosition('slb')).toBe('SLB');
    expect(mapDepthchartPosition('lcb')).toBe('LCB');
    expect(mapDepthchartPosition('rcb')).toBe('RCB');
    expect(mapDepthchartPosition('nb')).toBe('NB');
    expect(mapDepthchartPosition('ss')).toBe('SS');
    expect(mapDepthchartPosition('fs')).toBe('FS');
    expect(mapDepthchartPosition('fb')).toBe('FB');
  });
  it('drops positions not in our enum', () => {
    expect(mapDepthchartPosition('h')).toBeNull();
  });
});

describe('mapBioPosition', () => {
  it('maps the bio-abbreviation-distinguishable granular keys, not the collapsed groups', () => {
    // Unlike the depthchart keys above, a bio abbreviation carries no side/role info
    // (a lineman/linebacker/corner reads generically) -- but fb/nt/fs/ss are real,
    // distinct ESPN bio abbreviations, so those still resolve granular here too.
    expect(mapBioPosition('fb')).toBe('FB');
    expect(mapBioPosition('nt')).toBe('NT');
    expect(mapBioPosition('fs')).toBe('FS');
    expect(mapBioPosition('ss')).toBe('SS');
  });
  it('keeps the generic fallback for positions bio abbreviations cannot distinguish a side/role for', () => {
    expect(mapBioPosition('de')).toBe('DE');
    expect(mapBioPosition('dt')).toBe('DT');
    expect(mapBioPosition('lb')).toBe('LB');
    expect(mapBioPosition('cb')).toBe('CB');
    expect(mapBioPosition('s')).toBe('S');
  });
  it('defaults ambiguous OL abbreviations to the left side', () => {
    expect(mapBioPosition('ot')).toBe('LT');
    expect(mapBioPosition('t')).toBe('LT');
    expect(mapBioPosition('g')).toBe('LG');
    expect(mapBioPosition('og')).toBe('LG');
  });
  it('returns null for an abbreviation not in the table', () => {
    expect(mapBioPosition('h')).toBeNull();
  });
});

describe('mapSpecialPosition', () => {
  it('maps special keys, dropping holder', () => {
    expect(mapSpecialPosition('pk')).toBe('k');
    expect(mapSpecialPosition('kr')).toBe('kr');
    expect(mapSpecialPosition('h')).toBeNull();
  });
});

describe('classifyItem', () => {
  it('classifies by key membership', () => {
    expect(classifyItem(['wr', 'lt', 'qb', 'rb'])).toBe('offense');
    expect(classifyItem(['lde', 'nt', 'ss', 'fs'])).toBe('defense');
    expect(classifyItem(['pk', 'p', 'kr', 'pr'])).toBe('special');
  });
});
