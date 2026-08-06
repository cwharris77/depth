import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Cleveland's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/browns (home is that sheet's row-1 figure 1, away its row-2 figure 1). Sleeve
// paths use the outer 588-wide mannequin space; right paths mirror the left across the jersey
// centerline x=294 (mirroredX = 588 - x).
//
// Cleveland's construction is defined by what it does NOT have, and the reference is unambiguous
// on every one of these: the shell carries no logo and no center stripe (the club is the only one
// in the league with a bare helmet), the white pants carry no stripe, the V-collar carries no
// contrasting trim, and the numerals carry no keyline. Everything the uniform says, it says with
// one five-band stripe stack at the end of each sleeve — so every kit strips almost the whole
// generic model rather than recoloring it.
//
// Caveat on the 1946 throwback: it is NOT in the 2025 composite (Cleveland did not wear it that
// season, and unlike the Seahawks/Broncos/Vikings throwbacks there is no era sheet for it either),
// so its construction is inferred by recoloring the measured stripe set and its brown shell comes
// from the 1946 club's documented leather helmet rather than from a reference. Treat the whole kit
// as provisional until a 1946 reference is available.

// White is a literal on the home kit, not a token. Cleveland's ESPN feed pairs brown with orange,
// so `toTeamColors` gives the home kit accent === secondary === orange and no white token exists —
// resolving the stripe bands or the numerals from `accent` would paint them orange-on-orange.
export const BROWNS_WHITE = '#FFFFFF';

// The sleeve stripe stack: five alternating bands at the very end of each sleeve, measured on the
// home figure (jersey top y=137, sleeve hem y=201, figure center x=106.5, so scaleY = 191/64 and
// scaleX = 264/84.5). Reference y 163/167/173/177/183/187 maps to the boundaries below; the away
// figure carries the identical stack 510px lower with brown in white's place, so one factory
// serves every kit. Reference x 25-41 maps to 39-89, extended outward to x=30 so the jersey clip
// trims the stack flush at the sleeve edge.
export const BROWNS_STRIPE_BOUNDS = [461, 473, 491, 503, 521, 533];
export const BROWNS_SLEEVE_X_LEFT = [30, 89];
export const BROWNS_SLEEVE_X_RIGHT = [499, 558];

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

// One stack, three kits. Only which color takes the outer/middle/inner bands and which fills the
// two between them changes: white-on-orange at home, brown-on-orange on the road.
function sleeveStripes(band: ColorRef, gap: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', BROWNS_SLEEVE_X_LEFT],
    ['sleeve-right', BROWNS_SLEEVE_X_RIGHT],
  ];

  for (let i = 0; i < BROWNS_STRIPE_BOUNDS.length - 1; i += 1) {
    const top = BROWNS_STRIPE_BOUNDS[i];
    const bottom = BROWNS_STRIPE_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `browns-sleeve-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i % 2 === 0 ? band : gap,
      });
    }
  }

  return out;
}

export const BROWNS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'browns',
  kits: {
    // Brown body over white pants under the bare orange shell — the reference's primary combo.
    // The numerals are plain white on brown in the reference, with no keyline of any color, so the
    // outline restates the fill at a width that only thickens the glyph.
    home: {
      helmetColor: 'secondary',
      pantsColor: BROWNS_WHITE,
      removeLayerIds: GENERIC_STRIPPED,
      layers: sleeveStripes(BROWNS_WHITE, 'secondary'),
      number: { fill: BROWNS_WHITE, outline: BROWNS_WHITE, outlineWidth: 10 },
    },
    // White body, white pants, same orange shell. On white the bands have to become brown, so the
    // stack swaps which token bands and which fills between them.
    away: {
      helmetColor: 'accent',
      removeLayerIds: GENERIC_STRIPPED,
      layers: sleeveStripes('secondary', 'accent'),
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // 1946 throwback — inferred, not measured (see the header note). White body and pants under a
    // brown shell, with the stripe set banded brown over orange.
    '1946-throwback': {
      helmetColor: 'accent',
      removeLayerIds: GENERIC_STRIPPED,
      layers: sleeveStripes('accent', 'secondary'),
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
  },
};
