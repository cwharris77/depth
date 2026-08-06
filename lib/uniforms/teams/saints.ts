import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// New Orleans' three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/saints (the black-over-gold home is that sheet's figures 5-6).
//
// No helmet decal. The fleur-de-lis is a thin ornamental mark at this scale and shreds the same
// way Atlanta's falcon and Seattle's keyline did — solid shapes trace at these sizes, fine
// linework does not. The shell is left bare rather than carrying an illegible trace.
//
// The construction is unusually spare: no sleeve bands, no shoulder yoke, no pant stripe on the
// home kit. What carries the uniform is a bold gold V-collar and gold numerals, so every kit here
// strips the generic model down to that collar.

// White is a literal on home and color rush. Both palettes resolve secondary and accent to the
// same value (black on home, gold on color rush), so no token supplies the numerals' white keyline.
export const SAINTS_WHITE = '#FFFFFF';

// Measured off the reference's home figure: the collar band is roughly 8px across on a figure
// whose jersey spans 186 to a 241 sleeve hem, which is about 24 units in mannequin space — nearly
// twice the generic chevron's 13.
export const SAINTS_COLLAR_WIDTH = 24;

const COLLAR_PATH = 'M206,388 L294,455 L386,388';
const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
  'generic-pants-stripe-left',
  'generic-pants-stripe-right',
];

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'saints-collar',
      surface: 'collar',
      d: COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: SAINTS_COLLAR_WIDTH,
    },
  ];
}

export const SAINTS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'saints',
  kits: {
    // ESPN gives New Orleans color=old gold / alternateColor=black. `isNeutral(black)` is true, so
    // toTeamColors leaves primary as the gold — and the generic model paints helmet, jersey AND
    // pants from primary, rendering the Saints head-to-toe gold. Only the jersey is wrong: the
    // reference home kit is a black jersey under a gold shell over gold pants, so helmet and pants
    // keep primary and only the body is pinned to secondary. Same defect as Cincinnati, Pittsburgh
    // and Atlanta; a sweep of all 32 teams found those four and no others.
    home: {
      jerseyColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: collar('primary'),
      number: { fill: 'primary', outline: SAINTS_WHITE, outlineWidth: 12 },
    },
    // White body under the same gold shell, over the black pants the reference shows.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'accent',
      removeLayerIds: GENERIC_STRIPPED,
      layers: collar('secondary'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 12 },
    },
    // Color Rush is black on black; its palette already stores black as primary, so only the gold
    // shell needs restating.
    'color-rush': {
      helmetColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: collar('secondary'),
      number: { fill: 'secondary', outline: SAINTS_WHITE, outlineWidth: 12 },
    },
  },
};
