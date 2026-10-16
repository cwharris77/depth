import { describe, expect, it } from 'vitest';
import { DOLPHINS_PARTS } from '../dolphins';
import { boundsOf } from '../core/marks';

describe('Dolphins sleeve constructions', () => {
  it.each(['teal', 'white'])('%s carries the recurring dolphin on both outer sleeves', (key) => {
    const logos = DOLPHINS_PARTS.jerseys[key].layers.filter((l) =>
      l.id.startsWith('dolphins-modern-sleeve-')
    );
    expect(logos).toHaveLength(8);
    for (const side of ['left', 'right']) {
      const layers = logos.filter((l) => l.surface === `sleeve-${side}`);
      expect(layers).toHaveLength(4);
      expect(layers.every((l) => l.clip)).toBe(true);
      expect(boundsOf(layers[0].d)[3]).toBeLessThan(560);
    }
  });
  it('ends the throwback sleeve bars at the hem', () => {
    const bars = DOLPHINS_PARTS.jerseys['1972'].layers.filter((l) =>
      l.id.startsWith('dolphins-sleeve-band-')
    );
    expect(bars).toHaveLength(10);
    expect(Math.max(...bars.map((l) => boundsOf(l.d)[3]))).toBe(591);
  });
  it('places the Rivalries aqua and orange band at the lower outer sleeve', () => {
    const trim = DOLPHINS_PARTS.jerseys.navy.layers.filter(
      (l) => l.id.includes('dolphins-wedge-') || l.id.includes('dolphins-slash-')
    );
    expect(trim).toHaveLength(4);
    for (const layer of trim) {
      const [, top, , bottom] = boundsOf(layer.d);
      expect(top).toBeGreaterThanOrEqual(540);
      expect(bottom).toBeLessThanOrEqual(591);
      expect(layer.kind).toBe('fill');
    }
  });
});
