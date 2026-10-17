import { describe, expect, it } from 'vitest';
import { EAGLES_PARTS } from '../eagles';
import { boundsOf } from '../core/marks';

describe('Eagles primary sleeve marks', () => {
  for (const jersey of ['green', 'white']) {
    it(`clips forward-facing eagle heads at both outer ${jersey} sleeve edges`, () => {
      const layers = EAGLES_PARTS.jerseys[jersey].layers.filter((layer) =>
        layer.id.includes('sleeve-head')
      );
      expect(layers).toHaveLength(10);
      for (const side of ['left', 'right']) {
        const outline = layers.find((layer) => layer.id.endsWith(`white-${side}`));
        expect(outline?.d).toBeDefined();
        if (!outline?.d) throw new Error('Missing sleeve head outline');
        const [x0, y0, x1, y1] = boundsOf(outline.d);
        expect((y1 - y0) / (x1 - x0)).toBeGreaterThan(0.5);
        expect(outline.clip).toBe(true);
        if (side === 'left') {
          expect(x0).toBeLessThan(30);
          expect(x1).toBeLessThan(80);
        } else {
          expect(x0).toBeGreaterThan(508);
          expect(x1).toBeGreaterThan(558);
        }
        expect(layers.filter((layer) => layer.id.endsWith(`-${side}`))).toHaveLength(5);
      }
      expect(
        EAGLES_PARTS.jerseys[jersey].layers.some((layer) => layer.id.includes('sleeve-wing'))
      ).toBe(false);
    });
  }
});

describe('Eagles modern Kelly sleeve marks', () => {
  it('keeps the full eagle layers and restored gold on both sleeves', () => {
    const layers = EAGLES_PARTS.jerseys['kelly-modern'].layers.filter((layer) =>
      layer.id.includes('sleeve-classic')
    );
    expect(layers).toHaveLength(44);
    expect(
      layers.filter((layer) => layer.kind === 'fill' && layer.fill === 'classicGold')
    ).toHaveLength(12);
    expect(layers.every((layer) => layer.clip)).toBe(true);
    expect(EAGLES_PARTS.palette.classicGold).toBe('#FFA40D');
    expect(EAGLES_PARTS.palette).not.toHaveProperty('classic007040');
    expect(
      EAGLES_PARTS.jerseys['kelly-original'].layers.some((layer) =>
        layer.id.includes('sleeve-classic')
      )
    ).toBe(false);
  });
});
