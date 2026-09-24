// Chicago's palette, helmet, pants and kits. All three kits share one helmet (navy shell, the
// wishbone C keylined white) and one pair of pants (navy, orange-over-white stripe); only the
// jersey changes. Jerseys are jersey specs in ./jerseys, expanded to layers by core/jersey-spec.

import {
  BEARS_DECAL_KEYLINE_PATH,
  BEARS_DECAL_LETTER_PATH,
  BEARS_PANTS_INNER_LEFT,
  BEARS_PANTS_INNER_RIGHT,
  BEARS_PANTS_OUTER_LEFT,
  BEARS_PANTS_OUTER_RIGHT,
} from './source';
import { type PartLayer, type UniformPart } from '../core/parts';

// The one shell, on all three kits. The cage is painted the shell navy rather than a neutral.
const HELMET_NAVY_C: UniformPart = {
  base: 'navy',
  facemask: 'navy',
  layers: [
    { id: 'bears-decal-keyline', d: BEARS_DECAL_KEYLINE_PATH, fill: 'white' },
    { id: 'bears-decal-letter', d: BEARS_DECAL_LETTER_PATH, fill: 'orange' },
  ].map((s): PartLayer => ({
    ...s,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fillRule: 'evenodd',
  })),
};

const PANTS_NAVY: UniformPart = {
  base: 'navy',
  layers: (
    [
      {
        id: 'bears-pants-outer-left',
        surface: 'leg-left',
        d: BEARS_PANTS_OUTER_LEFT,
        fill: 'orange',
      },
      {
        id: 'bears-pants-outer-right',
        surface: 'leg-right',
        d: BEARS_PANTS_OUTER_RIGHT,
        fill: 'orange',
      },
      {
        id: 'bears-pants-inner-left',
        surface: 'leg-left',
        d: BEARS_PANTS_INNER_LEFT,
        fill: 'white',
      },
      {
        id: 'bears-pants-inner-right',
        surface: 'leg-right',
        d: BEARS_PANTS_INNER_RIGHT,
        fill: 'white',
      },
    ] as const
  ).map((s): PartLayer => ({ ...s, clip: true, kind: 'fill' })),
};

export const BEARS_CONSTRUCTION = {
  teamId: 'bears',
  // Jersey hexes — the same three the curated rows carry.
  palette: { navy: '#0B162A', orange: '#C83803', white: '#FFFFFF' },
  helmets: { 'navy-c': HELMET_NAVY_C },
  pants: { navy: PANTS_NAVY },
  kits: {
    home: { helmet: 'navy-c', jersey: 'navy', pants: 'navy' },
    away: { helmet: 'navy-c', jersey: 'white', pants: 'navy' },
    'orange-alternate': { helmet: 'navy-c', jersey: 'orange', pants: 'navy' },
  },
};
