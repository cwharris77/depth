import { NIKE_MARK } from './pants-logos';
import type { PartLayer } from './parts';

// The outer sleeve wraps away from the front view; surface clipping hides the far end.
export function sleeveNike(prefix: string, color: string): PartLayer[] {
  const [x0, y0, x1, y1] = NIKE_MARK.box;
  const scale = 40 / (x1 - x0);
  return ['left', 'right'].map((side) => {
    let coordinate = 0;
    const d = NIKE_MARK.paths[0].d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
      const value = Number(n);
      if (coordinate++ % 2) return (442 + (value - (y0 + y1) / 2) * scale).toFixed(2);
      const x = 61 - (value - x0) * scale;
      return (side === 'left' ? x : 588 - x).toFixed(2);
    });
    return {
      id: `${prefix}-sleeve-nike-${side}`,
      surface: side === 'left' ? 'sleeve-left' : 'sleeve-right',
      d,
      clip: true,
      kind: 'fill',
      fill: color,
    };
  });
}
