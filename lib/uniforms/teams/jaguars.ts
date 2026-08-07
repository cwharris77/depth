import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Jacksonville's four archived kits, redrawn from the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/jaguars (home is that sheet's row-1 figure 1, teal throwback its row-1 figure 5,
// away its row-2 figure 1 — the other figures in each row are pant combinations, not separate
// kits). Sleeve paths use the outer 588-wide mannequin space; right paths mirror the left across
// the centerline x=294 (mirroredX = 588 - x).
//
// Every kit is a black shell over a body carrying a band at the sleeve hem and trim at the neck.
// What changes is how each is built: the current kits wear one solid band and a short arc down each
// side of the neck opening, while the throwback wears a two-color band and a full V that closes at
// the chest. No helmet stripe and no pant stripe on any kit.
//
// THE BLACK ALTERNATE IS INFERRED, NOT MEASURED. The 2025 composite contains no black jersey, so
// that kit reuses the measured home construction with its bands recolored onto the kit's own gold
// trim. Treat its colors as provisional until a reference sheet that includes it turns up; the
// geometry is as measured, only the color assignment is a judgement.
//
// ONE DATA CONFLICT, surfaced rather than papered over: the archive stores the throwback's trim as
// #D7A22A, but the 2025 reference renders that band as a flat pale gold (231,210,141) — a
// materially different color, sampled identically at three points, so it is a fill and not a ramp.
// The definition takes the token, because the palette is the data layer's call and a hand-picked
// hex here would be exactly the kind of local patch the archive's provenance rules forbid.
//
// Out of scope on every kit: the chest wordmark, the league shield, the leaping-jaguar patch the
// reference draws on the chest and sleeves, and the shoulder numerals GUD draws above the bands.

// Two literals. Only the throwback's palette carries black — the home and away palettes are
// teal/gold/gold and white/teal/gold respectively, so neither can resolve the shell, the sleeve
// bands or the collar. And no kit's palette carries white, which every current kit needs for its
// pants and the throwback needs for its numeral face. Both hexes are the values the archive already
// stores for this club's other kits (lib/uniforms/data.ts).
export const JAGUARS_BLACK = '#101820';
export const JAGUARS_WHITE = '#FFFFFF';

// The shell carries no mark on any kit. The club's jaguar head is a solid gold mass, which would
// trace, but it is read through a white jaw of sub-2px linework and freckled with black spots that
// are the shell color — and tracing those spots as holes is the antialiasing trap that rendered the
// 49ers "F" solid black. Tracing the gold alone loses the jaw and returns a blob. An illegible
// trace is worse than none, so the shell is left bare until there is original stylized geometry.

// The sleeve bands, measured on the home figure (jersey top y=129, sleeve hem y=195, figure center
// x=103.5, so scaleY = 191/66 and scaleX = 264/84.5). The reference draws two stacked runs of black
// — y179-184 with an angled inner edge (x21-29 at its top, widening to x21-51 by y184 as it crosses
// the sleeve seam) and a plain x21-51 rectangle from y187 to the hem — but the 6-unit gap between
// them is the mannequin's own hem outline, not body color. Authored as ONE band, because the
// mannequin does not draw that outline: split into two, the gap fills with the jersey color and the
// sleeve reads as two thin stripes instead of the solid block the reference shows. This is the same
// hairline-outline call the Chiefs bands make. Extended outward to x=30 and past the hem to y=576
// so the jersey clip trims it flush.
export const JAGUARS_BAND_LEFT = 'M30,525 L61,525 L130,542 L130,576 L30,576 Z';
export const JAGUARS_BAND_RIGHT = 'M558,525 L527,525 L458,542 L458,576 L558,576 Z';

// The throwback's two bands ARE different colors, so both are authored — but contiguous, for the
// same reason. Measured on row-1 figure 5 (figure center x=924.5, same anchors): the gold band runs
// reference x842-860 at y182-187, and the black band beneath it runs the full x842-872 from y190 to
// the hem. Note the two are not the same width; the black one reaches further inboard.
export const JAGUARS_TB_BAND_UPPER_LEFT = 'M30,536 H93 V555 H30 Z';
export const JAGUARS_TB_BAND_UPPER_RIGHT = 'M558,536 H495 V555 H558 Z';
export const JAGUARS_TB_BAND_LOWER_LEFT = 'M30,555 H130 V576 H30 Z';
export const JAGUARS_TB_BAND_LOWER_RIGHT = 'M558,555 H458 V576 H558 Z';

// The current kits' collar is two short arcs, not a chevron: measured at reference x71-73 and
// x135-137 from y132, drifting only to x79/x131 by y153 and stopping there — so the arms never
// meet, and a stroke along the generic chevron would wrongly close them at the chest. The
// throwback's collar is the closing V, measured from (888,141) to a point at (924,161).
const JAGUARS_COLLAR_ARC_LEFT = 'M197,391 L196,420 L218,456';
const JAGUARS_COLLAR_ARC_RIGHT = 'M391,391 L392,420 L370,456';
const JAGUARS_COLLAR_ARC_WIDTH = 12;
const JAGUARS_TB_COLLAR_PATH = 'M180,418 L292,476 L408,418';
const JAGUARS_TB_COLLAR_WIDTH = 26;

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

function bandLayers(
  shapes: [string, 'sleeve-left' | 'sleeve-right', string, ColorRef][]
): UniformLayer[] {
  return shapes.map(([id, surface, d, fill]) => ({
    id,
    surface,
    d,
    clip: true,
    kind: 'fill',
    fill,
  }));
}

function sleeveBand(fill: ColorRef): UniformLayer[] {
  return bandLayers([
    ['jaguars-band-left', 'sleeve-left', JAGUARS_BAND_LEFT, fill],
    ['jaguars-band-right', 'sleeve-right', JAGUARS_BAND_RIGHT, fill],
  ]);
}

function throwbackBands(upper: ColorRef, lower: ColorRef): UniformLayer[] {
  return bandLayers([
    ['jaguars-band-upper-left', 'sleeve-left', JAGUARS_TB_BAND_UPPER_LEFT, upper],
    ['jaguars-band-upper-right', 'sleeve-right', JAGUARS_TB_BAND_UPPER_RIGHT, upper],
    ['jaguars-band-lower-left', 'sleeve-left', JAGUARS_TB_BAND_LOWER_LEFT, lower],
    ['jaguars-band-lower-right', 'sleeve-right', JAGUARS_TB_BAND_LOWER_RIGHT, lower],
  ]);
}

function collarArcs(stroke: ColorRef): UniformLayer[] {
  return [
    ['jaguars-collar-left', JAGUARS_COLLAR_ARC_LEFT],
    ['jaguars-collar-right', JAGUARS_COLLAR_ARC_RIGHT],
  ].map(([id, d]) => ({
    id,
    surface: 'collar',
    d,
    clip: true,
    kind: 'stroke',
    stroke,
    strokeWidth: JAGUARS_COLLAR_ARC_WIDTH,
  }));
}

function throwbackCollar(stroke: ColorRef): UniformLayer[] {
  return [
    {
      id: 'jaguars-collar-v',
      surface: 'collar',
      d: JAGUARS_TB_COLLAR_PATH,
      clip: true,
      kind: 'stroke',
      stroke,
      strokeWidth: JAGUARS_TB_COLLAR_WIDTH,
    },
  ];
}

export const JAGUARS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'jaguars',
  // Every kit strips the same generic model; what differs is only which token carries each color.
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Teal body over white pants. This palette has accent === secondary (ESPN supplies only two
    // colors), so gold is the only trim token it can offer — and the reference's shell, bands and
    // collar are all black. Every one of them takes the literal, and so do the pants. The numerals
    // are unoutlined white, so the keyline is set to the face color rather than left to inherit.
    home: {
      helmetColor: JAGUARS_BLACK,
      pantsColor: JAGUARS_WHITE,
      layers: [...sleeveBand(JAGUARS_BLACK), ...collarArcs(JAGUARS_BLACK)],
      number: { fill: JAGUARS_WHITE, outline: JAGUARS_WHITE, outlineWidth: 10 },
    },
    // White body and pants under the same black shell. The away palette moves white into primary,
    // so the pants need no override, but black is still tokenless here — shell, bands, collar and
    // the unoutlined numeral face all take the literal.
    away: {
      helmetColor: JAGUARS_BLACK,
      layers: [...sleeveBand(JAGUARS_BLACK), ...collarArcs(JAGUARS_BLACK)],
      number: { fill: JAGUARS_BLACK, outline: JAGUARS_BLACK, outlineWidth: 10 },
    },
    // Teal body over white pants, and the only kit whose palette carries black — as `accent` — so
    // the shell, the lower band and the closing collar V all resolve from a token. Gold moves the
    // upper band and the numeral keyline onto `secondary`. See the color conflict noted above.
    'teal-throwback': {
      helmetColor: 'accent',
      pantsColor: JAGUARS_WHITE,
      layers: [...throwbackBands('secondary', 'accent'), ...throwbackCollar('accent')],
      number: { fill: JAGUARS_WHITE, outline: 'secondary', outlineWidth: 16 },
    },
    // INFERRED — no black jersey appears in the 2025 reference. Black is this kit's primary, so the
    // shell and pants need no override; the bands and numeral keyline are recolored onto the kit's
    // own gold `secondary`, which is the assignment the club's other black-based kits use.
    'black-alt': {
      layers: [...sleeveBand('secondary'), ...collarArcs('secondary')],
      number: { fill: JAGUARS_WHITE, outline: 'secondary', outlineWidth: 16 },
    },
  },
};
