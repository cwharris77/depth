import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  fmt1,
  placeMark,
  placeMarkOnPair,
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

  it('includes curve control points and the ends of H and V', () => {
    expect(boundsOf('M0,0 C0,-5 20,-5 20,0 V8 H-3 Z')).toEqual([-3, -5, 20, 8]);
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

  it('places curve control points with the same fit as the points they bend between', () => {
    const curve: Mark = {
      box: [0, 0, 10, 10],
      paths: [{ slot: 'a', d: 'M0,0 C5,0 10,5 10,10 Q5,10 0,5 Z' }],
    };
    // helmet-side: x0=154, w=310, cy=293; aspect 1 so the scale is 31 and y0=138.
    expect(placeMark('p', curve, 'helmet-side', { a: 'navy' })[0].d).toBe(
      'M154.0,138.0 C309.0,138.0 464.0,293.0 464.0,448.0 Q309.0,448.0 154.0,293.0 Z'
    );
  });

  it('reads H and V as lines to the point they reach', () => {
    const box: Mark = { box: [0, 0, 10, 10], paths: [{ slot: 'a', d: 'M0,0 H10 V10 H0 Z' }] };
    expect(placeMark('p', box, 'helmet-side', { a: 'navy' })[0].d).toBe(
      'M154.0,138.0 L464.0,138.0 L464.0,448.0 L154.0,448.0 Z'
    );
  });

  it('rejects relative and other path commands', () => {
    for (const d of ['M0,0 l1,1 Z', 'M0,0 A1,1 0 0 1 3,3 Z', 'M0,0 S1,1 2,2 Z']) {
      const mark: Mark = { box: [0, 0, 10, 10], paths: [{ slot: 'a', d }] };
      expect(() => placeMark('p', mark, 'helmet-side', { a: 'navy' })).toThrow(
        'absolute M/L/H/V/C/Q/Z'
      );
    }
  });

  it('places a mark drawn in the right shoulder box unchanged, and mirrors it about the centre', () => {
    const band: Mark = {
      box: [356, 360, 576, 532],
      paths: [{ slot: 'a', d: 'M360,414 C398,421 448,430 488,443 L383,446 Z' }],
    };
    const [right] = placeMark('p', band, 'shoulder-right', { a: 'navy' });
    const [left] = placeMark('p', band, 'shoulder-left', { a: 'navy' });
    expect(right).toMatchObject({ id: 'p-a-right', surface: 'sleeve-right' });
    expect(right.d).toBe('M360.0,414.0 C398.0,421.0 448.0,430.0 488.0,443.0 L383.0,446.0 Z');
    expect(left).toMatchObject({ id: 'p-a-left', surface: 'sleeve-left' });
    expect(left.d).toBe('M228.0,414.0 C190.0,421.0 140.0,430.0 100.0,443.0 L205.0,446.0 Z');
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

describe('placeMarkOnPair', () => {
  it('interleaves left and right per slot, in the mark paint order', () => {
    const two: Mark = {
      box: [0, 0, 10, 10],
      paths: [
        { slot: 'a', d: 'M0,0 L10,0 L10,10 Z' },
        { slot: 'b', d: 'M0,0 L5,5 L0,10 Z' },
      ],
    };
    for (const pair of ['sleeves', 'shoulders'] as const) {
      expect(placeMarkOnPair('p', two, pair, { a: 'navy', b: 'white' }).map((l) => l.id)).toEqual([
        'p-a-left',
        'p-a-right',
        'p-b-left',
        'p-b-right',
      ]);
    }
  });
});
