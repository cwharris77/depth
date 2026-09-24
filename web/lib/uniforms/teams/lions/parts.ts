// Detroit authored as composable parts. Geometry is imported unchanged from lions.ts — this file
// only restates WHICH parts each kit combines, and names every color from the team palette instead
// of the kit row's shifting primary/secondary/accent.
//
// The construction is one four-band stripe set floating on the outer third of each sleeve, and a
// leaping-lion decal (white keyline, blue body). All three kits wear the SAME silver shell with
// the lion. The body and pants do vary: home is a blue body over (default) blue pants, away a
// white body over silver pants (accent), and gridiron-gray a silver body over silver pants
// (primary) — so the two shared pant parts are blue (home) and silver (away + gridiron).

import { LIONS_SLEEVE_X_LEFT, LIONS_SLEEVE_X_RIGHT, LIONS_STRIPE_BOUNDS } from './source';
import { LIONS_DECAL_PATHS as GENERATED_LIONS_DECAL_PATHS } from './decal';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

// Four contiguous sleeve bands, outer color and inner color alternating from the top down.
export function sleeveStripes(band: string, line: string): PartLayer[] {
  const out: PartLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', LIONS_SLEEVE_X_LEFT],
    ['sleeve-right', LIONS_SLEEVE_X_RIGHT],
  ];
  for (let i = 0; i < LIONS_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = LIONS_STRIPE_BOUNDS[i];
    const bottom = LIONS_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `lions-sleeve-band-${i}-${side}`,
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

// The silver shell with the leaping-lion decal (white keyline, then the blue body over it) — one
// object, shared by every kit. The keyline is the body mask grown by nine upsampled px, not a
// traced ring (see lions.ts).
//
// Silver cage. The modern silver shell wears a silver facemask (named sources: "silver
// polyvinyl-coated steel face mask"); the composite cannot separate a silver cage from the same-toned shell,
// so the named source and the team's silver #B0B7BC are the source of truth here. The shared
// neutral #4b5158 it replaces is a dark grey that reads as a hole in the silver shell.
export const HELMET_SILVER_LION: UniformPart = expandHelmet('lions-silver-lion-helmet', {
  shell: 'silver',
  facemask: 'silver',
  decal: placed(
    GENERATED_LIONS_DECAL_PATHS.map((layer, index) => ({
      id: `lions-decal-${index}`,
      surface: 'helmet' as const,
      d: layer.d,
      clip: true,
      kind: 'fill' as const,
      fill: layer.fill,
    }))
  ),
  number: 'none',
});

// Blue pants (home).
export const PANTS_BLUE: UniformPart = { base: 'blue', layers: [] };

// Silver pants (away and gridiron — away reaches it through 'accent', gridiron through 'primary').
export const PANTS_SILVER: UniformPart = { base: 'silver', layers: [] };
