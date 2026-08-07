import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// New York's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/jets (home is that sheet's row-1 figure 1, black alternate its row-1 figure 5,
// away its row-2 figure 1). Right paths mirror the left across the centerline x=294.
//
// One construction throughout: two bands at the sleeve separated by a body-colored gap, and a deep
// V-collar that closes well below the generic chevron's vertex. No helmet stripe, no pant stripe.
//
// THE RIVALRIES KIT IS INFERRED. The 2025 composite has no green jersey with black trim — its
// row-1 figures 7-8 are an olive Salute-to-Service kit that has no row in the archive at all — so
// that kit reuses the measured geometry with its bands and collar recolored onto its own black
// `secondary`. Provisional until a sheet that carries it turns up.
//
// Out of scope on every kit: the chest wordmark, the league shield, the collar tab, and the
// shoulder numerals.

// The sleeve bands, measured on the home figure (jersey top y=128, sleeve hem y=194, figure center
// x=297.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=230 crosses white
// y156-164 and y174-181, with body color above, between and below — the pair floats mid-sleeve
// rather than running to the hem. Both span reference x215-231; extended outward to x=30 for a
// flush clip.
export const JETS_BAND_TOP = [464, 490];
export const JETS_BAND_LOW = [516, 539];
export const JETS_SLEEVE_X_LEFT = [30, 89];
export const JETS_SLEEVE_X_RIGHT = [499, 558];

// The collar, measured on the same figure: arms from reference (266,130) and (332,130) meeting at
// (299,175). That vertex maps to y=519, far below the generic chevron's y=455, so this kit needs
// its own path rather than the shared one. The band is about 8 reference px thick.
const JETS_COLLAR_PATH = 'M196,389 L294,519 L402,389';
const JETS_COLLAR_WIDTH = 24;

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

function sleeveBands(fill: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', JETS_SLEEVE_X_LEFT],
    ['sleeve-right', JETS_SLEEVE_X_RIGHT],
  ];

  for (const [label, [top, bottom]] of [
    ['top', JETS_BAND_TOP],
    ['low', JETS_BAND_LOW],
  ] as [string, number[]][]) {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `jets-band-${label}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill,
      });
    }
  }

  return out;
}

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'jets-collar',
      surface: 'collar',
      d: JETS_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: JETS_COLLAR_WIDTH,
    },
  ];
}

export const JETS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'jets',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Green body under a green shell. White is both secondary and accent here (ESPN supplies only
    // two colors), so every white surface — bands, collar and the unoutlined numerals — resolves
    // from `secondary`, and this kit needs no literal.
    home: {
      layers: [...sleeveBands('secondary'), ...collar('secondary')],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // White body under a green shell. The away palette moves white into primary and green into both
    // secondary and accent, so the bands and collar invert to green against the body.
    away: {
      helmetColor: 'secondary',
      layers: [...sleeveBands('secondary'), ...collar('secondary')],
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // Black body and shell, with the bands measured green on the reference rather than white —
    // green is this kit's `secondary`. The numerals stay white, which this palette carries in
    // `accent`.
    'black-alt': {
      layers: [...sleeveBands('secondary'), ...collar('secondary')],
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
    // INFERRED — no green-with-black kit appears in the 2025 reference. Green is this kit's primary
    // so the body and shell need no override; the bands and collar take its black `secondary`, and
    // the numerals its white `accent`.
    'rivalries-2025': {
      layers: [...sleeveBands('secondary'), ...collar('secondary')],
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
  },
};
