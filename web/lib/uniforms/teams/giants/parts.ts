// New York authored as composable parts. Geometry is imported unchanged from giants.ts — this
// file only restates WHICH parts each kit combines, and names every color from the team palette
// instead of the kit row's shifting primary/secondary/accent.
//
// The three kits do not share one construction: the royal home jersey has NO sleeve stripes, the
// white away jersey carries a thin/thick/thin red set, and the 1980s throwback carries a
// red/white/red set at the cuff plus the only collar trim. What IS shared: home and away wear the
// SAME blue shell with the white monogram, and all three wear white pants. The throwback's shell
// is bare (a GIANTS wordmark that is out of scope, not a borrowed monogram) — so it is the second
// helmet part, same blue, different layers.

import {
  GIANTS_AWAY_SLEEVE_X_LEFT,
  GIANTS_AWAY_SLEEVE_X_RIGHT,
  GIANTS_AWAY_STRIPE_BANDS,
  GIANTS_COLLAR_CORE_WIDTH,
  GIANTS_COLLAR_OUTER_WIDTH,
  GIANTS_THROWBACK_SLEEVE_X_LEFT,
  GIANTS_THROWBACK_SLEEVE_X_RIGHT,
  GIANTS_THROWBACK_STRIPE_BANDS,
} from './source';
import { GIANTS_DECAL_MODERN_PATHS } from './decal';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

export const COLLAR_PATH = 'M206,388 L294,455 L386,388';

export function sleeveStripes(
  bands: [number, number][],
  xLeft: number[],
  xRight: number[],
  fills: string[]
): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', xLeft],
    ['sleeve-right', xRight],
  ];
  bands.forEach(([top, bottom], i) => {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `giants-sleeve-stripe-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: fills[i],
      });
    }
  });
  return out;
}

// The blue shell with the white monogram — one object, shared by home and away.
//
// Grey cage. The modern metallic-blue shell carries a grey facemask (named sources; the GUD
// composite reads the bars at ~#9a9a9a against the blue shell). The shared neutral #4b5158 it
// replaces is a noticeably darker grey.
export const HELMET_BLUE_MONOGRAM: UniformPart = {
  base: 'royal',
  facemask: 'cageGrey',
  layers: [
    {
      id: 'giants-decal-monogram',
      surface: 'helmet',
      d: GIANTS_DECAL_MODERN_PATHS.map((path) => path.d).join(' '),
      clip: true,
      kind: 'fill',
      fill: 'white',
    },
  ],
};

// The throwback's bare blue shell — the wordmark is out of scope, so it keeps the shell color and
// nothing else (this is the second helmet part: same shell, no monogram).
//
// White cage. The 1980-1999 era (restored as the Legacy look) wore a navy shell with a WHITE
// facemask (giantswire: "navy with a white facemask"; pocketprohelmets notes the 1975 switch from
// grey to white). GUD cannot cleanly separate a white cage from the surrounding blues, so the
// named sources are the source of truth here.
export const HELMET_BLUE_BARE: UniformPart = { base: 'royal', facemask: 'white', layers: [] };

// Plain white pants, shared by every kit.
export const PANTS_WHITE: UniformPart = { base: 'white', layers: [] };
