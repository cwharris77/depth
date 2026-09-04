import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// New Orleans' three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/saints (the black-over-gold home is that sheet's figures 5-6).
//
// The construction is unusually spare: no sleeve bands, no shoulder yoke, no pant stripe on the
// home kit. What carries the uniform is a bold gold V-collar and gold numerals, so every kit here
// strips the generic model down to that collar.

// The fleur-de-lis, traced from the home figure's shell (bbox x59-165, y74-171 in the reference)
// mapped onto the raw helmet space at ~6.25x. This module previously claimed the mark was too fine
// to trace; that was wrong. It is a solid black shape and traces cleanly — what is genuinely too
// fine is the white line the reference draws INSIDE it, which is barely two px and has no
// separable predicate. So the shape is authored as one solid fill with that line dropped, which at
// swatch size is indistinguishable and at 4x reads as a slightly bolder fleur.
export const SAINTS_DECAL_PATH =
  'M409.8,196.2 L413.0,197.5 L413.6,208.1 L424.8,235.1 L425.5,261.5 L420.5,270.9 L422.3,274.7 L447.4,254.6 L464.2,249.6 L486.1,254.6 L494.3,262.1 L500.5,273.4 L499.9,285.4 L493.0,294.8 L479.3,279.1 L464.2,272.8 L456.7,272.8 L441.7,278.5 L426.7,292.3 L423.6,299.2 L425.5,316.1 L419.8,323.0 L419.8,327.4 L435.5,340.0 L449.2,335.0 L453.6,343.1 L445.5,351.9 L435.5,351.3 L421.7,344.4 L411.1,372.0 L404.2,362.6 L399.2,342.5 L382.9,351.9 L374.2,351.9 L366.0,344.4 L371.0,335.6 L384.2,340.6 L392.9,335.6 L401.1,326.2 L396.1,319.3 L396.1,297.3 L386.1,284.7 L376.7,277.8 L357.3,272.8 L341.7,278.5 L332.3,287.3 L329.8,294.2 L321.0,286.6 L321.6,267.8 L335.4,254.0 L351.0,249.6 L371.7,254.6 L391.1,271.6 L399.2,273.4 L395.4,261.5 L396.1,232.6 L409.2,196.8 Z';

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

// The fleur is black on every kit; only which token carries black moves with the palette.
function decal(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'saints-decal',
      surface: 'helmet',
      d: SAINTS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill,
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
      layers: [...collar('primary'), ...decal('secondary')],
      number: { fill: 'primary', outline: SAINTS_WHITE, outlineWidth: 12 },
    },
    // White body under the same gold shell, over the black pants the reference shows.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'accent',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...collar('secondary'), ...decal('accent')],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 12 },
    },
    // Color Rush is black on black; its palette already stores black as primary, so only the gold
    // shell needs restating.
    'color-rush': {
      helmetColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [...collar('secondary'), ...decal('primary')],
      number: { fill: 'secondary', outline: SAINTS_WHITE, outlineWidth: 12 },
    },
  },
};
