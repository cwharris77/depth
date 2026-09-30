// New York's helmets and pants. The jerseys are specs under ./jerseys/.
//
// The kits combine three helmets (home/away's #125740 green, rivalries' #115740 green, black-alt's
// black — the two greens differ by a step) and four jerseys/pants. No helmet stripe, no pant
// stripe. The white wordmark is on every shell the club wears, so it is pinned white.

import { JETS_DECAL_PATH } from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';

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
