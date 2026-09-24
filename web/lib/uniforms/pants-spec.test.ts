import { describe, expect, it } from 'vitest';
import { expandPants, expandSocks } from '@/lib/uniforms/teams/core/pants-spec';
import { compileParts } from '@/lib/uniforms/teams/core/parts';
import {
  SEAHAWKS_PANTS_EDGE_BAND_LEFT,
  SEAHAWKS_PANTS_EDGE_BAND_RIGHT,
} from '@/lib/uniforms/teams/seahawks/source';

describe('expandPants', () => {
  it('is a plain body with no stripes', () => {
    expect(expandPants('t', { body: 'navy' })).toEqual({ base: 'navy', layers: [] });
  });

  it('follows the leg edge exactly like the hand-drawn edge band', () => {
    const part = expandPants('t', {
      body: 'green',
      stripes: { position: 'leg-edge', bands: [{ color: 'navy', size: 'l' }], gap: 'none' },
    });
    expect(part.layers.map((l) => [l.id, l.surface, l.d])).toEqual([
      ['t-stripe-0-left', 'leg-left', SEAHAWKS_PANTS_EDGE_BAND_LEFT],
      ['t-stripe-0-right', 'leg-right', SEAHAWKS_PANTS_EDGE_BAND_RIGHT],
    ]);
  });

  it('centres a straight stack on the seam line and stops it at the hem', () => {
    const part = expandPants('t', {
      body: 'navy',
      stripes: { position: 'center', bands: [{ color: 'white', size: 'm' }], gap: 'none' },
    });
    expect(part.layers.map((l) => l.d)).toEqual([
      'M118,807 H134 V1196 H118 Z',
      'M454,807 H470 V1196 H454 Z',
    ]);
  });

  it('stacks bands from the outer edge inward with gaps and edge piping', () => {
    const part = expandPants('t', {
      body: 'navy',
      stripes: {
        position: 'center',
        bands: [
          { color: 'orange', size: 's' },
          { color: 'white', size: 's' },
        ],
        gap: 'narrow',
        edge: 'black',
      },
    });
    // widths: 2 + 8 + 2 = 12 per band, 4 gap → 28 total, starting at 126 - 14 = 112.
    expect(part.layers.filter((l) => l.surface === 'leg-left').map((l) => [l.id, l.d])).toEqual([
      ['t-stripe-0-edge-left', 'M112,807 H124 V1196 H112 Z'],
      ['t-stripe-0-left', 'M114,807 H122 V1196 H114 Z'],
      ['t-stripe-1-edge-left', 'M128,807 H140 V1196 H128 Z'],
      ['t-stripe-1-left', 'M130,807 H138 V1196 H130 Z'],
    ]);
    expect(part.layers.filter((l) => l.surface === 'leg-right').map((l) => [l.id, l.d])).toEqual([
      ['t-stripe-0-edge-right', 'M464,807 H476 V1196 H464 Z'],
      ['t-stripe-0-right', 'M466,807 H474 V1196 H466 Z'],
      ['t-stripe-1-edge-right', 'M448,807 H460 V1196 H448 Z'],
      ['t-stripe-1-right', 'M450,807 H458 V1196 H450 Z'],
    ]);
  });

  it('never draws a leg-edge stripe below the hem', () => {
    const part = expandPants('t', {
      body: 'navy',
      stripes: {
        position: 'leg-edge',
        bands: [
          { color: 'white', size: 'm' },
          { color: 'orange', size: 'l' },
        ],
        gap: 'broad',
        edge: 'black',
      },
    });
    for (const layer of part.layers) {
      const pairs = [...layer.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
      expect(Math.max(...pairs.map((m) => Number(m[2])))).toBeLessThanOrEqual(1196);
    }
  });
});

describe('expandSocks', () => {
  it('is a solid colour with no stripes', () => {
    expect(expandSocks('t', { color: 'white' })).toEqual({ base: 'white', layers: [] });
  });

  it('draws calf hoops on both socks from the top down', () => {
    const part = expandSocks('t', {
      color: 'navy',
      stripes: {
        bands: [
          { color: 'white', size: 's' },
          { color: 'orange', size: 'm' },
        ],
        gap: 'narrow',
      },
    });
    expect(part.layers.map((l) => [l.id, l.surface, l.d])).toEqual([
      ['t-hoop-0-left', 'sock-left', 'M100,1300 H240 V1308 H100 Z'],
      ['t-hoop-0-right', 'sock-right', 'M348,1300 H488 V1308 H348 Z'],
      ['t-hoop-1-left', 'sock-left', 'M100,1312 H240 V1328 H100 Z'],
      ['t-hoop-1-right', 'sock-right', 'M348,1312 H488 V1328 H348 Z'],
    ]);
  });

  it('compiles into a kit through the socks part', () => {
    const kit = compileParts({
      teamId: 'test',
      palette: { navy: '#001122', white: '#FFFFFF' },
      helmets: { h: { base: 'navy', layers: [] } },
      jerseys: {
        j: {
          base: 'white',
          layers: [],
          number: { fill: 'navy', outline: 'white', outlineWidth: 26 },
        },
      },
      pants: { p: expandPants('test-p', { body: 'white' }) },
      socks: { s: expandSocks('test-s', { color: 'navy' }) },
      kits: { home: { helmet: 'h', jersey: 'j', pants: 'p', socks: 's' } },
    }).kits.home;
    expect(kit.pantsColor).toBe('#FFFFFF');
    expect(kit.socksColor).toBe('#001122');
  });
});
