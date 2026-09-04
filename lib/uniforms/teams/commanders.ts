import type { ColorRef, TeamUniformDefinition, UniformLayer, UniformSurface } from './types';

// Washington's three archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/commanders (home is that sheet's row-1 figure 7; the white figures in row 1 and
// row 2 carry the away construction — row-1 figures 1-2 are boxed "worn in preseason only" and were
// not used). Right paths mirror the left across the centerline x=294.
//
// One construction: a broad band at the sleeve cap split by a thinner line through its middle. No
// collar trim, no helmet stripe, no pant stripe.
//
// `home` AND `70s-burgundy` RENDER IDENTICALLY, and as with Los Angeles' two powder-blue rows that
// is correct rather than a bug. Both store burgundy over gold and differ only in `accent` (gold on
// home, white on the throwback), and the reference draws one burgundy sleeve treatment. The
// construction is shared; the difference is only that `home` reaches white through a literal where
// the throwback reaches it through `accent`. If they should ever be two distinct looks, the sheet
// carries a black alternate (row-3 figures 3-4) with no row of its own — a data decision.
//
// APPROXIMATE, and flagged: the away kit's two band colors are read from the composite rather than
// sampled. Its geometry is the measured one.
//
// Out of scope on every kit: the chest wordmark, the league shield, the starred collar tab, the
// Christmas patch, and the shoulder numerals — including the gold Nike mark just above the band,
// which a sleeve column crosses first and which is not part of the striping.

// White is a literal on the home kit only. Its palette is burgundy over gold with accent ===
// secondary (ESPN supplies only two colors), so nothing resolves to the line through the band or to
// the numeral keyline.
export const COMMANDERS_WHITE = '#FFFFFF';

// The "W", traced from the home figure's shell (bbox x1268-1382, y299-409 in the reference) mapped
// onto the raw helmet space at ~6.25x. One layer and four subpaths: the mark is four flat gold
// strokes separated by shell-colored gaps, with no keyline and no interior detail, so it needs
// neither a second color nor a grown outline — the simplest decal of the 32.
export const COMMANDERS_DECAL_PATH =
  'M531.6,143.2 L589.7,143.2 L591.2,148.7 L586.1,157.0 L549.0,271.2 L544.7,274.0 L500.3,274.0 L498.1,269.8 L501.0,260.8 L535.2,166.0 L535.2,152.2 L530.8,143.9 Z M336.7,143.2 L393.4,144.6 L405.1,178.5 L405.8,192.3 L382.5,256.0 L378.9,254.6 L378.2,244.9 L353.5,173.0 L336.0,143.9 Z M443.6,143.2 L490.9,143.2 L509.8,192.3 L509.8,199.9 L485.0,268.5 L446.5,152.9 L442.1,148.0 L442.9,143.9 Z M431.2,155.0 L434.9,157.7 L457.4,229.0 L440.0,273.3 L392.0,274.0 L390.5,270.5 L394.9,266.4 L430.5,155.7 Z';

// The sleeve band, measured on the home figure (jersey top y=403, sleeve hem y=469, figure center
// x=1320.5, so scaleY = 191/66 and scaleX = 264/84.5). A column at reference x=1250 crosses gold
// y432-441, white y442-446 and gold y447-456, with body color above and below. The set spans
// reference x1240-1254; extended outward to x=30 for a flush clip.
export const COMMANDERS_BOUNDS = [467, 496, 510, 539];
export const COMMANDERS_SLEEVE_X_LEFT = [30, 89];
export const COMMANDERS_SLEEVE_X_RIGHT = [499, 558];

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

function sleeveBand(band: ColorRef, line: ColorRef): UniformLayer[] {
  const out: UniformLayer[] = [];
  const sides: [UniformSurface, number[]][] = [
    ['sleeve-left', COMMANDERS_SLEEVE_X_LEFT],
    ['sleeve-right', COMMANDERS_SLEEVE_X_RIGHT],
  ];

  for (let i = 0; i < COMMANDERS_BOUNDS.length - 1; i += 1) {
    const top = COMMANDERS_BOUNDS[i];
    const bottom = COMMANDERS_BOUNDS[i + 1];
    for (const [surface, [x0, x1]] of sides) {
      const side = surface === 'sleeve-left' ? 'left' : 'right';
      out.push({
        id: `commanders-band-${i}-${side}`,
        surface,
        d: `M${x0},${top} H${x1} V${bottom} H${x0} Z`,
        clip: true,
        kind: 'fill',
        fill: i === 1 ? line : band,
      });
    }
  }

  return out;
}

// The mark is gold on every kit; only which token carries the gold moves with the palette.
function decal(fill: ColorRef): UniformLayer[] {
  return [
    {
      id: 'commanders-decal',
      surface: 'helmet',
      d: COMMANDERS_DECAL_PATH,
      clip: true,
      kind: 'fill',
      fill,
    },
  ];
}

export const COMMANDERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'commanders',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Burgundy body and shell. Gold is both secondary and accent here, so it carries the band and
    // the numeral face; the line through the band and the numeral keyline are white, which this
    // palette cannot supply, so both take the literal.
    home: {
      layers: [...sleeveBand('secondary', COMMANDERS_WHITE), ...decal('secondary')],
      number: { fill: 'secondary', outline: COMMANDERS_WHITE, outlineWidth: 14 },
    },
    // White body under the burgundy shell. The away palette moves white into primary, burgundy into
    // secondary and gold into accent, so the band inverts to burgundy around a gold line. See the
    // approximation noted above.
    away: {
      helmetColor: 'secondary',
      layers: [...sleeveBand('secondary', 'accent'), ...decal('accent')],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
    // The same uniform as home, authored against a palette that carries white in `accent` — so
    // nothing here is a literal. See the note above on why these two kits render the same.
    '70s-burgundy': {
      layers: [...sleeveBand('secondary', 'accent'), ...decal('secondary')],
      number: { fill: 'secondary', outline: 'accent', outlineWidth: 14 },
    },
  },
};
