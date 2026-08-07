import { describe, it, expect } from 'vitest';
import { mapDepthchartPosition, mapSpecialPosition, classifyItem } from './positions';

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
