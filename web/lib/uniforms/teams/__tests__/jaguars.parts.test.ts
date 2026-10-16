import { describe, expect, it } from 'vitest';
import { JAGUARS_PARTS } from '../jaguars';
import { boundsOf } from '../core/marks';

describe('Jaguars recurring jersey marks', () => {
  for (const jersey of ['teal', 'white', 'black-alt']) {
    it(`puts the ${jersey} head on the left chest without duplicating it on the sleeves`, () => {
      const marks = JAGUARS_PARTS.jerseys[jersey].layers.filter((l) =>
        l.id.startsWith('jaguars-chest-')
      );
      expect(marks.length).toBeGreaterThan(0);
      for (const layer of marks) {
        expect(layer.surface).toBe('jersey');
        const [x0, y0, x1, y1] = boundsOf(layer.d);
        expect(x0).toBeGreaterThanOrEqual(388);
        expect(x1).toBeLessThanOrEqual(442);
        expect(y0).toBeGreaterThan(455);
        expect(y1).toBeLessThan(515);
      }
      expect(
        JAGUARS_PARTS.jerseys[jersey].layers.some((l) => l.id.startsWith('jaguars-prowler-'))
      ).toBe(false);
    });
  }
  it('puts inward-facing running jaguars on both throwback sleeves, with no modern chest head', () => {
    const layers = JAGUARS_PARTS.jerseys.throwback.layers;
    expect(layers.some((l) => l.id.startsWith('jaguars-chest-'))).toBe(false);
    for (const side of ['left', 'right']) {
      const marks = layers.filter(
        (l) => l.id.startsWith('jaguars-prowler-') && l.surface === `sleeve-${side}`
      );
      expect(marks.length).toBe(5);
      const [x0, y0, x1, y1] = boundsOf(marks[0].d);
      expect(x1 - x0).toBeGreaterThan(110);
      expect(y1 - y0).toBeGreaterThan(30);
    }
    const left = layers.find((l) => l.id === 'jaguars-prowler-black-left');
    const right = layers.find((l) => l.id === 'jaguars-prowler-black-right');
    if (!left || !right) throw new Error('Both sleeve silhouettes must be present');
    const leftPoints = (left.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const rightPoints = (right.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    for (let i = 0; i < leftPoints.length; i += 2) {
      expect(leftPoints[i] + rightPoints[i]).toBeCloseTo(588);
      expect(leftPoints[i + 1]).toBe(rightPoints[i + 1]);
    }
  });
});

describe('Jaguars jersey construction', () => {
  it('keeps the black alternate free of gold trim and number outlines', () => {
    const jersey = JAGUARS_PARTS.jerseys['black-alt'];
    expect(jersey.number?.outlineWidth).toBe(0);
    expect(
      jersey.layers.some((l) => (l.kind === 'fill' ? l.fill === 'gold' : l.stroke === 'gold'))
    ).toBe(false);
    expect(jersey.layers.some((l) => l.id.includes('shoulder-number'))).toBe(true);
    expect(
      jersey.layers.some(
        (l) => l.kind === 'stroke' && l.stroke === 'outline' && l.surface === 'collar'
      )
    ).toBe(true);
  });
  it('lets each Prowler black hem extend farther inward than its light block', () => {
    const layers = JAGUARS_PARTS.jerseys.throwback.layers;
    for (const side of ['left', 'right']) {
      const block = layers.find((l) => l.id === `jaguars-block-${side}`);
      const hem = layers.find((l) => l.id === `jaguars-throwback-cuff-${side}`);
      if (!block || !hem) throw new Error('Both cuff layers are required');
      const [bx0, , bx1] = boundsOf(block.d);
      const [hx0, , hx1] = boundsOf(hem.d);
      expect(hx1 - hx0).toBeGreaterThan(bx1 - bx0);
    }
    expect(
      layers.some(
        (l) =>
          l.id === 'jaguars-throwback-number-outer-outline' &&
          l.kind === 'stroke' &&
          l.stroke === 'black'
      )
    ).toBe(true);
  });
});
