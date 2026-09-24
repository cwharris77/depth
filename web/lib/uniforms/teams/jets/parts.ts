// New York authored as composable parts. Geometry is imported unchanged from jets.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron. No helmet stripe, no pant stripe. The white
// wordmark is on every shell the club wears, so it is pinned white.
//
// The kits combine three helmets (home/away's #125740 green, rivalries' #115740 green, black-alt's
// black — the two greens differ by a step) and four jerseys/pants; the two-green separation is
// real, per the measured table, not a re-derivation.

import {
  JETS_BAND_LOW,
  JETS_BAND_TOP,
  JETS_COLLAR_PATH,
  JETS_COLLAR_WIDTH,
  JETS_DECAL_PATH,
  JETS_SLEEVE_X_LEFT,
  JETS_SLEEVE_X_RIGHT,
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

// The two white sleeve bands, separated by a body-colored gap.
export function sleeveBands(color: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', JETS_SLEEVE_X_LEFT],
    ['sleeve-right', JETS_SLEEVE_X_RIGHT],
  ];
  for (const [label, [top, bottom]] of [
    ['top', JETS_BAND_TOP],
    ['low', JETS_BAND_LOW],
  ] as [string, number[]][]) {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `jets-band-${label}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: color,
      });
    }
  }
  return out;
}

// The deep V-collar.
export function collar(color: string): PartLayer[] {
  return [
    {
      id: 'jets-collar',
      surface: 'collar',
      d: JETS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke: color,
      strokeWidth: JETS_COLLAR_WIDTH,
    },
  ];
}

// The white wordmark — pinned, everywhere.
export function wordmark(color: string): PartLayer[] {
  return [
    {
      id: 'jets-decal',
      surface: 'helmet',
      d: JETS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// Home/away's green shell (H1) — #125740, the current green.
export const HELMET_GREEN: UniformPart = expandHelmet('jets-green-helmet', {
  shell: 'green',
  facemask: 'white',
  decal: placed(wordmark('white')),
  number: 'none',
});

// Rivalries' green shell (H2) — #115740, a distinct step.
export const HELMET_RIV_GREEN: UniformPart = expandHelmet('jets-riv-helmet', {
  shell: 'rivalGreen',
  facemask: 'white',
  decal: placed(wordmark('white')),
  number: 'none',
});

// Black-alt shell (H3).
export const HELMET_BLACK: UniformPart = expandHelmet('jets-black-helmet', {
  shell: 'black',
  facemask: 'white',
  decal: placed(wordmark('green')),
  number: 'none',
});

// Pants — no pant stripe on any kit; each takes its body color.
export const PANTS_GREEN: UniformPart = { base: 'green', layers: [] };
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
export const PANTS_RIV: UniformPart = { base: 'rivalGreen', layers: [] };
export const PANTS_BLACK: UniformPart = { base: 'black', layers: [] };
