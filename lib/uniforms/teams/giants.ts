import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// New York's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/giants (home is that sheet's row-1 figure 1, the throwback its row-1 figure 3,
// away its row-2 figure 1). Sleeve and collar paths use the outer 588-wide mannequin space; the
// helmet decal stays in raw helmet coordinates (x:139-802, y:65-674). Right paths mirror the left
// across the centerline x=294 (mirroredX = 588 - x).
//
// The three kits do not share one construction, and the home/away split is the surprise: the royal
// home jersey has NO sleeve stripes at all — scanned to confirm, since white bands would be plainly
// visible on that body — while the white away jersey carries a thin/thick/thin red set. The
// throwback carries a different set again, red/white/red at the cuff, plus the only collar trim of
// the three. No kit has a pant stripe; all three wear white pants.
//
// The throwback's shell is left bare on purpose. That helmet carries a "GIANTS" wordmark rather
// than the modern monogram, and wordmarks are out of scope on every kit — so it inherits the shell
// color and nothing else, instead of borrowing the "ny" that belongs to the other two.

// White is a literal on home and the throwback. Both palettes are blue over red with no white
// token (home has accent === secondary from ESPN; the throwback's accent is white but is spent on
// the collar and stripe set), so the numerals and the decal need the literal.
export const GIANTS_WHITE = '#FFFFFF';

// TRACE-PENDING-STYLIZE — machine trace, not final art. House workflow is trace-then-stylize:
// this path is a contour trace of the club's helmet mark, lifted from the GUD composite so there
// is an accurate starting point to hand-stylize against. It is a literal reproduction of a
// third-party mark and is expected to be REPLACED by original stylized geometry before this kit is
// treated as finished. Grep TRACE-PENDING-STYLIZE for every path in this state.
//
// The cleanest letterform trace of the set: a bold lowercase monogram over a solid underbar, which
// survives its 35x31px source the way the Bears' C did. Two components (the "n" fused to the bar,
// and the "y"), emitted as one path and painted as a union — the "n" counter is open at the foot,
// so nothing here needs a fill rule. Traced from the helmet bbox (x 65-171, y 32-129 in the
// reference) mapped onto the raw helmet space at ~6.2x.
export const GIANTS_DECAL_MONOGRAM_PATH =
  'M421.6,161.3 L427.8,163.2 L451.3,163.2 L455.7,161.3 L458.7,162.5 L460.0,166.9 L459.4,229.0 L461.8,237.7 L465.6,240.2 L474.2,239.6 L481.1,229.0 L480.4,165.0 L481.7,162.5 L500.9,163.2 L507.1,161.9 L508.9,163.8 L509.6,288.1 L508.3,291.8 L505.8,293.7 L504.0,298.0 L499.0,301.2 L495.3,306.1 L333.6,306.1 L332.3,304.3 L332.3,280.6 L334.8,278.2 L472.4,278.8 L477.3,276.9 L479.8,274.4 L480.4,266.3 L478.6,263.9 L473.6,263.2 L464.3,267.0 L455.7,266.3 L449.5,263.2 L440.8,261.4 L432.7,252.7 L431.5,239.6 L431.5,190.5 L429.6,187.4 L422.2,187.4 L420.3,186.2 L419.1,164.4 L420.3,161.9 L421.6,161.9 Z M321.8,160.7 L326.1,160.7 L327.4,161.9 L353.4,161.9 L354.6,160.7 L359.0,160.7 L363.3,165.6 L368.3,165.6 L374.5,161.3 L391.8,161.3 L404.2,167.5 L409.8,177.5 L409.8,235.9 L412.3,240.2 L419.7,240.9 L421.6,242.7 L421.6,255.2 L422.8,259.5 L420.9,263.2 L389.3,263.2 L383.1,261.4 L381.9,258.9 L381.9,194.2 L380.7,190.5 L374.5,186.8 L365.2,188.0 L362.1,190.5 L360.8,193.6 L360.2,262.6 L358.4,263.9 L334.8,263.9 L332.9,262.6 L332.9,192.4 L330.5,186.8 L321.8,186.8 L319.9,184.9 L319.3,164.4 L321.8,161.3 Z';

// Away's sleeve set: thin, thick, thin. Measured on the away figure (jersey top y=645, sleeve hem
// y=711, figure center x=109.5, so scaleY = 191/66 and scaleX = 264/84.5) — reference y675-678,
// y679-690 and y691-694, all spanning x27-43. Extended outward to x=30 for a flush clip.
export const GIANTS_AWAY_STRIPE_BANDS: [number, number][] = [
  [470, 479],
  [481, 513],
  [516, 525],
];
export const GIANTS_AWAY_SLEEVE_X_LEFT = [30, 86];
export const GIANTS_AWAY_SLEEVE_X_RIGHT = [502, 558];

// The throwback's set sits lower and wider, at the cuff rather than up the sleeve: reference
// y188-191 red, y192-194 white, y196-198 red, spanning x438-458 on a figure whose jersey top is
// y135 and whose center is x519.5.
export const GIANTS_THROWBACK_STRIPE_BANDS: [number, number][] = [
  [536, 548],
  [548, 557],
  [557, 568],
];
export const GIANTS_THROWBACK_SLEEVE_X_LEFT = [30, 102];
export const GIANTS_THROWBACK_SLEEVE_X_RIGHT = [486, 558];

// Only the throwback carries collar trim: a red band with a white core, about 5 reference px
// across, which is roughly 16 mannequin units.
const COLLAR_PATH = 'M206,388 L294,455 L386,388';
export const GIANTS_COLLAR_OUTER_WIDTH = 18;
export const GIANTS_COLLAR_CORE_WIDTH = 7;

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

// Two kits, two different band sets — so the factory takes the bands rather than assuming them.
function sleeveStripes(
  bands: [number, number][],
  xLeft: number[],
  xRight: number[],
  fills: ColorRef[]
): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', xLeft],
    ['sleeve-right', xRight],
  ];

  bands.forEach(([top, bottom], i) => {
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `giants-sleeve-stripe-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: fills[i],
      });
    }
  });

  return out;
}

function monogram(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'giants-decal-monogram',
      surface: 'helmet',
      d: GIANTS_DECAL_MONOGRAM_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ];
}

export const GIANTS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'giants',
  // Every kit wears white pants and strips the generic model; nothing else is shared.
  defaults: {
    pantsColor: GIANTS_WHITE,
    removeLayerIds: GENERIC_STRIPPED,
  },
  kits: {
    // Royal body under a bare blue shell carrying only the monogram. No sleeve stripes and no
    // collar trim — the reference's sleeves are unbroken royal apart from the TV numerals.
    home: {
      layers: monogram(GIANTS_WHITE),
      number: { fill: GIANTS_WHITE, outline: GIANTS_WHITE, outlineWidth: 10 },
    },
    // White body, same blue shell, red numerals — and the thin/thick/thin red sleeve set the home
    // kit does not have.
    away: {
      helmetColor: 'secondary',
      layers: [
        ...monogram(GIANTS_WHITE),
        ...sleeveStripes(
          GIANTS_AWAY_STRIPE_BANDS,
          GIANTS_AWAY_SLEEVE_X_LEFT,
          GIANTS_AWAY_SLEEVE_X_RIGHT,
          ['accent', 'accent', 'accent']
        ),
      ],
      number: { fill: 'accent', outline: 'accent', outlineWidth: 10 },
    },
    // The 1980s kit: royal body, red/white/red at the cuff, a red-over-white collar, and white
    // numerals keylined red. Its shell stays bare — see the header note on the wordmark.
    '1980s-throwback': {
      layers: [
        ...sleeveStripes(
          GIANTS_THROWBACK_STRIPE_BANDS,
          GIANTS_THROWBACK_SLEEVE_X_LEFT,
          GIANTS_THROWBACK_SLEEVE_X_RIGHT,
          ['secondary', 'accent', 'secondary']
        ),
        {
          id: 'giants-collar-outer',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: 'secondary',
          strokeWidth: GIANTS_COLLAR_OUTER_WIDTH,
        },
        {
          id: 'giants-collar-core',
          surface: 'collar',
          d: COLLAR_PATH,
          clip: true,
          kind: 'stroke',
          stroke: 'accent',
          strokeWidth: GIANTS_COLLAR_CORE_WIDTH,
        },
      ],
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
