import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  fmt1,
  placeMark,
  placeMarkOnSleeves,
  type Mark,
} from '@/lib/uniforms/teams/core/marks';

const SQUARE: Mark = { box: [0, 0, 10, 10], paths: [{ slot: 'a', d: 'M0,0 L10,0 L10,10 Z' }] };

describe('fmt1', () => {
  it("matches Python's '%.1f', including half-even on exact binary ties", () => {
    expect(fmt1(154)).toBe('154.0');
    expect(fmt1(12.25)).toBe('12.2');
    expect(fmt1(-12.25)).toBe('-12.2');
    expect(fmt1(12.75)).toBe('12.8');
    expect(fmt1(1.05)).toBe('1.1');
    expect(fmt1(0.04)).toBe('0.0');
  });
});

describe('boundsOf', () => {
  it('returns [x0, y0, x1, y1] over every point of every subpath', () => {
    expect(boundsOf('M5,7 L9,1 Z M-2,3 L4,12 Z')).toEqual([-2, 1, 9, 12]);
  });

  it('rejects an empty path', () => {
    expect(() => boundsOf('')).toThrow();
  });

  it('rejects leftover text after a closed subpath', () => {
    expect(() => boundsOf('M0,0 L10,0 Z 5,5')).toThrow();
  });

  it('rejects an implicit lineto (a coordinate pair without its own command)', () => {
    expect(() => boundsOf('M0,0 L10,0 10,10 Z')).toThrow();
  });

  it('rejects a command missing a coordinate', () => {
    expect(() => boundsOf('M1,2 L3 Z')).toThrow();
  });

  it('rejects a malformed number', () => {
    expect(() => boundsOf('M0,0 L1.2.3,4 Z')).toThrow();
  });

  it('rejects an unclosed trailing subpath', () => {
    expect(() => boundsOf('M0,0 L10,0 L10,10')).toThrow();
  });

  it('rejects "MZ"', () => {
    expect(() => boundsOf('MZ')).toThrow();
  });
});

describe('placeMark', () => {
  it('fits the mark box to the anchor width and centres it vertically', () => {
    expect(placeMark('p', SQUARE, 'helmet-side', { a: 'navy' })).toEqual([
      {
        id: 'p-a',
        surface: 'helmet',
        d: 'M154.0,138.0 L464.0,138.0 L464.0,448.0 Z',
        clip: true,
        kind: 'fill',
        fill: 'navy',
      },
    ]);
  });

  it('mirrors on the left sleeve so the mark faces outward', () => {
    const [layer] = placeMark('p', SQUARE, 'sleeve-left', { a: 'navy' });
    expect(layer.id).toBe('p-a-left');
    expect(layer.surface).toBe('sleeve-left');
    expect(layer.d).toBe('M98.0,468.0 L24.0,468.0 L24.0,542.0 Z');
  });

  it('drops a slot mapped to null and rejects an unmapped slot', () => {
    expect(placeMark('p', SQUARE, 'helmet-side', { a: null })).toEqual([]);
    expect(() => placeMark('p', SQUARE, 'helmet-side', {})).toThrow('mark slot "a" is not mapped');
  });

  it('rejects path commands other than absolute M/L/Z', () => {
    const curve: Mark = { box: [0, 0, 10, 10], paths: [{ slot: 'a', d: 'M0,0 C1,1 2,2 3,3 Z' }] };
    expect(() => placeMark('p', curve, 'helmet-side', { a: 'navy' })).toThrow('absolute M/L/Z');
  });

  it('rejects a mark box with zero or negative width or height', () => {
    const zeroWidth: Mark = { box: [5, 0, 5, 10], paths: [{ slot: 'a', d: 'M0,0 L1,0 L1,1 Z' }] };
    const negativeHeight: Mark = {
      box: [0, 10, 10, 0],
      paths: [{ slot: 'a', d: 'M0,0 L1,0 L1,1 Z' }],
    };
    expect(() => placeMark('p', zeroWidth, 'helmet-side', { a: 'navy' })).toThrow();
    expect(() => placeMark('p', negativeHeight, 'helmet-side', { a: 'navy' })).toThrow();
  });

  it('places on the right sleeve with no mirror', () => {
    // anchor sleeve-right: x0=490, w=74, cy=505; aspect=1 so h=74, y0=505-37=468.
    // (0,0)->490.0,468.0  (10,0)->564.0,468.0  (10,10)->564.0,542.0
    expect(placeMark('p', SQUARE, 'sleeve-right', { a: 'navy' })).toEqual([
      {
        id: 'p-a-right',
        surface: 'sleeve-right',
        d: 'M490.0,468.0 L564.0,468.0 L564.0,542.0 Z',
        clip: true,
        kind: 'fill',
        fill: 'navy',
      },
    ]);
  });
});

describe('placeMarkOnSleeves', () => {
  it('interleaves left and right per slot, in the mark paint order', () => {
    const two: Mark = {
      box: [0, 0, 10, 10],
      paths: [
        { slot: 'a', d: 'M0,0 L10,0 L10,10 Z' },
        { slot: 'b', d: 'M0,0 L5,5 L0,10 Z' },
      ],
    };
    expect(placeMarkOnSleeves('p', two, { a: 'navy', b: 'white' }).map((l) => l.id)).toEqual([
      'p-a-left',
      'p-a-right',
      'p-b-left',
      'p-b-right',
    ]);
  });
});
