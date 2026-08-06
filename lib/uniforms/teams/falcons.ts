import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Atlanta's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/falcons. Jersey paths use the outer 588-wide mannequin space; right paths
// mirror the left across the jersey centerline x=294 (mirroredX = 588 - x).
//
// No helmet decal. The falcon mark is 28x34px in the reference — comparable to Chicago's C, which
// traced cleanly — but it is thin swooping linework rather than a solid letterform, and it shreds
// into disconnected strokes at that size the same way Seattle's keyline did. A bare shell beats an
// illegible trace; the rule that keeps emerging is that solid shapes trace and thin lines do not.
//
// Atlanta's construction is the sparest of any team done so far: no sleeve bands, no shoulder
// yoke, no contrasting collar, and plain pants. The only geometry is a thin red stripe down each
// side seam of the torso, so every kit strips nearly the whole generic model.

// Black is a literal on the away and red-alt kits. Atlanta's away palette resolves secondary AND
// accent to the same red (#A71930), so no token supplies the black shell and pants those kits
// wear. Hex from teamcolorcodes.
export const FALCONS_BLACK = '#000000';

// The side-seam piping, measured at x=52 and x=148 on a reference figure centered at 99.5, running
// from y=208 to the jersey hem (jersey top 126, sleeve hem 189).
export const FALCONS_SIDE_STRIPE_LEFT = 'M141,631 H147 V806 H141 Z';
export const FALCONS_SIDE_STRIPE_RIGHT = 'M441,631 H447 V806 H441 Z';

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

function sideStripes(fill: ColorRef): UniformLayer[] {
  const shapes: { id: string; surface: UniformSurface; d: string }[] = [
    { id: 'falcons-side-stripe-left', surface: 'jersey', d: FALCONS_SIDE_STRIPE_LEFT },
    { id: 'falcons-side-stripe-right', surface: 'jersey', d: FALCONS_SIDE_STRIPE_RIGHT },
  ];
  return shapes.map((s): UniformLayer => ({ ...s, clip: true, kind: 'fill', fill }));
}

export const FALCONS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'falcons',
  kits: {
    // ESPN gives Atlanta color=red / alternateColor=black. `isNeutral(black)` is true, so
    // toTeamColors keeps primary as the red — and the generic model paints helmet, jersey AND
    // pants from primary, rendering Atlanta head-to-toe red. The reference home kit is black on
    // black. Pinning all three bodies to secondary fixes it while primary still supplies the red
    // piping and numeral keyline. Same defect and same fix as Cincinnati and Pittsburgh; a sweep
    // of all 32 teams found those three plus New Orleans and no others.
    home: {
      helmetColor: 'secondary',
      jerseyColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: sideStripes('primary'),
      // White numerals with a thin red keyline — the generic width of 26 would ring them heavily.
      number: { fill: '#FFFFFF', outline: 'primary', outlineWidth: 10 },
    },
    // White body over the black shell and black pants the reference shows. Neither is available as
    // a token here (secondary and accent are both the red), hence the literals.
    away: {
      helmetColor: FALCONS_BLACK,
      pantsColor: FALCONS_BLACK,
      removeLayerIds: GENERIC_STRIPPED,
      layers: sideStripes('secondary'),
      number: { fill: FALCONS_BLACK, outline: 'secondary', outlineWidth: 10 },
    },
    // Red alternate — inferred, not measured: Atlanta did not wear a red jersey in 2025, so it is
    // absent from the composite. This recolors the same construction onto the red body its curated
    // palette describes. Treat as provisional until a red reference is available.
    'red-alt': {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      removeLayerIds: GENERIC_STRIPPED,
      layers: sideStripes('accent'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 10 },
    },
  },
};
