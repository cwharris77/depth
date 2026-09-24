// Atlanta's shared helmet, jerseys and pants for the native uniform archive.
// The four-color falcon is fixed helmet art. Home and away retain canonical black pants
// while exposing the reference's white option; the historical red alternate remains black.
// Colors belong to named parts, independent of the jersey-relative palette slots.

import {
  FALCONS_DECAL_BODY_PATH,
  FALCONS_DECAL_SILVER_PATH,
  FALCONS_DECAL_SILHOUETTE_PATH,
  FALCONS_DECAL_STREAKS_PATH,
  FALCONS_SIDE_STRIPE_LEFT,
  FALCONS_SIDE_STRIPE_RIGHT,
} from './source';
import { expandHelmet } from '../core/helmet-spec';
import { placed } from '../core/marks';
import { type PartLayer, type UniformPart } from '../core/parts';
import type { UniformSurface } from '../core/types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The side-seam piping pair, shared by every jersey.
export function sideStripes(color: string): PartLayer[] {
  return [
    fill('falcons-side-stripe-left', 'jersey', FALCONS_SIDE_STRIPE_LEFT, color),
    fill('falcons-side-stripe-right', 'jersey', FALCONS_SIDE_STRIPE_RIGHT, color),
  ];
}

// The falcon decal is fixed art on the black shell — nothing here moves with the palette, so it
// lives entirely inside the (single) helmet part rather than being restated per kit. The black
// shell's silver cage is the 2020 redesign's "back to black" facemask (see palette note).
export const HELMET_BLACK_FALCON: UniformPart = expandHelmet('falcons-black-falcon-helmet', {
  shell: 'black',
  facemask: 'silver',
  decal: placed([
    fill('falcons-decal-silver', 'helmet', FALCONS_DECAL_SILVER_PATH, 'silver'),
    fill('falcons-decal-silhouette', 'helmet', FALCONS_DECAL_SILHOUETTE_PATH, 'white'),
    fill('falcons-decal-body', 'helmet', FALCONS_DECAL_BODY_PATH, 'black'),
    fill('falcons-decal-streaks', 'helmet', FALCONS_DECAL_STREAKS_PATH, 'decalRed'),
  ]),
  number: 'none',
});

// The 2025 reference side swatch has a tapered red center with black keylines. Follow the
// mannequin leg edge and stop at the pant hem (y=1196), before the socks begin.
export function pantsStripes(): PartLayer[] {
  return [
    fill(
      'falcons-pants-backing-left',
      'leg-left',
      'M170,807 L178,807 L158,918 L143,932 L132,1050 L143,1082 L143,1100 L136,1134 L136,1196 L120,1196 L120,1134 L127,1100 L127,1082 L116,1050 L127,928 L142,914 Z',
      'black'
    ),
    fill(
      'falcons-pants-backing-right',
      'leg-right',
      'M418,807 L410,807 L430,918 L445,932 L456,1050 L445,1082 L445,1100 L452,1134 L452,1196 L468,1196 L468,1134 L461,1100 L461,1082 L472,1050 L461,928 L446,914 Z',
      'black'
    ),
    fill(
      'falcons-pants-stripe-left',
      'leg-left',
      'M173,807 L175,807 L154,918 L139,932 L129,1050 L138,1082 L138,1100 L132,1134 L129,1196 L127,1196 L124,1134 L132,1100 L132,1082 L121,1050 L132,928 L146,914 Z',
      'red'
    ),
    fill(
      'falcons-pants-stripe-right',
      'leg-right',
      'M415,807 L413,807 L434,918 L449,932 L459,1050 L450,1082 L450,1100 L456,1134 L459,1196 L461,1196 L464,1134 L456,1100 L456,1082 L467,1050 L456,928 L442,914 Z',
      'red'
    ),
  ];
}

// Black pants are canonical; white pants are the alternate option shown with the same side seam.
export const PANTS_BLACK: UniformPart = { base: 'black', layers: pantsStripes() };
export const PANTS_WHITE: UniformPart = { base: 'white', layers: pantsStripes() };
