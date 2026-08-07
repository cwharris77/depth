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

export const TITANS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'titans',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Renders a NAVY body because that is what the row stores; the reference's equivalent figure is
    // light blue. Navy is `primary` here, so the shoulder bar takes it and the numerals take it too,
    // keylined in white — neither of which this palette supplies, hence two literals.
    home: {
      layers: shoulders(TITANS_SILVER, 'primary'),
      number: { fill: 'primary', outline: TITANS_WHITE, outlineWidth: 14 },
    },
    // The one kit that matches its figure. White body under the navy shell; navy is `secondary`, so
    // the shoulder bar and numeral face both resolve from a token and only the silver is a literal.
    away: {
      helmetColor: 'secondary',
      layers: shoulders(TITANS_SILVER, 'secondary'),
      number: { fill: 'secondary', outline: TITANS_WHITE, outlineWidth: 14 },
    },
    // No figure on the sheet. Navy body with the light-blue `secondary` moved onto the shoulder bar,
    // which is the assignment that keeps the bar legible against a navy shell.
    'navy-alt': {
      layers: shoulders(TITANS_SILVER, 'secondary'),
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
