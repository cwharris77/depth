// New England as a complete team spec: every helmet, jersey, pants and socks part, with the helmet
// mark and the diagonal shoulder bands drawn by the marks in ./marks.
import type { CompletePantsSpec } from '../core/complete';
import type { TeamSpec } from '../core/team-spec';
import {
  PATRIOTS_HELMET_DECAL,
  PATRIOTS_THROWBACK_CROWN_STRIPE,
  patriotsHelmetDecal,
} from './marks/construction';
import { PATRIOTS_JERSEY_NAVY } from './jerseys/navy';
import { PATRIOTS_JERSEY_PAT } from './jerseys/pat';
import { PATRIOTS_JERSEY_RIVALRIES } from './jerseys/rivalries';
import { PATRIOTS_JERSEY_WHITE } from './jerseys/white';

// Two navies and two reds are in play: navy and red on the modern kits, rivalNavy and patRed on the
// throwback. stormBlue is the Rivalries cloth.
export const PATRIOTS_PALETTE = {
  navy: '#002244',
  rivalNavy: '#002F6C',
  red: '#C60C30',
  patRed: '#C8102E',
  silver: '#B0B7BC',
  white: '#FFFFFF',
  // The Rivalries jersey and sock cloth, unpublished; a flat approximation.
  stormBlue: '#455D8C',
};

// A leg in its body colour with an optional side-seam stripe.
const legs = (body: string, stripes: CompletePantsSpec['stripes']): CompletePantsSpec => ({
  body,
  stripes,
  marks: [],
});

// Three equal side-seam bands, the middle one in `inner`, listed from the outer edge.
const seamStripe = (
  outer: string,
  inner: string,
  gap: 'none' | 'narrow'
): CompletePantsSpec['stripes'] => ({
  position: 'leg-edge',
  bands: [
    { color: outer, size: 's' },
    { color: inner, size: 's' },
    { color: outer, size: 's' },
  ],
  gap,
  edge: 'none',
});

export const PATRIOTS_SPEC: TeamSpec = {
  helmets: {
    // The modern mark on a navy shell with a red cage.
    navy: { shell: 'navy', facemask: 'red', decal: PATRIOTS_HELMET_DECAL, number: 'none' },
    // The same mark and cage on a silver shell.
    silver: { shell: 'silver', facemask: 'red', decal: PATRIOTS_HELMET_DECAL, number: 'none' },
    // The throwback white shell with a white cage and a red, white, blue, white, red crown stripe.
    pat: {
      shell: 'white',
      facemask: 'white',
      decal: PATRIOTS_THROWBACK_CROWN_STRIPE,
      number: 'none',
    },
    // The modern mark in storm blue and white on a white shell with a silver cage.
    rivalries: {
      shell: 'white',
      facemask: 'silver',
      decal: patriotsHelmetDecal({
        keyline: 'white',
        face: 'stormBlue',
        streamers: 'stormBlue',
        silver: 'white',
        star: 'white',
      }),
      number: 'none',
    },
  },
  jerseys: {
    navy: PATRIOTS_JERSEY_NAVY,
    white: PATRIOTS_JERSEY_WHITE,
    pat: PATRIOTS_JERSEY_PAT,
    rivalries: PATRIOTS_JERSEY_RIVALRIES,
  },
  pants: {
    navy: legs('navy', seamStripe('red', 'white', 'none')),
    white: legs('white', seamStripe('red', 'navy', 'none')),
    silver: legs('silver', seamStripe('red', 'navy', 'none')),
    // Red, blue and red, spaced apart by the white leg.
    throwback: legs('white', seamStripe('patRed', 'rivalNavy', 'narrow')),
    plainWhite: legs('white', 'none'),
  },
  socks: {
    navy: { color: 'navy', stripes: 'none' },
    white: { color: 'white', stripes: 'none' },
    // White hoops of red, blue and red around the calf.
    hoops: {
      color: 'white',
      stripes: {
        bands: [
          { color: 'patRed', size: 's' },
          { color: 'rivalNavy', size: 's' },
          { color: 'patRed', size: 's' },
        ],
        gap: 'narrow',
        edge: 'none',
      },
    },
    storm: { color: 'stormBlue', stripes: 'none' },
  },
};
