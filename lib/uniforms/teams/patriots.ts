import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// New England's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/patriots (home is that sheet's row-2 figure 3, away its row-1 figure 1, Pat
// Patriot its row-1 figure 7 — boxed "worn in same games"). Right paths mirror the left across the
// centerline x=294.
//
// One construction throughout: three parallel bands running diagonally down each shoulder cap,
// outer/inner/outer, and nothing else. No collar trim, no helmet stripe, no pant stripe.
//
// The band COLORS are measured on three of the four kits and they are not a simple token swap:
// navy body wears red/white/red, white body wears red/navy/red, red body wears white/navy/white.
// So both the outer and inner colors are parameters — assuming either one is fixed renders one of
// the kits wrong, the same trap Denver's shoulder wedge sets.
//
// THE RIVALRIES KIT IS INFERRED — no figure of its own on the sheet. It takes the home pattern
// against its own palette.
//
// Out of scope on every kit: the chest wordmark, the league shield, the "WE ARE ALL PATRIOTS"
// collar tab, the Super Bowl and USA-250 patches, the logo on each sleeve, and shoulder numerals.

// White is a literal on the home kit only. Its palette is navy over red with silver in accent, so
// nothing resolves to the middle band or the numeral face. The away carries white in `primary`, and
// Pat Patriot and Rivalries both carry it in `accent`.
export const PATRIOTS_WHITE = '#FFFFFF';

// The shoulder bands, measured on the home figure (jersey top y=901, sleeve hem y=967, figure center
// x=714.5, so scaleY = 191/66 and scaleX = 264/84.5). At reference y=913 the three run x650-656,
// x657-662 and x662-667; by y=937 each has shifted about 7px right, which is the slant. The set
// spans y908-938. Each band is ~19 units wide and leans ~22 units right over its 90-unit drop.
export const PATRIOTS_BANDS_LEFT = [
  'M92,404 L111,404 L133,493 L114,493 Z',
  'M111,404 L130,404 L152,493 L133,493 Z',
  'M130,404 L149,404 L171,493 L152,493 Z',
];
export const PATRIOTS_BANDS_RIGHT = [
  'M496,404 L477,404 L455,493 L474,493 Z',
  'M477,404 L458,404 L436,493 L455,493 Z',
  'M458,404 L439,404 L417,493 L436,493 Z',
];

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

function shoulderBands(outer: ColorRef, inner: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, string[]][] = [
    ['sleeve-left', PATRIOTS_BANDS_LEFT],
    ['sleeve-right', PATRIOTS_BANDS_RIGHT],
  ];

  for (const [surface, paths] of sides) {
    const side = surface === 'sleeve-left' ? 'left' : 'right';
    paths.forEach((d, i) => {
      out.push({
        id: `patriots-band-${i}-${side}`,
        surface,
        d,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? inner : outer,
      });
    });
  }

  return out;
}

export const PATRIOTS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'patriots',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Navy body and shell, banded red/white/red. Red is `secondary`; white has no token in this
    // palette, so the middle band and the numeral face both take the literal.
    home: {
      layers: shoulderBands('secondary', PATRIOTS_WHITE),
      number: { fill: PATRIOTS_WHITE, outline: 'secondary', outlineWidth: 14 },
    },
    // White body under a silver shell, banded red/navy/red — the inner band picks up the body's
    // contrast rather than staying white. The away palette moves white into primary, navy into
    // secondary and red into accent, so every color here resolves from a token.
    away: {
      helmetColor: '#B0B7BC',
      layers: shoulderBands('accent', 'secondary'),
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // Red body, banded white/navy/white against it. Navy is `secondary` and white `accent`, so the
    // pattern inverts from the home kit without either color needing a literal.
    'pat-patriot': {
      layers: shoulderBands('accent', 'secondary'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
    // INFERRED — no figure on the sheet. Takes the home pattern against its own palette, which
    // carries white in `accent` and so needs no literal.
    'rivalries-2025': {
      layers: shoulderBands('secondary', 'accent'),
      number: { fill: 'accent', outline: 'secondary', outlineWidth: 14 },
    },
  },
};
