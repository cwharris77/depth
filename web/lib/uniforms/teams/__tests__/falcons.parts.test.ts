import { describe, expect, it } from 'vitest';
import { FALCONS_PARTS } from '../falcons';
import { boundsOf } from '../core/marks';

const jerseys = ['black', 'white', 'red', 'red-2026', 'white-2026'];

describe('Falcons recurring sleeve marks', () => {
  for (const jersey of jerseys) {
    it(`${jersey}: wraps the falcon around both outer sleeves`, () => {
      const layers = FALCONS_PARTS.jerseys[jersey].layers.filter((layer) =>
        layer.id.startsWith('falcons-sleeve-')
      );
      expect(layers).toHaveLength(8);
      for (const side of ['left', 'right']) {
        const marks = layers.filter((layer) => layer.surface === `sleeve-${side}`);
        expect(marks).toHaveLength(4);
        for (const mark of marks) expect(mark.clip).toBe(true);
        const [x0, y0, x1, y1] = boundsOf(marks[0].d);
        expect(y0).toBeGreaterThan(440);
        expect(y1).toBeLessThan(575);
        // The full emblem continues around the arm beyond the front silhouette.
        if (side === 'left') {
          expect(x0).toBeLessThan(30);
          expect(x1).toBeLessThanOrEqual(80);
        } else {
          expect(x0).toBeGreaterThanOrEqual(508);
          expect(x1).toBeGreaterThan(558);
        }
      }
    });
  }
});
