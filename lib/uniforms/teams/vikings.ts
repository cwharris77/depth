import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Minnesota's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/vikings, with the 1965 kit read from that folder's era sheet. Sleeve and pant
// paths use the outer 588-wide mannequin space; right paths mirror the left across the jersey
// centerline x=294 (mirroredX = 588 - x).

// The generic outline width of 26 is tuned for a keyline that reads at swatch size; Minnesota's
// numerals carry a thin trim over a contrasting face, and at 26 the trim swallowed the face and
// every number rendered as solid gold. Each kit below pins outlineWidth to 14.
//
// White is a literal for the same reason it is on Chicago and Arizona: `toTeamColors` gives the
// home kit accent === secondary === gold, so there is no white token to resolve the upper sleeve
// band or the numerals from.
export const VIKINGS_WHITE = '#FFFFFF';

// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Minnesota Vikings logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// Horn then crescent, both fill-rule evenodd. Like Chicago's C, a bold solid shape survives the
// small source cleanly where a thin keyline would not.
export const VIKINGS_DECAL_HORN_PATH =
  'M491.6,223.2 L516.4,223.2 L526.2,228.4 L535.9,229.5 L538.8,233.5 L545.2,235.2 L548.6,239.3 L554.4,242.1 L555.5,245.6 L560.1,250.2 L561.8,257.6 L565.9,261.1 L565.9,289.7 L563.0,289.2 L561.3,282.3 L557.8,280.0 L555.5,283.4 L554.9,296.0 L550.9,298.9 L548.6,305.2 L546.3,305.8 L543.4,310.4 L540.0,311.0 L536.5,316.7 L523.8,317.8 L522.1,319.6 L522.7,325.3 L514.6,328.2 L495.6,327.6 L491.6,323.6 L483.0,321.3 L474.3,311.5 L481.2,315.0 L485.3,315.0 L490.5,319.6 L495.1,319.0 L495.6,313.3 L490.5,310.4 L488.2,305.2 L483.0,304.7 L478.4,300.1 L474.3,298.9 L428.8,299.5 L406.4,304.7 L367.2,304.7 L353.4,299.5 L339.6,298.9 L336.2,294.9 L325.8,293.2 L321.2,288.0 L315.4,287.4 L310.8,282.3 L305.6,281.7 L303.9,277.7 L300.5,276.5 L297.6,272.0 L293.5,270.2 L292.4,267.4 L288.4,265.1 L286.6,261.1 L282.0,258.2 L280.9,254.2 L276.3,252.4 L275.1,246.7 L271.1,243.8 L269.4,238.7 L269.9,235.2 L272.2,235.2 L273.4,238.1 L277.4,239.8 L281.5,245.6 L286.6,246.7 L290.7,251.3 L296.4,251.9 L299.9,256.5 L309.1,257.6 L316.6,262.8 L363.2,262.8 L367.8,261.6 L373.6,257.6 L386.8,257.0 L394.3,251.9 L404.7,251.3 L411.0,246.1 L423.7,245.0 L428.8,240.4 L440.9,239.3 L446.7,234.7 L457.6,234.1 L464.5,228.9 L477.8,228.4 L491.6,223.8 Z';
export const VIKINGS_DECAL_CRESCENT_PATH =
  'M576.8,263.9 L578.5,265.1 L580.3,282.3 L580.3,293.8 L578.0,307.5 L572.8,313.8 L571.6,319.6 L567.6,323.0 L564.7,328.2 L562.4,328.7 L559.0,333.3 L552.6,335.1 L549.8,339.1 L541.1,340.2 L531.9,344.8 L511.8,345.4 L505.4,341.9 L493.3,339.6 L494.5,336.8 L502.5,336.8 L509.5,339.6 L533.6,337.4 L538.2,335.6 L542.3,331.6 L548.0,330.5 L550.9,326.5 L556.1,324.2 L557.2,321.3 L563.0,317.3 L564.7,312.1 L568.8,308.1 L569.9,302.4 L575.1,294.9 L576.2,278.8 L575.1,266.8 L576.8,264.5 Z M575.1,300.6 L576.2,304.7 L575.1,307.5 L572.8,308.1 L572.2,303.5 L575.1,301.2 Z M568.2,312.7 L570.5,313.3 L570.5,316.1 L568.8,318.4 L567.0,318.4 L565.9,315.6 L568.2,313.3 Z M560.7,321.3 L563.6,321.9 L563.0,325.3 L559.5,324.2 L560.7,321.9 Z M554.4,327.6 L556.7,328.2 L556.7,330.5 L552.1,331.6 L552.1,329.3 L554.4,328.2 Z M544.0,333.9 L546.9,333.9 L548.0,336.2 L545.7,337.9 L541.7,337.4 L541.7,335.6 L544.0,334.5 Z';

// Two sleeve bands, measured on the purple home at y=957-961 and 963-967 in reference space
// (jersey top 922, sleeve hem 986) and scaled into mannequin coordinates. Measured at x=27-43 on a
// figure centered at 108.5, extended out to x=30 so the jersey clip trims them at the sleeve edge.
export const VIKINGS_BAND_UPPER_LEFT = 'M30,487 H96 V499 H30 Z';
export const VIKINGS_BAND_UPPER_RIGHT = 'M492,487 H558 V499 H492 Z';
export const VIKINGS_BAND_LOWER_LEFT = 'M30,505 H96 V517 H30 Z';
export const VIKINGS_BAND_LOWER_RIGHT = 'M492,505 H558 V517 H492 Z';

export const VIKINGS_PANTS_OUTER_LEFT = 'M112,807 H140 V1462 H112 Z';
export const VIKINGS_PANTS_OUTER_RIGHT = 'M448,807 H476 V1462 H448 Z';
export const VIKINGS_PANTS_INNER_LEFT = 'M122,807 H130 V1462 H122 Z';
export const VIKINGS_PANTS_INNER_RIGHT = 'M458,807 H466 V1462 H458 Z';

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

// One two-band set across all four kits; only which color sits above the other changes.
function sleeveBands(upper: ColorRef, lower: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'vikings-band-upper-left',
      surface: 'sleeve-left',
      d: VIKINGS_BAND_UPPER_LEFT,
      fill: upper,
    },
    {
      id: 'vikings-band-upper-right',
      surface: 'sleeve-right',
      d: VIKINGS_BAND_UPPER_RIGHT,
      fill: upper,
    },
    {
      id: 'vikings-band-lower-left',
      surface: 'sleeve-left',
      d: VIKINGS_BAND_LOWER_LEFT,
      fill: lower,
    },
    {
      id: 'vikings-band-lower-right',
      surface: 'sleeve-right',
      d: VIKINGS_BAND_LOWER_RIGHT,
      fill: lower,
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill' }));
}

function pantsStripes(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string; fill: ColorRef }[] = [
    {
      id: 'vikings-pants-outer-left',
      surface: 'leg-left',
      d: VIKINGS_PANTS_OUTER_LEFT,
      fill: outer,
    },
    {
      id: 'vikings-pants-outer-right',
      surface: 'leg-right',
      d: VIKINGS_PANTS_OUTER_RIGHT,
      fill: outer,
    },
    {
      id: 'vikings-pants-inner-left',
      surface: 'leg-left',
      d: VIKINGS_PANTS_INNER_LEFT,
      fill: inner,
    },
    {
      id: 'vikings-pants-inner-right',
      surface: 'leg-right',
      d: VIKINGS_PANTS_INNER_RIGHT,
      fill: inner,
    },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill' }));
}

function collar(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  return [
    { id: 'vikings-collar-outer', stroke: outer, strokeWidth: 18 },
    { id: 'vikings-collar-inner', stroke: inner, strokeWidth: 8 },
  ].map((s): UniformLayer => ({
    ...s,
    surface: 'collar',
    d: COLLAR_PATH,
    clip: true,
    kind: 'stroke',
  }));
}

function decal(horn: ColorRef, crescent: ColorRef): UniformLayer[] {
  return [
    { id: 'vikings-decal-horn', d: VIKINGS_DECAL_HORN_PATH, fill: horn },
    { id: 'vikings-decal-crescent', d: VIKINGS_DECAL_CRESCENT_PATH, fill: crescent },
  ].map((s): UniformLayer => ({
    ...s,
    surface: 'helmet',
    clip: true,
    kind: 'fill',
    fillRule: 'evenodd',
  }));
}

export const VIKINGS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'vikings',
  kits: {
    // Purple body, purple pants, purple shell — white over gold on the sleeve, white numerals with
    // a gold keyline.
    home: {
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal(VIKINGS_WHITE, 'secondary'),
        ...sleeveBands(VIKINGS_WHITE, 'secondary'),
        ...collar(VIKINGS_WHITE, 'secondary'),
        ...pantsStripes(VIKINGS_WHITE, 'secondary'),
      ],
      number: { fill: VIKINGS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body over purple pants and the purple shell; the upper band becomes purple so it reads.
    away: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal(VIKINGS_WHITE, 'accent'),
        ...sleeveBands('secondary', 'accent'),
        ...collar('secondary', 'accent'),
        ...pantsStripes('accent', VIKINGS_WHITE),
      ],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Winter Warrior stores the same palette as away and differs only in construction: the shell
    // and pants go white too, leaving the purple/gold bands as the only color on the figure.
    'winter-warrior': {
      helmetColor: VIKINGS_WHITE,
      pantsColor: VIKINGS_WHITE,
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal('secondary', 'accent'),
        ...sleeveBands('secondary', 'accent'),
        ...collar('secondary', 'accent'),
        ...pantsStripes('secondary', 'accent'),
      ],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // 1965: purple body over white pants. Its palette carries a real white in `accent`, so nothing
    // here needs a literal. The era sheet shows a denser sleeve set than the modern two bands —
    // this reuses the measured modern geometry rather than inventing a count, so treat the band
    // spacing as approximate while the colors and layout are right.
    'purple-classic': {
      pantsColor: 'accent',
      removeLayerIds: GENERIC_STRIPPED,
      layers: [
        ...decal('accent', 'secondary'),
        ...sleeveBands('accent', 'secondary'),
        ...collar('accent', 'secondary'),
        ...pantsStripes('primary', 'secondary'),
      ],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
