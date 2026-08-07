import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Tennessee's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/titans. Right paths mirror the left across the centerline x=294.
//
// READ THIS FIRST — THE STORED PALETTES PREDATE THE 2025 REBRAND, and this module is provisional
// because of it, not because the geometry is unmeasured.
//   - The composite contains exactly two looks: a LIGHT BLUE jersey (figures 1-2) and a white one
//     (figures 3-4). There is no navy jersey on the sheet at all.
//   - `titans-home` stores primary #0C2340 navy, but `teams.color_primary` is #4495d2 light blue.
//     That is the same stale-home-row class as Denver and Pittsburgh — see the brief's step 1,
//     trap 3 — except here the drift runs through the whole palette set, not just one row: none of
//     the four kits carries the silver the reference paints across both shoulders.
//   - So only `away` can be verified against a figure. `home` renders navy where the reference is
//     light blue; `navy-alt` and `oilers-throwback` have no figure of their own at all.
// The geometry below IS measured, off figure 1. The token assignments are the best fit to palettes
// that describe a previous uniform, and every one of them should be re-derived once the archive
// carries the rebrand. Do not read a wrong-looking Titans render as a bug in this file.
//
// Out of scope on every kit: the chest wordmark, the league shield, the starred collar tab, and the
// shoulder numerals.

// Silver is a literal on every kit, because no Titans palette carries it. The reference renders the
// yoke around (144,144,143); this uses the hex the archive already stores as silver elsewhere
// (lib/uniforms/data.ts), which reads very slightly lighter.
export const TITANS_SILVER = '#A5ACAF';
export const TITANS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// these paths are lifted from the GUD composite so there is an accurate starting point to
// hand-stylize against. They are a literal reproduction of a third-party mark and are expected to
// be REPLACED by original stylized geometry before this kit is treated as finished. Grep
// TRACE-PENDING-STYLIZE for every path in this state.
//
// The circle-T, built from figure 1's shell (bbox x64-170, y27-134 in the reference) mapped onto
// the raw helmet space at ~6.25x. This is the smallest mark of the 32 in its source — the disc is
// about 25 reference px across, right on the floor below which a contour trace turns to mush — so
// it is HALF TRACED AND HALF CONSTRUCTED, and the split is deliberate:
//   - The three rings are CONCENTRIC CIRCLES fitted to the measured disc (center (403.9, 237.0) in
//     helmet space, outer r 12 reference px). Traced, they came back as broken dashes; at this size
//     the ring is two px wide and its antialiasing falls below any predicate that also excludes the
//     navy shell.
//   - The T and the three stars ARE traced, from a box drawn inside the disc so the ring's own
//     white does not join them.
// THE FLAME TAIL IS DROPPED. It is a four-color interleave (light blue, red, grey, white) about two
// px per band, and every predicate that separated one band left the others as noise. Re-derive the
// whole mark from a larger source before treating it as finished.
export const TITANS_DECAL_RING_OUTER_PATH =
  'M328.9,237.0 A75.0,75.0 0 1 0 478.9,237.0 A75.0,75.0 0 1 0 328.9,237.0 Z';
export const TITANS_DECAL_RING_INNER_PATH =
  'M336.9,237.0 A67.0,67.0 0 1 0 470.9,237.0 A67.0,67.0 0 1 0 336.9,237.0 Z';
export const TITANS_DECAL_FIELD_PATH =
  'M344.9,237.0 A59.0,59.0 0 1 0 462.9,237.0 A59.0,59.0 0 1 0 344.9,237.0 Z';
export const TITANS_DECAL_T_PATH =
  'M450.8,210.1 L453.5,212.2 L449.1,224.4 L441.5,217.0 L424.0,217.0 L419.6,219.5 L412.4,256.1 L405.3,271.5 L406.6,212.2 L450.4,210.5 Z M361.9,210.1 L400.4,211.8 L393.7,218.3 L371.3,217.0 L362.4,223.6 L358.8,213.0 L361.5,210.5 Z M383.8,167.9 L393.7,169.5 L377.1,173.1 L351.7,189.4 L366.9,174.0 L383.4,168.3 Z';
export const TITANS_DECAL_STARS_PATH =
  'M441.0,243.1 L454.0,249.2 L454.0,257.7 L445.0,259.7 L435.7,256.1 L441.5,250.8 L440.6,243.5 Z M367.3,243.9 L369.5,251.2 L375.3,255.3 L367.7,263.4 L356.6,255.7 L357.9,249.6 L366.9,244.3 Z M404.4,178.8 L415.1,186.1 L409.7,195.9 L402.1,194.3 L395.4,187.4 L403.9,179.2 Z';
// No Titans palette carries the mark's red either — same reason as the silver above.
export const TITANS_DECAL_RED = '#C8102E';
export const TITANS_DECAL_LIGHT_BLUE = '#4B92DB';

// The shoulder yoke, measured on figure 1 (jersey top y=131, sleeve hem y=197, figure center
// x=108.5, so scaleY = 191/66 and scaleX = 264/84.5). Silver covers the whole shoulder cap and
// tapers down the sleeve to a point near reference (26,187); at y=156 it spans x25-43. The navy bar
// inside it runs reference x45-65 at y142-149. Both extended outward to x=30 for a flush clip.
export const TITANS_YOKE_LEFT = 'M30,386 L205,412 L36,548 Z';
export const TITANS_YOKE_RIGHT = 'M558,386 L383,412 L552,548 Z';
export const TITANS_BAR_LEFT = 'M96,415 H158 V435 H96 Z';
export const TITANS_BAR_RIGHT = 'M492,415 H430 V435 H492 Z';

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

// Yoke first, bar over it.
function shoulders(yoke: ColorRef, bar: ColorRef): UniformLayer[] {
  const shapes: [string, UniformSurface, string, ColorRef][] = [
    ['titans-yoke-left', 'sleeve-left', TITANS_YOKE_LEFT, yoke],
    ['titans-yoke-right', 'sleeve-right', TITANS_YOKE_RIGHT, yoke],
    ['titans-bar-left', 'sleeve-left', TITANS_BAR_LEFT, bar],
    ['titans-bar-right', 'sleeve-right', TITANS_BAR_RIGHT, bar],
  ];
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

// Fixed art: the mark is the same five colors on every navy shell, so nothing here takes a token.
// The OILERS THROWBACK DOES NOT GET IT — that kit's white shell carries the club's oil-derrick
// mark, a different logo, and no figure on the sheet draws it.
function decal(): UniformLayer[] {
  return (
    [
      ['titans-decal-ring-outer', TITANS_DECAL_RING_OUTER_PATH, TITANS_DECAL_LIGHT_BLUE],
      ['titans-decal-ring-inner', TITANS_DECAL_RING_INNER_PATH, TITANS_WHITE],
      ['titans-decal-field', TITANS_DECAL_FIELD_PATH, '#0C2340'],
      ['titans-decal-t', TITANS_DECAL_T_PATH, TITANS_WHITE],
      ['titans-decal-stars', TITANS_DECAL_STARS_PATH, TITANS_DECAL_RED],
    ] as [string, string, ColorRef][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

export const TITANS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'titans',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Renders a NAVY body because that is what the row stores; the reference's equivalent figure is
    // light blue. Navy is `primary` here, so the shoulder bar takes it and the numerals take it too,
    // keylined in white — neither of which this palette supplies, hence two literals.
    home: {
      layers: [...shoulders(TITANS_SILVER, 'primary'), ...decal()],
      number: { fill: 'primary', outline: TITANS_WHITE, outlineWidth: 14 },
    },
    // The one kit that matches its figure. White body under the navy shell; navy is `secondary`, so
    // the shoulder bar and numeral face both resolve from a token and only the silver is a literal.
    away: {
      helmetColor: 'secondary',
      layers: [...shoulders(TITANS_SILVER, 'secondary'), ...decal()],
      number: { fill: 'secondary', outline: TITANS_WHITE, outlineWidth: 14 },
    },
    // No figure on the sheet. Navy body with the light-blue `secondary` moved onto the shoulder bar,
    // which is the assignment that keeps the bar legible against a navy shell.
    'navy-alt': {
      layers: [...shoulders(TITANS_SILVER, 'secondary'), ...decal()],
      number: { fill: TITANS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // No figure on the sheet either. Light-blue body with red `secondary` on the bar and white in
    // `accent` for the numerals.
    'oilers-throwback': {
      layers: shoulders(TITANS_SILVER, 'secondary'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
