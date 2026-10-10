import { describe, expect, it } from 'vitest';
import vocabulary from '../../fixtures/positions/nflverse-vocabulary.json';
import type { Position } from '../types';
import {
  DEPTH_CHART_POSITION,
  DEPTH_CHART_SPECIAL_ROLE,
  DEPTH_CHART_UNPLACED,
  ROSTER_POSITION,
  classifyDepthChartCode,
  depthChartUnit,
  type DepthChartUnit,
  mapRosterPosition,
} from './positions';

// Every approved roster code, written out independently of the production table so a
// changed or added mapping has to be restated here.
const ROSTER_EXPECTED: Record<string, Position> = {
  QB: 'QB',
  RB: 'RB',
  HB: 'RB',
  FB: 'FB',
  WR: 'WR',
  TE: 'TE',
  T: 'OT',
  OT: 'OT',
  G: 'G',
  OG: 'G',
  C: 'C',
  DE: 'DE',
  EDGE: 'DE',
  DT: 'DT',
  NT: 'NT',
  OLB: 'LB',
  ILB: 'LB',
  MLB: 'LB',
  LB: 'LB',
  CB: 'CB',
  FS: 'FS',
  SS: 'SS',
  DB: 'DB',
  S: 'S',
  SAF: 'S',
  K: 'K',
  P: 'P',
  LS: 'LS',
  KR: 'KR',
  PR: 'PR',
};

// Roster codes with no canonical value: a generic lineman tag names no position, and a
// blank is no code at all. Their rows are dropped with a reason.
const ROSTER_KNOWN_DROPS = ['', 'DL', 'OL'];

describe('mapRosterPosition', () => {
  it.each(Object.entries(ROSTER_EXPECTED))('maps %s to %s', (code, position) => {
    expect(mapRosterPosition(code)).toBe(position);
  });

  it('has an expectation for every code in the production table', () => {
    expect(Object.keys(ROSTER_POSITION).sort()).toEqual(Object.keys(ROSTER_EXPECTED).sort());
  });

  it('is case-insensitive and trims', () => {
    expect(mapRosterPosition(' qb ')).toBe('QB');
  });

  it('returns null for an unknown code rather than guessing', () => {
    expect(mapRosterPosition('LONGSNAPPER')).toBeNull();
    expect(mapRosterPosition('')).toBeNull();
    expect(mapRosterPosition('  ')).toBeNull();
  });

  it.each(vocabulary.rosterCodes)('accounts for the published roster code %j', (code) => {
    expect(mapRosterPosition(code) !== null || ROSTER_KNOWN_DROPS.includes(code)).toBe(true);
  });

  it.each(ROSTER_KNOWN_DROPS)('still drops %j, so the known-drop list stays honest', (code) => {
    expect(mapRosterPosition(code)).toBeNull();
  });
});

const UNITS: DepthChartUnit[] = ['offense', 'defense', 'special'];

// The same code names a different position on each side of the ball (`LT` is a left
// tackle on offense and a defensive tackle on defense), so expectations are per unit.
const DEPTH_CHART_EXPECTED: Record<DepthChartUnit, Record<string, Position>> = {
  offense: {
    QB: 'QB',
    RB: 'RB',
    HB: 'RB',
    FB: 'FB',
    WR: 'WR',
    TE: 'TE',
    LT: 'LT',
    LOT: 'LT',
    LG: 'LG',
    C: 'C',
    RG: 'RG',
    RT: 'RT',
    ROT: 'RT',
    T: 'OT',
    G: 'G',
  },
  defense: {
    DE: 'DE',
    EDGE: 'DE',
    LDE: 'LDE',
    LE: 'LDE',
    RDE: 'RDE',
    RE: 'RDE',
    DT: 'DT',
    LDT: 'DT',
    RDT: 'DT',
    LT: 'DT',
    RT: 'DT',
    T: 'DT',
    NT: 'NT',
    LB: 'LB',
    MLB: 'LB',
    MIKE: 'LB',
    OLB: 'LB',
    ILB: 'LB',
    LOLB: 'LB',
    ROLB: 'LB',
    WLB: 'WLB',
    WILL: 'WLB',
    SLB: 'SLB',
    SAM: 'SLB',
    LILB: 'LILB',
    RILB: 'RILB',
    CB: 'CB',
    LCB: 'LCB',
    RCB: 'RCB',
    NB: 'NB',
    S: 'S',
    SS: 'SS',
    FS: 'FS',
  },
  special: {
    K: 'K',
    PK: 'K',
    P: 'P',
    LS: 'LS',
  },
};

const SPECIAL_ROLE_EXPECTED: Record<string, string> = {
  KR: 'kr',
  KOR: 'kr',
  PR: 'pr',
  H: 'h',
  PH: 'h',
  KO: 'ko',
  KOS: 'ko',
};

describe('depthChartUnit', () => {
  it('reads the legacy formation column', () => {
    expect(depthChartUnit('Offense', true)).toBe('offense');
    expect(depthChartUnit('Defense', true)).toBe('defense');
    expect(depthChartUnit('Special Teams', true)).toBe('special');
  });

  it('returns null for a legacy formation it does not know', () => {
    expect(depthChartUnit('', true)).toBeNull();
    expect(depthChartUnit('3WR 1TE', true)).toBeNull();
  });

  it('reads the 2025+ position group, whose offense and defense names are personnel labels', () => {
    expect(depthChartUnit('3WR 1TE', false)).toBe('offense');
    expect(depthChartUnit('Base 4-3 D', false)).toBe('defense');
    expect(depthChartUnit('Base 3-4 D', false)).toBe('defense');
    expect(depthChartUnit('Special Teams', false)).toBe('special');
  });

  it('returns null for a blank 2025+ position group', () => {
    expect(depthChartUnit('', false)).toBeNull();
  });
});

describe('classifyDepthChartCode', () => {
  describe.each(UNITS)('%s', (unit) => {
    it.each(Object.entries(DEPTH_CHART_EXPECTED[unit]))('places %s at %s', (code, position) => {
      expect(classifyDepthChartCode(unit, code)).toEqual({ kind: 'position', position });
    });

    it('has an expectation for every code in the position table', () => {
      expect(Object.keys(DEPTH_CHART_POSITION[unit]).sort()).toEqual(
        Object.keys(DEPTH_CHART_EXPECTED[unit]).sort()
      );
    });

    it.each(vocabulary.depthChartCodes[unit])('accounts for the published code %j', (code) => {
      expect(classifyDepthChartCode(unit, code).kind).not.toBe('unmapped');
    });

    it.each([...DEPTH_CHART_UNPLACED[unit]])(
      'lists %j as unplaced only while nflverse publishes it',
      (code) => {
        expect(vocabulary.depthChartCodes[unit]).toContain(code);
      }
    );

    it('never lists one code in two tables', () => {
      const all = [
        ...Object.keys(DEPTH_CHART_POSITION[unit]),
        ...(unit === 'special' ? Object.keys(DEPTH_CHART_SPECIAL_ROLE) : []),
        ...DEPTH_CHART_UNPLACED[unit],
      ];
      expect(new Set(all).size).toBe(all.length);
    });
  });

  it.each(Object.entries(SPECIAL_ROLE_EXPECTED))('reads %s as the %s role', (code, role) => {
    expect(classifyDepthChartCode('special', code)).toEqual({ kind: 'special', role });
  });

  it('has an expectation for every code in the special-role table', () => {
    expect(Object.keys(DEPTH_CHART_SPECIAL_ROLE).sort()).toEqual(
      Object.keys(SPECIAL_ROLE_EXPECTED).sort()
    );
  });

  it('reads a tackle by the side of the ball he is charted on', () => {
    expect(classifyDepthChartCode('offense', 'LT')).toEqual({ kind: 'position', position: 'LT' });
    expect(classifyDepthChartCode('defense', 'LT')).toEqual({ kind: 'position', position: 'DT' });
  });

  it('does not place a position player listed on a special-teams unit', () => {
    expect(classifyDepthChartCode('special', 'WR')).toEqual({ kind: 'unplaced' });
  });

  it('is case-insensitive and trims', () => {
    expect(classifyDepthChartCode('offense', ' lot ')).toEqual({
      kind: 'position',
      position: 'LT',
    });
  });

  it('reports a code it has never seen as unmapped', () => {
    expect(classifyDepthChartCode('defense', 'STAR')).toEqual({ kind: 'unmapped' });
  });
});
