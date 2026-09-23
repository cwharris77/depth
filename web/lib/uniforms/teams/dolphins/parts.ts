// Miami authored as composable parts. Geometry is imported unchanged from dolphins.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The four kits are NOT one construction: home and away carry no sleeve trim at all; the 1972
// throwback carries a five-band sleeve set (white over orange) and a TEAL crown stripe; Rivalries
// carries a teal wedge with an orange slash plus an orange collar V. All four wear a helmet crown
// stripe (the one thing they share). The decal is the sunburst in the current kits and the broken
// teal dolphin/ring in the throwback.
//
// The kits combine three helmets (white shell, navy rivalries shell, white throwback shell with a
// teal stripe), four jerseys (teal, white, navy, teal-with-bands), and three pants (white shared by
// home + 1972, teal, navy). The away kit carries both teal and white pants options; teal stays
// canonical so its existing raster remains unchanged.

import { HELMET_CROWN_STRIPE_PATH } from '../core/shared';
import {
  DOLPHINS_COLLAR_PATH,
  DOLPHINS_COLLAR_WIDTH,
  DOLPHINS_DECAL_DOLPHIN_PATH,
  DOLPHINS_DECAL_NAVY_PATH,
  DOLPHINS_DECAL_SUNBURST_PATH,
  DOLPHINS_SLASH_LEFT,
  DOLPHINS_SLASH_RIGHT,
  DOLPHINS_SLASH_WIDTH,
  DOLPHINS_SLEEVE_X_LEFT,
  DOLPHINS_SLEEVE_X_RIGHT,
  DOLPHINS_TB_DECAL_DOLPHIN_PATH,
  DOLPHINS_TB_DECAL_RING_PATH,
  DOLPHINS_TB_STRIPE_BOUNDS,
  DOLPHINS_WEDGE_LEFT,
  DOLPHINS_WEDGE_RIGHT,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

// The crown-hugging helmet stripe all four kits wear (shared geometry from ./shared).
export function crownStripe(color: string): PartLayer[] {
  return [
    {
      id: 'dolphins-crown-stripe',
      surface: 'helmet',
      d: HELMET_CROWN_STRIPE_PATH,
      clip: true,
      kind: 'fill',
      fill: color,
    },
  ];
}

// Orange element first, dolphin over it — the paint order every trimmed mark here uses.
export function decal(ring: string, dolphin: string, throwback = false): PartLayer[] {
  return [
    {
      id: 'dolphins-decal-ring',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_RING_PATH : DOLPHINS_DECAL_SUNBURST_PATH,
      clip: true,
      kind: 'fill',
      fill: ring,
    },
    {
      id: 'dolphins-decal-dolphin',
      surface: 'helmet',
      d: throwback ? DOLPHINS_TB_DECAL_DOLPHIN_PATH : DOLPHINS_DECAL_DOLPHIN_PATH,
      clip: true,
      kind: 'fill',
      fill: dolphin,
    },
    ...(!throwback
      ? [
          {
            id: 'dolphins-decal-navy',
            surface: 'helmet' as const,
            d: DOLPHINS_DECAL_NAVY_PATH,
            clip: true,
            kind: 'fill' as const,
            fill: 'navy',
          },
        ]
      : []),
  ];
}

// The 1972 five-band sleeve set (white over orange).
export function throwbackStripes(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', DOLPHINS_SLEEVE_X_LEFT],
    ['sleeve-right', DOLPHINS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < DOLPHINS_TB_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = DOLPHINS_TB_STRIPE_BOUNDS[i];
    const bottom = DOLPHINS_TB_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `dolphins-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : line,
      });
    }
  }
  return out;
}

// The white shell with an orange crown stripe + sunburst (H1) — shared by home and away.
//
// White cage. The white Dolphins shell wears a white facemask (named sources — Miami is a classic
// white-cage team).
export const HELMET_WHITE: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [...crownStripe('orange'), ...decal('orange', 'teal')],
};

// The navy rivalries shell (H2) with the orange stripe + sunburst and dark navy cage, as shown
// by the GUD dark alternate figure.
export const HELMET_NAVY: UniformPart = {
  base: 'navy',
  facemask: 'navy',
  layers: [...crownStripe('orange'), ...decal('orange', 'teal')],
};

// The 1972 throwback shell (H3): white with a TEAL crown stripe and the broken-ring dolphin.
export const HELMET_WHITE_1972: UniformPart = {
  base: 'white',
  facemask: 'white',
  layers: [...crownStripe('teal'), ...decal('orange', 'teal', true)],
};

// White pants (P1, shared by home + 1972).
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };

// Teal pants (P2, away canonical option).
export const PANTS_TEAL: UniformPart = { base: 'teal', layers: [] };

// Navy pants (P3, rivalries).
export const PANTS_NAVY: UniformPart = { base: 'navy', layers: [] };
