import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Detroit's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/lions (home is that sheet's row-1 figure 5, away its row-2 figure 1). Sleeve
// paths use the outer 588-wide mannequin space; right paths mirror the left across the centerline
// x=294 (mirroredX = 588 - x).
//
// The construction is one four-band stripe set floating on the outer third of each sleeve — it
// starts and ends in body color rather than running to the hem, which is what distinguishes it from
// the cuff bands most teams here wear. No helmet stripe, no collar trim, no pant stripe.
//
// TWO THINGS ARE SHORT OF FULLY MEASURED, and both are flagged rather than hidden:
//   1. The band BOUNDS are measured on the home figure only. The away figure's set was sampled at
//      one column and reads blue/silver/blue at slightly different offsets; it is authored on the
//      home bounds with the away colors, which is an approximation of a few units per band.
//   2. The gridiron-gray kit is INFERRED. The 2025 composite contains no silver jersey at all — its
//      silver figures are silver PANTS under blue jerseys — so that kit reuses the measured
//      geometry with a color assignment that is a judgement call.
// Re-measure both against a sheet that carries them before treating this module as finished.
//
// Out of scope on every kit: the chest wordmark, the league shield, the shoulder numerals, and the
// Thanksgiving patch the reference draws beside row 1.

// White is a literal. The home palette is blue over silver with accent === secondary (ESPN supplies
// only two colors), so no token resolves to the thin white lines through the sleeve set or to the
// numeral face.
export const LIONS_WHITE = '#FFFFFF';

// The shell is left bare. The club's leaping lion is a solid single-color silhouette and would very
// likely trace — it belongs in the "traces well" column with the Vikings horn — but it was not
// attempted on this pass. It is the best remaining decal candidate of the teams still unmapped.

// The sleeve set, measured on the home figure (jersey top y=425, sleeve hem y=491, figure center
// x=919.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=845 crosses silver
// y454-463, white y464-467, silver y468-474 and white y475-477, with body color above and below.
// The set spans reference x835-854 — the outer quarter of the sleeve — which maps flush to the
// mannequin's outer sleeve edge at x=30.
export const LIONS_STRIPE_BOUNDS = [467, 496, 507, 528, 536];
export const LIONS_SLEEVE_X_LEFT = [30, 90];
export const LIONS_SLEEVE_X_RIGHT = [498, 558];

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

// Four contiguous bands, outer color and inner color alternating from the top down.
function sleeveStripes(band: ColorRef, line: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
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

export const LIONS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'lions',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Blue body and pants under the silver shell. Silver is `secondary` here, so it carries both
    // the shell and the two wide bands; the thin lines between them and the numeral face are white,
    // which this palette cannot supply, so both take the literal.
    home: {
      helmetColor: 'secondary',
      layers: sleeveStripes('secondary', LIONS_WHITE),
      number: { fill: LIONS_WHITE, outline: LIONS_WHITE, outlineWidth: 10 },
    },
    // White body over silver pants under the same silver shell. The away palette moves white into
    // primary, blue into secondary and silver into accent, so the set inverts to blue bands with
    // silver lines and the numerals take the blue. Band bounds are the home figure's — see the
    // approximation noted above.
    away: {
      helmetColor: 'accent',
      pantsColor: 'accent',
      layers: sleeveStripes('secondary', 'accent'),
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // INFERRED — no silver jersey appears in the 2025 reference. Silver is this kit's primary, so
    // the shell and pants need no override; the bands take the kit's own blue `secondary` and the
    // lines fall back to the white literal, matching how every other kit here separates its bands.
    'gridiron-gray': {
      layers: sleeveStripes('secondary', LIONS_WHITE),
      number: { fill: LIONS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
  },
};
