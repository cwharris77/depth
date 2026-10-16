import type { PatternDef } from '../../core/types';

// A narrow numeral with a flat left side and two rounded lobes on the right.
export const COMMANDERS_NUMBER_THREE =
  'M262,539 L314,539 Q338,539 338,563 L338,596 Q338,610 327,616.5 Q338,623 338,637 L338,670 Q338,694 314,694 L262,694 L252,684 L252,650 L282,650 L282,666 L300,666 Q308,666 308,658 L308,638 Q308,630 300,630 L280,630 L280,603 L300,603 Q308,603 308,595 L308,575 Q308,567 300,567 L282,567 L282,583 L252,583 L252,549 Z';

// White diamonds on a staggered grid across the chest numeral, largest at the top and shrinking to
// nothing near the bottom.
function stipple(): string {
  const dots: string[] = [];
  for (let row = 0; row * 6 <= 162; row++) {
    const y = 536 + row * 6;
    const r = 2.5 - (row * 6 * 2.1) / 162;
    if (r < 0.5) break;
    for (let x = 236 + (row % 2) * 3.5; x <= 352; x += 7) {
      const f = (v: number) => v.toFixed(1);
      dots.push(
        `M${f(x)},${f(y - r)} L${f(x + r)},${f(y)} L${f(x)},${f(y + r)} L${f(x - r)},${f(y)} Z`
      );
    }
  }
  return dots.join(' ');
}

// The away numeral's fill: burgundy under the fading white stipple.
export const COMMANDERS_NUMBER_PATTERNS: Record<string, PatternDef> = {
  'commanders-number-stipple': {
    width: 588,
    height: 820,
    // Keep the printed fade aligned with the taller 195-unit chest numeral.
    transform: `translate(0 539) scale(1 ${195 / 155}) translate(0 -539)`,
    shapes: [
      { d: 'M0,0 H588 V820 H0 Z', fill: 'burgundy' },
      { d: stipple(), fill: 'white' },
    ],
  },
};
