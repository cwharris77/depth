// Washington authored as composable parts. Geometry is imported unchanged from commanders.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// One construction: a broad band at the sleeve cap split by a thinner line through its middle. No
// collar trim, no helmet stripe, no pant stripe. The three kits combine one helmet (the burgundy
// shell), two jerseys (burgundy shared by home + 70s-burgundy, white for away), and two pants
// (burgundy for home/70s, white for away).
//
// NOTE: home and 70s-burgundy render IDENTICALLY by design — both store burgundy over gold,
// differing only in accent — and the reference draws one burgundy sleeve treatment. The spec flags
// this as a known pixel-identical pair to surface, not to silently collapse.

import {
  COMMANDERS_BOUNDS,
  COMMANDERS_DECAL_PATH,
  COMMANDERS_SLEEVE_X_LEFT,
  COMMANDERS_SLEEVE_X_RIGHT,
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

// The broad cap band split by a thinner line through its middle.
export function sleeveBand(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', COMMANDERS_SLEEVE_X_LEFT],
    ['sleeve-right', COMMANDERS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < COMMANDERS_BOUNDS.length - 1; i += 1) {
    const top = COMMANDERS_BOUNDS[i];
    const bottom = COMMANDERS_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `commanders-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? line : band,
      });
    }
  }
  return out;
}

// The gold "W" — one layer, four subpaths, no keyline. Gold is the mark's color on every kit; the
// jersey supplies which palette color that is.
export function decal(which: string): PartLayer[] {
  return [
    {
      id: 'commanders-decal',
      surface: 'helmet',
      d: COMMANDERS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: which,
    },
  ];
}

// The burgundy shell with the gold "W" — one object, shared by all three kits.
//
// White cage. The burgundy Commanders shell wears a white facemask (named sources; the white cage
// reads cleanly against the burgundy shell).
export const HELMET_BURGUNDY: UniformPart = expandHelmet('commanders-burgundy-helmet', {
  shell: 'burgundy',
  facemask: 'white',
  decal: placed(decal('gold')),
  number: 'none',
});

// Burgundy pants (home + 70s-burgundy).
export const PANTS_BURGUNDY: UniformPart = { base: 'burgundy', layers: [] };

// White pants (away).
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
