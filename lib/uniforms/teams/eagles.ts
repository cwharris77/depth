import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Philadelphia's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/eagles (home is that sheet's row-1 figure 1, kelly green its row-1 figure 3,
// black alternate its row-1 figure 5, away its row-2 figure 1). Right paths mirror the left across
// the centerline x=294.
//
// The current kits are one construction: a deep collar yoke and a solid band at the sleeve hem. The
// kelly-green throwback drops the cuff entirely — a column down its sleeve runs unbroken kelly from
// shoulder to hem — and keeps only the collar. No helmet stripe, no pant stripe on any kit.
//
// APPROXIMATE, and flagged: the kelly-green kit's collar color is taken from the composite at
// thumbnail scale rather than sampled, so it is the one color assignment here not measured. Its
// geometry is the measured one.
//
// Out of scope on every kit: the chest wordmark, the league shield, the collar tab, the eagle-head
// mark on each sleeve, and the shoulder numerals.

// Black is a literal on the two current kits. Their palettes are green over silver with accent ===
// secondary on the home (ESPN supplies only two colors), so neither can resolve the collar yoke or
// the sleeve cuff, both of which the reference draws black. The black alternate reaches it through
// `primary`.
export const EAGLES_BLACK = '#000000';

// The sleeve cuff, measured on the home figure (jersey top y=132, sleeve hem y=198, figure center
// x=96.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=30 crosses black
// y190-196 against a hem at y198, so the band ends flush. Extended outward to x=30 and past the hem
// to y=578 so the jersey clip trims it.
export const EAGLES_CUFF_LEFT = 'M30,545 H140 V578 H30 Z';
export const EAGLES_CUFF_RIGHT = 'M558,545 H448 V578 H558 Z';

// The collar, measured on the same figure: a yoke from reference (70,134) closing at (96,166), which
// maps to a vertex at y=481 — deeper than the generic chevron's y=455, so this kit needs its own
// path. About 6 reference px across the arm, or roughly 20 units perpendicular.
const EAGLES_COLLAR_PATH = 'M211,389 L294,481 L377,389';
const EAGLES_COLLAR_WIDTH = 20;

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

function cuff(fill: ColorRef): UniformLayer[] {
  return [
    ['eagles-cuff-left', 'sleeve-left', EAGLES_CUFF_LEFT],
    ['eagles-cuff-right', 'sleeve-right', EAGLES_CUFF_RIGHT],
  ].map(([id, surface, d]) => ({
    id,
    surface: surface as UniformSurface,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}

function collar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'eagles-collar',
      surface: 'collar',
      d: EAGLES_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: EAGLES_COLLAR_WIDTH,
    },
  ];
}

export const EAGLES_UNIFORMS: TeamUniformDefinition = {
  teamId: 'eagles',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Midnight green body and shell. Silver is both secondary and accent here, so it carries the
    // numeral keyline; the collar yoke and sleeve cuff are black, which this palette cannot supply,
    // and take the literal — as does the white numeral face.
    home: {
      layers: [...cuff(EAGLES_BLACK), ...collar(EAGLES_BLACK)],
      number: { fill: '#FFFFFF', outline: EAGLES_BLACK, outlineWidth: 14 },
    },
    // White body under the green shell. The away palette moves white into primary and green into
    // secondary, so the numerals take the green while the collar and cuff stay black by literal.
    away: {
      helmetColor: 'secondary',
      layers: [...cuff(EAGLES_BLACK), ...collar(EAGLES_BLACK)],
      number: { fill: 'secondary', outline: EAGLES_BLACK, outlineWidth: 14 },
    },
    // Black body and shell, so the collar and cuff would vanish into it — the reference trims this
    // kit in silver instead, which is its `accent`.
    'black-alt': {
      layers: [...cuff('accent'), ...collar('accent')],
      number: { fill: '#FFFFFF', outline: 'accent', outlineWidth: 14 },
    },
    // Kelly green, and the one kit with NO sleeve cuff — its sleeve runs unbroken to the hem. Collar
    // only, in the white this palette carries as `accent`. See the approximation noted above.
    'kelly-green': {
      layers: collar('accent'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
