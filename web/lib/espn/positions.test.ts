import { describe, it, expect } from 'vitest';
import type { Position } from '../types';
import {
  BIO_POSITION,
  DEPTH_POSITION,
  SPECIAL,
  mapDepthchartPosition,
  mapSpecialPosition,
  mapBioPosition,
  classifyItem,
} from './positions';

// Each table's approved mappings are written out independently of the production table,
// so a changed or added mapping has to be restated here.
const DEPTH_EXPECTED: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  fb: 'FB',
  wr: 'WR',
  te: 'TE',
  lt: 'LT',
  lg: 'LG',
  c: 'C',
  rg: 'RG',
  rt: 'RT',
  lde: 'LDE',
  rde: 'RDE',
  de: 'DE',
  nt: 'NT',
  dt: 'DT',
  wlb: 'WLB',
  lilb: 'LILB',
  rilb: 'RILB',
  slb: 'SLB',
  lb: 'LB',
  mlb: 'LB',
  lcb: 'LCB',
  rcb: 'RCB',
  cb: 'CB',
  nb: 'NB',
  ss: 'SS',
  fs: 'FS',
  s: 'S',
  pk: 'K',
  k: 'K',
  p: 'P',
  ls: 'LS',
};

// A bio abbreviation carries no side or role, so a lineman, linebacker or corner reads
// generically; `fb`/`nt`/`fs`/`ss` are distinct bio abbreviations and stay granular.
const BIO_EXPECTED: Record<string, Position> = {
  qb: 'QB',
  rb: 'RB',
  fb: 'FB',
  wr: 'WR',
  te: 'TE',
  ot: 'OT',
  t: 'OT',
  g: 'G',
  og: 'G',
  c: 'C',
  de: 'DE',
  dt: 'DT',
  nt: 'NT',
  lb: 'LB',
  cb: 'CB',
  s: 'S',
  fs: 'FS',
  ss: 'SS',
  pk: 'K',
  k: 'K',
  p: 'P',
  ls: 'LS',
};

const SPECIAL_EXPECTED: Record<string, string> = {
  pk: 'k',
  k: 'k',
  p: 'p',
  ls: 'ls',
  kr: 'kr',
  pr: 'pr',
};

describe('mapDepthchartPosition', () => {
  it.each(Object.entries(DEPTH_EXPECTED))('maps %s to %s', (key, position) => {
    expect(mapDepthchartPosition(key)).toBe(position);
  });
  it('has an expectation for every key in the production table', () => {
    expect(Object.keys(DEPTH_POSITION).sort()).toEqual(Object.keys(DEPTH_EXPECTED).sort());
  });
  it('is case-insensitive', () => {
    expect(mapDepthchartPosition('LT')).toBe('LT');
  });
  it('drops positions not in our enum', () => {
    expect(mapDepthchartPosition('h')).toBeNull();
  });
});

describe('mapBioPosition', () => {
  it.each(Object.entries(BIO_EXPECTED))('maps %s to %s', (abbreviation, position) => {
    expect(mapBioPosition(abbreviation)).toBe(position);
  });
  it('has an expectation for every abbreviation in the production table', () => {
    expect(Object.keys(BIO_POSITION).sort()).toEqual(Object.keys(BIO_EXPECTED).sort());
  });
  it('returns null for an abbreviation not in the table', () => {
    expect(mapBioPosition('h')).toBeNull();
  });
});

describe('mapSpecialPosition', () => {
  it.each(Object.entries(SPECIAL_EXPECTED))('maps %s to %s', (key, slot) => {
    expect(mapSpecialPosition(key)).toBe(slot);
  });
  it('has an expectation for every key in the production table', () => {
    expect(Object.keys(SPECIAL).sort()).toEqual(Object.keys(SPECIAL_EXPECTED).sort());
  });
  it('drops the holder', () => {
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
